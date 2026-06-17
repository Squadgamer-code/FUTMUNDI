import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import { Address, beginCell, toNano, internal, SendMode } from '@ton/core';
import { TonClient, WalletContractV3R2, WalletContractV4, WalletContractV5R1 } from '@ton/ton';
import { sha256, mnemonicToPrivateKey } from '@ton/crypto';
import { createClient } from '@supabase/supabase-js';

const PORT = Number(process.env.PORT || 8787);
const PROOF_TTL_SECONDS = Number(process.env.TON_PROOF_TTL_SECONDS || 300);
const SESSION_TTL_SECONDS = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 86400);
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const USDT_MASTER_ADDRESS = process.env.USDT_MASTER_ADDRESS || 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const INVOICE_WALLET_ADDRESS = process.env.INVOICE_WALLET_ADDRESS || 'EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs';
const TONCENTER_ENDPOINT = process.env.TONCENTER_ENDPOINT || 'https://toncenter.com/api/v2/jsonRPC';
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || '';
const USDT_DECIMALS = 6;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PAYOUT_WALLET_MNEMONIC = process.env.PAYOUT_WALLET_MNEMONIC || process.env.HOT_WALLET_MNEMONIC || process.env.INVOICE_WALLET_MNEMONIC || '';
const PAYOUT_WALLET_VERSION = String(process.env.PAYOUT_WALLET_VERSION || 'v4r2').toLowerCase();
const TREASURY_CONTRACT_ADDRESS = process.env.TREASURY_CONTRACT_ADDRESS || process.env.TON_TREASURY_CONTRACT_ADDRESS || 'EQDfw35pL2OJ48GTKjPH1W3Y7Pi3rxcHN36qyPGdymzqm91s';
const TREASURY_OWNER_ADDRESS = process.env.TREASURY_OWNER_ADDRESS || 'EQBoGfQlVqaQPJRqlIPyGkpHlDZsb6zqsgABVNNDtdbbhieR';
const WITHDRAW_REQUEST_OPCODE = 0x46544d01; // Tact ABI: WithdrawTON

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

const allowedProofDomains = (process.env.TON_PROOF_ALLOWED_DOMAINS || '')
  .split(',')
  .map(v => v.trim().toLowerCase())
  .filter(Boolean);

function normalizeTonAddress(value){
  const address = Address.parse(value);
  return `${address.workChain}:${address.hash.toString('hex')}`;
}

const adminWallets = new Set(
  (process.env.ADMIN_WALLETS || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .map(normalizeTonAddress)
);

if(adminWallets.size === 0){
  console.warn('ADVERTENCIA: ADMIN_WALLETS está vacío. Nadie podrá entrar como admin.');
}
if(!process.env.ADMIN_TOKEN_SECRET){
  console.warn('ADVERTENCIA: ADMIN_TOKEN_SECRET no está definido. Se usará uno temporal y las sesiones se invalidarán al reiniciar.');
}
if(allowedProofDomains.length === 0){
  console.warn('ADVERTENCIA: TON_PROOF_ALLOWED_DOMAINS está vacío. Configúralo en producción.');
}

const tonClient = new TonClient({
  endpoint: TONCENTER_ENDPOINT,
  apiKey: TONCENTER_API_KEY || undefined
});

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
if(!supabase){ console.warn('ADVERTENCIA: Supabase no configurado. Balance/retiros persistentes deshabilitados.'); }

const payloads = new Map();

function cleanupPayloads(){
  const now = Date.now();
  for(const [payload, exp] of payloads.entries()){
    if(exp <= now) payloads.delete(payload);
  }
}
setInterval(cleanupPayloads, 60_000).unref();

function base64url(input){
  return Buffer.from(input).toString('base64url');
}

function hmac(data){
  return crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
}

function signToken(payload){
  const body = Object.assign({}, payload, {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  });
  const encoded = base64url(JSON.stringify(body));
  const signature = hmac(encoded);
  return `${encoded}.${signature}`;
}

function verifyToken(token){
  if(!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  const expected = hmac(encoded);
  const sigBuf = Buffer.from(signature || '');
  const expBuf = Buffer.from(expected);
  if(sigBuf.length !== expBuf.length) return null;
  if(!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const body = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if(!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

function getBearer(req){
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : '';
}

async function verifyTonProof({ address, publicKey, proof }){
  if(!address || !publicKey || !proof){
    throw new Error('Faltan datos de wallet/proof');
  }
  if(!proof.payload || !proof.signature || !proof.domain || !proof.timestamp){
    throw new Error('TON proof incompleto');
  }

  const payloadExp = payloads.get(proof.payload);
  if(!payloadExp || payloadExp <= Date.now()){
    throw new Error('Payload vencido o desconocido');
  }
  payloads.delete(proof.payload); // uso único

  const nowSec = Math.floor(Date.now() / 1000);
  if(Math.abs(nowSec - Number(proof.timestamp)) > PROOF_TTL_SECONDS){
    throw new Error('Timestamp de TON proof vencido');
  }

  const domainValue = String(proof.domain.value || '').toLowerCase();
  if(allowedProofDomains.length && !allowedProofDomains.includes(domainValue)){
    throw new Error(`Dominio TON proof no permitido: ${domainValue}`);
  }

  const parsedAddress = Address.parse(address);
  const wc = Buffer.alloc(4);
  wc.writeInt32BE(parsedAddress.workChain);

  const domain = Buffer.from(String(proof.domain.value || ''), 'utf8');
  const domainLen = Buffer.alloc(4);
  domainLen.writeUInt32LE(domain.length);

  const ts = Buffer.alloc(8);
  ts.writeBigUInt64LE(BigInt(proof.timestamp));

  const message = Buffer.concat([
    Buffer.from('ton-proof-item-v2/'),
    wc,
    parsedAddress.hash,
    domainLen,
    domain,
    ts,
    Buffer.from(proof.payload, 'utf8')
  ]);

  const messageHash = Buffer.from(await sha256(message));
  const fullMessage = Buffer.concat([
    Buffer.from([0xff, 0xff]),
    Buffer.from('ton-connect'),
    messageHash
  ]);
  const fullHash = Buffer.from(await sha256(fullMessage));

  const signature = Buffer.from(proof.signature, 'base64');
  const pubKey = Buffer.from(publicKey, 'hex');
  if(pubKey.length !== 32){
    throw new Error('Public key inválida');
  }

  const ok = nacl.sign.detached.verify(fullHash, signature, pubKey);
  if(!ok) throw new Error('Firma TON proof inválida');

  return normalizeTonAddress(address);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(cors({
  origin(origin, cb){
    if(!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origen CORS no permitido'));
  },
  credentials: false
}));


function toUsdtUnits(amountUsdt){
  const n = Number(amountUsdt);
  if(!Number.isFinite(n) || n <= 0) throw new Error('Monto USDT inválido');
  return BigInt(Math.round(n * 10 ** USDT_DECIMALS));
}

function validatePaymentAmount(kind, amountTon, gems){
  const ton = Number(amountTon);
  const g = Number(gems || 0);
  if(kind === 'deposit'){
    const allowed = new Map([[8,320],[40,1600],[80,3200],[160,6400],[400,16000]]);
    if(!allowed.has(ton) || allowed.get(ton) !== g) throw new Error('Paquete de depósito TON inválido');
  } else if(kind === 'tournament'){
    if(ton !== 8) throw new Error('El torneo requiere 8 TON');
  } else if(kind === 'training'){
    if(ton <= 0 || ton > 400) throw new Error('Monto de entrenamiento TON inválido');
  } else if(kind === 'bet'){
    if(ton < 8 || ton > 400) throw new Error('Monto de apuesta TON inválido');
  } else {
    throw new Error('Tipo de pago inválido');
  }
  return { ton, gems:g };
}

async function getJettonWalletAddress(ownerAddress){
  const owner = Address.parse(ownerAddress);
  const master = Address.parse(USDT_MASTER_ADDRESS);
  const stack = await tonClient.runMethod(master, 'get_wallet_address', [
    { type: 'slice', cell: beginCell().storeAddress(owner).endCell() }
  ]);
  return stack.stack.readAddress();
}

async function getJettonWalletData(jettonWalletAddress){
  const stack = await tonClient.runMethod(jettonWalletAddress, 'get_wallet_data');
  const balance = stack.stack.readBigNumber();
  const owner = stack.stack.readAddress();
  const master = stack.stack.readAddress();
  return { balance, owner, master };
}

function sameAddress(a, b){
  const aa = Address.parse(a.toString()).toRawString();
  const bb = Address.parse(b.toString()).toRawString();
  return aa === bb;
}

async function assertUsdtWalletReady(ownerAddress, senderJettonWallet, amountUsdt){
  const required = toUsdtUnits(amountUsdt);
  let data;
  try{
    data = await getJettonWalletData(senderJettonWallet);
  }catch(e){
    throw new Error('Tu wallet no tiene USDT Jetton activo en TON. Recibe/carga USDT en TON antes de pagar.');
  }
  const owner = Address.parse(ownerAddress);
  const master = Address.parse(USDT_MASTER_ADDRESS);
  if(!sameAddress(data.owner, owner)) throw new Error('La wallet USDT no pertenece al usuario conectado');
  if(!sameAddress(data.master, master)) throw new Error('El Jetton detectado no corresponde al USDT oficial de TON');
  if(data.balance < required){
    const bal = Number(data.balance) / 10 ** USDT_DECIMALS;
    throw new Error(`Saldo USDT insuficiente. Tienes ${bal.toFixed(2)} USDT en TON.`);
  }
  return data;
}

async function buildUsdtTransaction({ ownerAddress, amountUsdt, kind, gems }){
  const owner = Address.parse(ownerAddress);
  const destination = Address.parse(INVOICE_WALLET_ADDRESS);
  const senderJettonWallet = await getJettonWalletAddress(ownerAddress);
  await assertUsdtWalletReady(ownerAddress, senderJettonWallet, amountUsdt);
  const queryId = BigInt(Date.now());
  const comment = `FUTMUNDI:${kind}:${amountUsdt}:${gems || 0}:${queryId}`;
  const forwardPayload = beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)        // jetton transfer op
    .storeUint(queryId, 64)
    .storeCoins(toUsdtUnits(amountUsdt)) // USDT has 6 decimals
    .storeAddress(destination)
    .storeAddress(owner)             // excess / response destination
    .storeUint(0, 1)                 // no custom payload
    .storeCoins(toNano('0.02'))      // forward TON for notification/comment
    .storeBit(1)                     // forward_payload as ref
    .storeRef(forwardPayload)
    .endCell();
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [{
      address: senderJettonWallet.toString({ bounceable: true, urlSafe: true }),
      amount: toNano('0.08').toString(),
      payload: body.toBoc().toString('base64')
    }],
    meta: {
      kind,
      amountUsdt,
      gems,
      invoiceWallet: destination.toString({ bounceable: true, urlSafe: true }),
      senderJettonWallet: senderJettonWallet.toString({ bounceable: true, urlSafe: true }),
      usdtMaster: Address.parse(USDT_MASTER_ADDRESS).toString({ bounceable: true, urlSafe: true }),
      comment
    }
  };
}


async function buildUsdtDirectTransferTransaction({ ownerAddress, destinationAddress, amountUsdt, comment }){
  const owner = Address.parse(ownerAddress);
  const destination = Address.parse(destinationAddress);
  const senderJettonWallet = await getJettonWalletAddress(ownerAddress);
  await assertUsdtWalletReady(ownerAddress, senderJettonWallet, amountUsdt);
  const queryId = BigInt(Date.now());
  const finalComment = comment || `FUTMUNDI:MANUAL_WITHDRAW:${amountUsdt}:${queryId}`;
  const forwardPayload = beginCell().storeUint(0, 32).storeStringTail(finalComment).endCell();
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(queryId, 64)
    .storeCoins(toUsdtUnits(amountUsdt))
    .storeAddress(destination)
    .storeAddress(owner)
    .storeUint(0, 1)
    .storeCoins(toNano('0.02'))
    .storeBit(1)
    .storeRef(forwardPayload)
    .endCell();
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [{
      address: senderJettonWallet.toString({ bounceable: true, urlSafe: true }),
      amount: toNano('0.08').toString(),
      payload: body.toBoc().toString('base64')
    }],
    meta: {
      amountUsdt,
      destination: destination.toString({ bounceable:false, urlSafe:true }),
      sender: owner.toString({ bounceable:false, urlSafe:true }),
      senderJettonWallet: senderJettonWallet.toString({ bounceable:true, urlSafe:true }),
      usdtMaster: Address.parse(USDT_MASTER_ADDRESS).toString({ bounceable:true, urlSafe:true }),
      comment: finalComment,
      queryId: queryId.toString()
    }
  };
}


function buildTonNativeTransaction({ amountTon, kind, gems, commentSuffix='' }){
  const ton = Number(amountTon);
  if(!Number.isFinite(ton) || ton <= 0) throw new Error('Monto TON inválido');
  const queryId = Date.now();
  const comment = `FUTMUNDI:${kind}:${ton}:${gems || 0}:${queryId}${commentSuffix}`;
  const body = beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [{
      address: Address.parse(TREASURY_CONTRACT_ADDRESS).toString({ bounceable:true, urlSafe:true }),
      amount: toNano(String(ton)).toString(),
      payload: body.toBoc().toString('base64')
    }],
    meta: { kind, amountTon:ton, gems, treasury:TREASURY_CONTRACT_ADDRESS, comment, queryId }
  };
}


function requirePayoutWallet(){
  if(!PAYOUT_WALLET_MNEMONIC){
    throw new Error('PAYOUT_WALLET_MNEMONIC no está configurado en Render. Aprobar no puede pagar USDT sin la seed de la wallet pagadora.');
  }
}
function getPayoutMnemonicWords(){
  return PAYOUT_WALLET_MNEMONIC
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}
async function openPayoutWallet(){
  requirePayoutWallet();
  const words = getPayoutMnemonicWords();
  if(words.length !== 24) throw new Error('PAYOUT_WALLET_MNEMONIC debe contener 24 palabras');
  const keyPair = await mnemonicToPrivateKey(words);
  const candidates = [
    { version:'v4r2', wallet: WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }) },
    { version:'v5r1', wallet: WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey }) },
    { version:'v3r2', wallet: WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey }) }
  ];
  const expectedOwner = Address.parse(TREASURY_OWNER_ADDRESS).toString({ bounceable:false, urlSafe:true });
  let selected = candidates.find(c => c.wallet.address.toString({ bounceable:false, urlSafe:true }) === expectedOwner);
  if(!selected){
    selected = candidates.find(c => c.version === PAYOUT_WALLET_VERSION) || candidates[0];
  }
  const contract = tonClient.open(selected.wallet);
  return {
    keyPair,
    wallet: selected.wallet,
    contract,
    address: selected.wallet.address,
    version: selected.version,
    candidates: candidates.map(c => ({
      version:c.version,
      address:c.wallet.address.toString({ bounceable:false, urlSafe:true }),
      matchesTreasuryOwner:c.wallet.address.toString({ bounceable:false, urlSafe:true }) === expectedOwner
    }))
  };
}
function buildJettonTransferBody({ amountUsdt, destinationAddress, responseAddress, comment }){
  const queryId = BigInt(Date.now());
  const forwardPayload = beginCell().storeUint(0, 32).storeStringTail(comment || `FUTMUNDI:${queryId}`).endCell();
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(queryId, 64)
    .storeCoins(toUsdtUnits(amountUsdt))
    .storeAddress(Address.parse(destinationAddress))
    .storeAddress(Address.parse(responseAddress))
    .storeUint(0, 1)
    .storeCoins(toNano('0.02'))
    .storeBit(1)
    .storeRef(forwardPayload)
    .endCell();
  return { body, queryId };
}
async function sendTreasuryWithdrawRequest({ toAddress, amountTonGross, withdrawalId }){
  const payout = await openPayoutWallet();
  const ownerFriendly = payout.address.toString({ bounceable:false, urlSafe:true });
  const ownerVersion = payout.version;
  const expectedOwner = Address.parse(TREASURY_OWNER_ADDRESS).toString({ bounceable:false, urlSafe:true });
  if(ownerFriendly !== expectedOwner){
    throw new Error(`La seed PAYOUT_WALLET_MNEMONIC firma ${ownerFriendly} (${ownerVersion}), pero el owner del contrato Treasury es ${expectedOwner}.`);
  }
  const destination = Address.parse(toAddress);
  const grossNano = toNano(String(amountTonGross));
  const queryId = BigInt(Date.now());
  const body = beginCell()
    .storeUint(WITHDRAW_REQUEST_OPCODE, 32)
    .storeUint(queryId, 64)
    .storeCoins(grossNano)
    .storeAddress(destination)
    .endCell();
  const seqno = await payout.contract.getSeqno();
  await payout.contract.sendTransfer({
    secretKey: payout.keyPair.secretKey,
    seqno,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: Address.parse(TREASURY_CONTRACT_ADDRESS),
      value: toNano('0.12'),
      body
    })]
  });
  return {
    ok:true,
    mode:'ton-treasury-withdraw',
    opcode:'0x46544d01',
    seqno,
    queryId: queryId.toString(),
    txHash:`ton-withdraw-${withdrawalId || queryId.toString()}`,
    ownerWallet: ownerFriendly,
    treasuryContract: Address.parse(TREASURY_CONTRACT_ADDRESS).toString({ bounceable:true, urlSafe:true }),
    toAddress: destination.toString({ bounceable:false, urlSafe:true }),
    amountTonGross:Number(amountTonGross),
    expectedTonNet:+(Number(amountTonGross) * 0.94 - 1).toFixed(6)
  };
}

async function sendUsdtFromPayoutWallet({ toAddress, amountUsdt, comment }){
  const payout = await openPayoutWallet();
  const payoutFriendly = payout.address.toString({ bounceable:false, urlSafe:true });
  const configuredInvoice = Address.parse(INVOICE_WALLET_ADDRESS).toString({ bounceable:false, urlSafe:true });
  if(payoutFriendly !== configuredInvoice){
    throw new Error(`La seed PAYOUT_WALLET_MNEMONIC firma la wallet ${payoutFriendly}, pero el contrato/fondo configurado es ${configuredInvoice}. Esa wallet de la seed no es la que tiene los USDT. Usa la seed correcta o transfiere USDT+TON a ${payoutFriendly}.`);
  }

  const payoutJettonWallet = await getJettonWalletAddress(payout.address.toString({ bounceable:true, urlSafe:true }));
  await assertUsdtWalletReady(payout.address.toString({ bounceable:true, urlSafe:true }), payoutJettonWallet, amountUsdt);
  const { body, queryId } = buildJettonTransferBody({
    amountUsdt,
    destinationAddress: toAddress,
    responseAddress: payout.address.toString({ bounceable:true, urlSafe:true }),
    comment
  });
  const seqno = await payout.contract.getSeqno();
  await payout.contract.sendTransfer({
    secretKey: payout.keyPair.secretKey,
    seqno,
    sendMode: SendMode.PAY_GAS_SEPARATELY,
    messages: [internal({
      to: payoutJettonWallet,
      value: toNano('0.08'),
      body
    })]
  });
  return {
    ok:true,
    queryId: queryId.toString(),
    seqno,
    payerWallet: payout.address.toString({ bounceable:false, urlSafe:true }),
    payerJettonWallet: payoutJettonWallet.toString({ bounceable:true, urlSafe:true }),
    toAddress: Address.parse(toAddress).toString({ bounceable:false, urlSafe:true }),
    amountUsdt:Number(amountUsdt),
    txHash:`pending-query-${queryId.toString()}`
  };
}
async function markWithdrawalPaid(w, txHash, note=null, paidUsdt=null){
  const { data:bal, error:balErr } = await supabase.from('balances').select('*').eq('user_id', w.user_id).single();
  if(balErr) throw new Error(balErr.message);
  const updBal = await supabase.from('balances').update({
    locked_gems: Math.max(0, Number(bal.locked_gems || 0) - Number(w.gems_requested || 0)),
    total_withdrawn_usdt: Number(bal.total_withdrawn_usdt || 0) + Number(paidUsdt ?? w.amount_usdt_net ?? 0)
  }).eq('user_id', w.user_id).select('*').single();
  if(updBal.error) throw new Error(updBal.error.message);
  const upd = await supabase.from('withdrawals').update({
    status:'paid',
    tx_hash:txHash || w.tx_hash,
    paid_at:new Date().toISOString(),
    admin_note:note || w.admin_note
  }).eq('id', w.id).select('*').single();
  if(upd.error) throw new Error(upd.error.message);
  return { withdrawal:upd.data, balance:updBal.data };
}


function requireSupabase(){
  if(!supabase) throw new Error('Supabase no está configurado en Render');
}
function friendlyTonAddress(value){
  return Address.parse(value).toString({ bounceable:false, urlSafe:true });
}
async function getReferrerByCode(refCode, walletRaw){
  if(!refCode) return null;
  const code = String(refCode).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
  if(!code) return null;
  const { data, error } = await supabase.from('app_users').select('*').eq('ref_code', code).maybeSingle();
  if(error) throw new Error(error.message);
  if(!data || data.wallet_raw === walletRaw) return null;
  return data;
}

async function getOrCreateUser(address, referredByCode=null){
  requireSupabase();
  const walletRaw = normalizeTonAddress(address);
  const walletAddress = friendlyTonAddress(address);
  const isAdmin = adminWallets.has(walletRaw);

  let { data:user, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('wallet_raw', walletRaw)
    .maybeSingle();
  if(error) throw new Error(error.message);

  let referrer = null;
  if(referredByCode) referrer = await getReferrerByCode(referredByCode, walletRaw);

  if(!user){
    const insertRow = { wallet_address: walletAddress, wallet_raw: walletRaw, is_admin: isAdmin, last_login_at: new Date().toISOString() };
    if(referrer) insertRow.referred_by = referrer.id;
    const inserted = await supabase
      .from('app_users')
      .insert(insertRow)
      .select('*')
      .single();
    if(inserted.error) throw new Error(inserted.error.message);
    user = inserted.data;
    if(referrer){
      await supabase.from('referrals').insert({ referrer_user_id: referrer.id, referred_user_id: user.id, commission_percent: 10 });
    }
  } else {
    const patch = { wallet_address: walletAddress, is_admin: isAdmin, last_login_at: new Date().toISOString() };
    if(!user.referred_by && referrer) patch.referred_by = referrer.id;
    const updated = await supabase
      .from('app_users')
      .update(patch)
      .eq('id', user.id)
      .select('*')
      .single();
    if(updated.error) throw new Error(updated.error.message);
    user = updated.data;
    if(referrer && user.referred_by === referrer.id){
      await supabase.from('referrals').upsert({ referrer_user_id: referrer.id, referred_user_id: user.id, commission_percent: 10 }, { onConflict:'referred_user_id', ignoreDuplicates:true });
    }
  }

  const bal = await supabase.from('balances').upsert({ user_id: user.id }, { onConflict:'user_id', ignoreDuplicates:false }).select('*').single();
  if(bal.error) throw new Error(bal.error.message);
  await supabase.from('ranking').upsert({ user_id: user.id, season:'S1' }, { onConflict:'user_id,season', ignoreDuplicates:true });
  return { user, balance: bal.data };
}
async function getUserState(userId){
  requireSupabase();
  const [{ data:balance, error:balanceError }, { data:nfts, error:nftsError }, { data:ranking, error:rankingError }] = await Promise.all([
    supabase.from('balances').select('*').eq('user_id', userId).single(),
    supabase.from('nfts').select('*').eq('user_id', userId).is('destroyed_at', null).order('created_at', { ascending:true }),
    supabase.from('ranking').select('*').eq('user_id', userId).eq('season','S1').maybeSingle()
  ]);
  if(balanceError) throw new Error(balanceError.message);
  if(nftsError) throw new Error(nftsError.message);
  if(rankingError) throw new Error(rankingError.message);
  return { balance, nfts: nfts || [], ranking: ranking || null };
}
function calcWithdrawal(gemsRequested){
  const gems = Number(gemsRequested);
  if(!Number.isInteger(gems)) throw new Error('Monto de gemas inválido');
  if(gems < 160 || gems > 3200) throw new Error('Monto fuera de rango (160–3200 gemas)');
  const amountTonGross = +(gems / 40).toFixed(6);
  const feePercentTon = +(amountTonGross * 0.06).toFixed(6);
  const feeFixedTon = 1;
  const amountTonNet = +(amountTonGross - feePercentTon - feeFixedTon).toFixed(6);
  const feePercentGems = Math.round(gems * 0.06);
  const feeFixedGems = 40;
  const gemsNet = Math.max(0, Math.floor(amountTonNet * 40));
  if(amountTonNet <= 0) throw new Error('Monto neto inválido después de comisiones');
  return { gemsRequested:gems, feePercentGems, feeFixedGems, gemsNet, amountUsdtNet:amountTonNet, amountUsdtGross:amountTonGross, amountTonNet, amountTonGross, feePercentTon, feeFixedTon };
}

function requireAdmin(req){
  const token = getBearer(req);
  const body = verifyToken(token);
  if(!body || body.role !== 'admin' || !adminWallets.has(body.address)){
    const err = new Error('Admin no autorizado');
    err.status = 401;
    throw err;
  }
  return body;
}

async function resolveUserTarget({ userId, wallet }){
  requireSupabase();
  if(userId){
    const { data, error } = await supabase.from('app_users').select('*').eq('id', userId).single();
    if(error) throw new Error(error.message);
    return data;
  }
  if(wallet){
    const { user } = await getOrCreateUser(wallet);
    return user;
  }
  throw new Error('Debes enviar wallet o userId');
}

async function addGemsToUser(userId, gems, field='gems'){
  const amount = Number(gems || 0);
  if(!Number.isInteger(amount) || amount <= 0) throw new Error('Cantidad de gemas inválida');
  const { data:balance, error } = await supabase.from('balances').select('*').eq('user_id', userId).single();
  if(error) throw new Error(error.message);
  const patch = {};
  patch[field] = Number(balance[field] || 0) + amount;
  const upd = await supabase.from('balances').update(patch).eq('user_id', userId).select('*').single();
  if(upd.error) throw new Error(upd.error.message);
  return upd.data;
}

async function creditDeposit(depositId, txHash=null){
  requireSupabase();
  const { data:deposit, error } = await supabase.from('deposits').select('*').eq('id', depositId).single();
  if(error) throw new Error(error.message);
  if(deposit.status === 'confirmed') return { deposit, alreadyConfirmed:true };
  if(deposit.status !== 'pending') throw new Error('Depósito no está pendiente');

  const { data:balance, error:balErr } = await supabase.from('balances').select('*').eq('user_id', deposit.user_id).single();
  if(balErr) throw new Error(balErr.message);
  const updBal = await supabase.from('balances').update({
    gems: Number(balance.gems || 0) + Number(deposit.gems || 0),
    total_deposited_usdt: Number(balance.total_deposited_usdt || 0) + Number(deposit.amount_usdt || 0)
  }).eq('user_id', deposit.user_id).select('*').single();
  if(updBal.error) throw new Error(updBal.error.message);

  const depUpd = await supabase.from('deposits').update({
    status:'confirmed',
    tx_hash: txHash || deposit.tx_hash,
    confirmed_at: new Date().toISOString()
  }).eq('id', deposit.id).select('*').single();
  if(depUpd.error) throw new Error(depUpd.error.message);

  if(deposit.payment_order_id){
    await supabase.from('payment_orders').update({
      status:'confirmed',
      tx_hash: txHash || deposit.tx_hash,
      paid_at: new Date().toISOString()
    }).eq('id', deposit.payment_order_id);
  }
  return { deposit: depUpd.data, balance: updBal.data, alreadyConfirmed:false };
}

async function createNftForUser(userId, catalogCode, source='admin_gift'){
  const { data:cat, error:catErr } = await supabase.from('nft_catalog').select('*').eq('code', catalogCode).single();
  if(catErr) throw new Error(catErr.message);
  const row = {
    user_id: userId,
    catalog_code: cat.code,
    item_type: cat.item_type,
    name: cat.display_name,
    source,
    durability: 100,
    stamina: cat.item_type === 'player' ? 4 : 0,
    max_stamina: cat.item_type === 'player' ? 4 : 0,
    level: 1,
    exp: 0,
    metadata: { image_path: cat.image_path, gifted: source === 'admin_gift' }
  };
  if(cat.is_free && cat.display_name === 'Neymar' && source === 'free'){
    row.earned_usd_cap = 5;
    row.expires_at = new Date(Date.now() + 15*24*60*60*1000).toISOString();
  }
  const ins = await supabase.from('nfts').insert(row).select('*').single();
  if(ins.error) throw new Error(ins.error.message);
  return ins.data;
}

app.get('/health', async (_req, res) => {
  let ownerWalletAddress = null;
  let ownerMatchesTreasury = null;
  let ownerWalletVersion = null;
  let walletCandidates = [];
  try{
    if(PAYOUT_WALLET_MNEMONIC){
      const payout = await openPayoutWallet();
      ownerWalletAddress = payout.address.toString({ bounceable:false, urlSafe:true });
      ownerWalletVersion = payout.version;
      walletCandidates = payout.candidates || [];
      ownerMatchesTreasury = ownerWalletAddress === Address.parse(TREASURY_OWNER_ADDRESS).toString({ bounceable:false, urlSafe:true });
    }
  }catch(e){ ownerWalletAddress = 'ERROR: ' + e.message; }
  res.json({ ok:true, service:'futmundi-admin-backend', version:'ton-only-v1', supabase:!!supabase, payoutWalletConfigured:!!PAYOUT_WALLET_MNEMONIC, ownerWalletAddress, ownerWalletVersion, walletCandidates, treasuryOwner:TREASURY_OWNER_ADDRESS, ownerMatchesTreasury, treasuryContract:TREASURY_CONTRACT_ADDRESS, withdrawPayAction:true });
});

app.get('/api/admin/payload', (_req, res) => {
  const payload = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + PROOF_TTL_SECONDS * 1000;
  payloads.set(payload, expiresAt);
  res.json({ ok: true, payload, expiresAt });
});

app.post('/api/admin/verify', async (req, res) => {
  try{
    const normalizedAddress = await verifyTonProof(req.body || {});
    const admin = adminWallets.has(normalizedAddress);
    if(!admin){
      return res.status(403).json({ ok: false, admin: false, error: 'Wallet no autorizada como admin' });
    }
    const token = signToken({ role: 'admin', address: normalizedAddress });
    return res.json({ ok: true, admin: true, token });
  }catch(e){
    return res.status(401).json({ ok: false, admin: false, error: e.message });
  }
});

app.get('/api/admin/status', (req, res) => {
  try{
    const token = getBearer(req);
    const body = verifyToken(token);
    if(!body || body.role !== 'admin' || !adminWallets.has(body.address)){
      return res.status(401).json({ ok: false, admin: false, error: 'Sesión admin inválida' });
    }
    return res.json({ ok: true, admin: true, address: body.address, exp: body.exp });
  }catch(e){
    return res.status(401).json({ ok: false, admin: false, error: 'Sesión admin inválida' });
  }
});


app.get('/api/payments/health', async (_req, res) => {
  let ownerWalletAddress = null;
  let ownerMatchesTreasury = null;
  let ownerWalletVersion = null;
  let walletCandidates = [];
  try{
    if(PAYOUT_WALLET_MNEMONIC){
      const payout = await openPayoutWallet();
      ownerWalletAddress = payout.address.toString({ bounceable:false, urlSafe:true });
      ownerWalletVersion = payout.version;
      walletCandidates = payout.candidates || [];
      ownerMatchesTreasury = ownerWalletAddress === Address.parse(TREASURY_OWNER_ADDRESS).toString({ bounceable:false, urlSafe:true });
    }
  }catch(e){ ownerWalletAddress = 'ERROR: ' + e.message; }
  res.json({ ok:true, service:'payments', usdtMaster:USDT_MASTER_ADDRESS, invoiceWallet:INVOICE_WALLET_ADDRESS, treasuryContract:TREASURY_CONTRACT_ADDRESS, payoutWalletConfigured:!!PAYOUT_WALLET_MNEMONIC, ownerWalletAddress, ownerWalletVersion, walletCandidates, treasuryOwner:TREASURY_OWNER_ADDRESS, ownerMatchesTreasury });
});

app.post('/api/payments/usdt-order', async (req, res) => {
  try{
    const { address, amountUsdt, gems, kind } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const payment = validatePaymentAmount(kind, amountUsdt, gems);
    const built = buildTonNativeTransaction({ amountTon: payment.ton, gems: payment.gems, kind });
    let order = null;
    let user = null;
    if(supabase){
      const created = await getOrCreateUser(address);
      user = created.user;
      const inserted = await supabase.from('payment_orders').insert({
        user_id: user.id,
        wallet_address: friendlyTonAddress(address),
        kind,
        amount_usdt: payment.ton,
        gems: payment.gems,
        status: 'wallet_opened',
        ton_payload: { validUntil: built.validUntil, messages: built.messages },
        metadata: built.meta,
        expires_at: new Date(built.validUntil * 1000).toISOString()
      }).select('*').single();
      if(inserted.error) throw new Error(inserted.error.message);
      order = inserted.data;
      if(kind === 'deposit'){
        await supabase.from('deposits').insert({
          user_id: user.id,
          payment_order_id: order.id,
          wallet_address: friendlyTonAddress(address),
          amount_usdt: payment.ton,
          gems: payment.gems,
          status: 'pending'
        });
      }
    }
    return res.json({ ok:true, orderId: order?.id || null, transaction: { validUntil: built.validUntil, messages: built.messages }, meta: built.meta });
  }catch(e){
    return res.status(400).json({ ok:false, error:e.message });
  }
});


app.post('/api/payments/mark-sent', async (req, res) => {
  try{
    const { orderId, boc, txHash } = req.body || {};
    if(!orderId) return res.status(400).json({ ok:false, error:'orderId requerido' });
    requireSupabase();
    const upd = await supabase.from('payment_orders').update({
      status:'sent',
      tx_hash: txHash || null,
      metadata: { sent_boc: boc || null, sent_at: new Date().toISOString() }
    }).eq('id', orderId).select('*').single();
    if(upd.error) throw new Error(upd.error.message);
    return res.json({ ok:true, order: upd.data });
  }catch(e){
    return res.status(400).json({ ok:false, error:e.message });
  }
});

app.post('/api/user/sync', async (req, res) => {
  try{
    const { address, refCode, startParam } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const { user, balance } = await getOrCreateUser(address, refCode || startParam || null);
    const state = await getUserState(user.id);
    return res.json({ ok:true, user, balance: state.balance || balance, nfts: state.nfts, ranking: state.ranking });
  }catch(e){
    return res.status(400).json({ ok:false, error:e.message });
  }
});

app.post('/api/withdrawals/request', async (req, res) => {
  try{
    const { address, walletTo, gemsRequested } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet conectada requerida' });
    if(!walletTo) return res.status(400).json({ ok:false, error:'Wallet destino requerida' });
    Address.parse(walletTo); // valida destino TON
    const { user } = await getOrCreateUser(address);
    const calc = calcWithdrawal(Number(gemsRequested));

    const { data:balance, error:balErr } = await supabase.from('balances').select('*').eq('user_id', user.id).single();
    if(balErr) throw new Error(balErr.message);
    if((balance.gems || 0) < calc.gemsRequested) throw new Error('Saldo insuficiente');

    const newGems = Number(balance.gems) - calc.gemsRequested;
    const newLocked = Number(balance.locked_gems || 0) + calc.gemsRequested;
    const upd = await supabase.from('balances').update({ gems:newGems, locked_gems:newLocked }).eq('user_id', user.id).select('*').single();
    if(upd.error) throw new Error(upd.error.message);

    const ins = await supabase.from('withdrawals').insert({
      user_id: user.id,
      wallet_to: walletTo,
      gems_requested: calc.gemsRequested,
      fee_percent_gems: calc.feePercentGems,
      fee_fixed_gems: calc.feeFixedGems,
      gems_net: calc.gemsNet,
      amount_usdt_net: calc.amountUsdtNet,
      status: 'pending'
    }).select('*').single();
    if(ins.error) throw new Error(ins.error.message);
    return res.json({ ok:true, withdrawal: ins.data, balance: upd.data, calc });
  }catch(e){
    return res.status(400).json({ ok:false, error:e.message });
  }
});

app.post('/api/rewards/daily-claim', async (req, res) => {
  try{
    const { address } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const { user } = await getOrCreateUser(address);
    const today = new Date().toISOString().slice(0,10);
    const existing = await supabase.from('daily_claims').select('*').eq('user_id', user.id).eq('claim_date', today).maybeSingle();
    if(existing.error) throw new Error(existing.error.message);
    if(existing.data) return res.status(400).json({ ok:false, error:'Ya reclamaste hoy' });
    const countRes = await supabase.from('daily_claims').select('id', { count:'exact', head:true }).eq('user_id', user.id);
    const dayNumber = ((countRes.count || 0) % 30) + 1;
    const weekly = [
      {type:'gems', amount:1}, {type:'points', amount:2}, {type:'gems', amount:2}, {type:'points', amount:3},
      {type:'gems', amount:3}, {type:'points', amount:4}, {type:'gems', amount:4}
    ];
    const reward = weekly[(dayNumber - 1) % weekly.length];
    const ins = await supabase.from('daily_claims').insert({ user_id:user.id, claim_date:today, day_number:dayNumber, reward_type:reward.type, reward_amount:reward.amount }).select('*').single();
    if(ins.error) throw new Error(ins.error.message);
    let balance = null;
    if(reward.type === 'gems') balance = await addGemsToUser(user.id, reward.amount, 'gems');
    else await supabase.from('ranking').upsert({ user_id:user.id, season:'S1', points:reward.amount }, { onConflict:'user_id,season', ignoreDuplicates:true });
    if(reward.type === 'points'){
      const cur = await supabase.from('ranking').select('*').eq('user_id', user.id).eq('season','S1').single();
      if(!cur.error) await supabase.from('ranking').update({ points:Number(cur.data.points||0)+reward.amount }).eq('id', cur.data.id);
    }
    const state = await getUserState(user.id);
    return res.json({ ok:true, claim:ins.data, reward, balance: state.balance });
  }catch(e){ return res.status(400).json({ ok:false, error:e.message }); }
});

app.post('/api/rewards/achievements/claim', async (req, res) => {
  try{
    const { address } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const { user } = await getOrCreateUser(address);
    const { data:rows, error } = await supabase.from('achievements').select('*').eq('user_id', user.id);
    if(error) throw new Error(error.message);
    let totalGems = 0;
    for(const a of rows || []){
      const available = Math.floor(Number(a.progress||0) / Number(a.threshold||1000)) - Number(a.claimed_count||0);
      if(available > 0){
        totalGems += available * Number(a.reward_gems || 0);
        await supabase.from('achievements').update({ claimed_count:Number(a.claimed_count||0)+available }).eq('id', a.id);
      }
    }
    let balance = null;
    if(totalGems > 0) balance = await addGemsToUser(user.id, totalGems, 'gems');
    else balance = (await getUserState(user.id)).balance;
    return res.json({ ok:true, claimedGems:totalGems, balance });
  }catch(e){ return res.status(400).json({ ok:false, error:e.message }); }
});

app.post('/api/rewards/goals/claim', async (req, res) => {
  try{
    const { address } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const { user } = await getOrCreateUser(address);
    const { data:rows, error } = await supabase.from('goal_rewards').select('*').eq('user_id', user.id);
    if(error) throw new Error(error.message);
    let totalGems = 0;
    for(const g of rows || []){
      const available = Math.floor(Number(g.count||0) / Number(g.threshold||100)) - Number(g.claimed_count||0);
      if(available > 0){
        totalGems += available * Number(g.reward_gems || 0);
        await supabase.from('goal_rewards').update({ claimed_count:Number(g.claimed_count||0)+available }).eq('id', g.id);
      }
    }
    let balance = null;
    if(totalGems > 0) balance = await addGemsToUser(user.id, totalGems, 'gems');
    else balance = (await getUserState(user.id)).balance;
    return res.json({ ok:true, claimedGems:totalGems, balance });
  }catch(e){ return res.status(400).json({ ok:false, error:e.message }); }
});

app.post('/api/ranking/global', async (req, res) => {
  try{
    requireSupabase();
    const { data, error } = await supabase.from('ranking').select('*, app_users(wallet_address, ref_code)').eq('season','S1').order('points', { ascending:false }).limit(50);
    if(error) throw new Error(error.message);
    return res.json({ ok:true, ranking:data || [] });
  }catch(e){ return res.status(400).json({ ok:false, error:e.message }); }
});

app.post('/api/matches/play', async (req, res) => {
  try{
    const { address, mode, nftId } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const { user } = await getOrCreateUser(address);
    const result = req.body?.result || (Math.random() < 0.58 ? 'win' : Math.random() < 0.78 ? 'draw' : 'loss');
    const gemsMap = mode === 'estadio' ? { win:90, draw:30, loss:0 } : { win:45, draw:15, loss:0 };
    const pointsMap = { win:15, draw:5, loss:-10 };
    const gemsDelta = gemsMap[result] ?? 0;
    const pointsDelta = pointsMap[result] ?? 0;
    const balance = gemsDelta > 0 ? await addGemsToUser(user.id, gemsDelta, 'gems') : (await getUserState(user.id)).balance;

    const rnk = await supabase.from('ranking').select('*').eq('user_id', user.id).eq('season','S1').single();
    if(!rnk.error){
      await supabase.from('ranking').update({
        points: Math.max(0, Number(rnk.data.points||0) + pointsDelta),
        wins: Number(rnk.data.wins||0) + (result==='win'?1:0),
        draws: Number(rnk.data.draws||0) + (result==='draw'?1:0),
        losses: Number(rnk.data.losses||0) + (result==='loss'?1:0)
      }).eq('id', rnk.data.id);
    }

    let nftUuid = null;
    if(nftId && /^[0-9a-f-]{36}$/i.test(String(nftId))){
      const nf = await supabase.from('nfts').select('*').eq('id', nftId).eq('user_id', user.id).maybeSingle();
      if(!nf.error && nf.data){
        nftUuid = nf.data.id;
        await supabase.from('nfts').update({
          stamina: Math.max(0, Number(nf.data.stamina||0)-1),
          durability: Math.max(0, Number(nf.data.durability||0)-0.8),
          exp: Number(nf.data.exp||0) + (mode === 'torneo' ? 10 : 5),
          earned_usd: Number(nf.data.earned_usd||0) + (gemsDelta/32)
        }).eq('id', nf.data.id);
      }
    }

    const match = await supabase.from('matches').insert({
      user_id:user.id,
      nft_id:nftUuid,
      mode: ['estadio','cancha','torneo'].includes(mode) ? mode : 'cancha',
      result,
      gems_delta:gemsDelta,
      points_delta:pointsDelta,
      durability_delta:nftUuid ? -0.8 : 0,
      stamina_delta:nftUuid ? -1 : 0
    }).select('*').single();
    if(match.error) throw new Error(match.error.message);
    return res.json({ ok:true, result, gemsDelta, pointsDelta, balance, match:match.data });
  }catch(e){ return res.status(400).json({ ok:false, error:e.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const q = String(req.query.q || '').trim();
    let query = supabase.from('v_user_summary').select('*').order('created_at', { ascending:false }).limit(100);
    if(q){ query = query.or(`wallet_address.ilike.%${q}%,ref_code.ilike.%${q}%`); }
    const { data, error } = await query;
    if(error) throw new Error(error.message);
    return res.json({ ok:true, users:data || [] });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.get('/api/admin/catalog', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const { data, error } = await supabase.from('nft_catalog').select('*').eq('active', true).order('item_type').order('price_gems');
    if(error) throw new Error(error.message);
    return res.json({ ok:true, catalog:data || [] });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.get('/api/admin/deposits', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const status = req.query.status || 'pending';
    const { data, error } = await supabase.from('deposits').select('*, app_users(wallet_address, ref_code)').eq('status', status).order('created_at', { ascending:false }).limit(100);
    if(error) throw new Error(error.message);
    return res.json({ ok:true, deposits:data || [] });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.post('/api/admin/deposits/confirm', async (req, res) => {
  try{
    requireAdmin(req);
    const { depositId, orderId, txHash } = req.body || {};
    let id = depositId;
    if(!id && orderId){
      const { data, error } = await supabase.from('deposits').select('id').eq('payment_order_id', orderId).single();
      if(error) throw new Error(error.message);
      id = data.id;
    }
    if(!id) throw new Error('depositId u orderId requerido');
    const result = await creditDeposit(id, txHash || null);
    return res.json({ ok:true, ...result });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.get('/api/admin/withdrawals', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const status = req.query.status || 'pending';
    let query = supabase.from('withdrawals').select('*, app_users(wallet_address, ref_code)').order('created_at', { ascending:false }).limit(100);
    if(String(status).includes(',')) query = query.in('status', String(status).split(',').map(s => s.trim()).filter(Boolean));
    else query = query.eq('status', status);
    const { data, error } = await query;
    if(error) throw new Error(error.message);
    return res.json({ ok:true, withdrawals:data || [] });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.post('/api/admin/withdrawals/tonconnect-payout-order', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const { withdrawalId, payerAddress } = req.body || {};
    if(!withdrawalId) throw new Error('withdrawalId requerido');
    if(!payerAddress) throw new Error('Wallet pagadora conectada requerida');
    const { data:w, error } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
    if(error) throw new Error(error.message);
    if(!['pending','approved'].includes(w.status)) throw new Error('Retiro no disponible para pago');
    const amount = Number(w.amount_usdt_net || 0);
    if(!amount || amount <= 0) throw new Error('Monto TON neto inválido');
    const comment = `FUTMUNDI:WITHDRAWAL:${w.id}:${amount}TON`;
    const body = beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{
        address: Address.parse(w.wallet_to).toString({ bounceable:false, urlSafe:true }),
        amount: toNano(String(amount)).toString(),
        payload: body.toBoc().toString('base64')
      }]
    };
    return res.json({
      ok:true,
      withdrawalId:w.id,
      amountTon:amount,
      walletTo:w.wallet_to,
      transaction:tx,
      meta:{ amountTon:amount, walletTo:w.wallet_to, payer:payerAddress, comment }
    });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.post('/api/admin/withdrawals/action', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const { withdrawalId, action, txHash, note } = req.body || {};
    if(!withdrawalId || !action) throw new Error('withdrawalId y action requeridos');
    const { data:w, error } = await supabase.from('withdrawals').select('*').eq('id', withdrawalId).single();
    if(error) throw new Error(error.message);
    if(action === 'approve'){
      if(w.status !== 'pending') throw new Error('Retiro no está pendiente');
      const upd = await supabase.from('withdrawals').update({ status:'approved', approved_at:new Date().toISOString(), admin_note:note || null }).eq('id', w.id).select('*').single();
      if(upd.error) throw new Error(upd.error.message);
      return res.json({ ok:true, withdrawal:upd.data });
    }
    if(action === 'pay'){
      if(!['pending','approved'].includes(w.status)) throw new Error('Retiro no se puede pagar');
      const calc = calcWithdrawal(Number(w.gems_requested || 0));
      const gross = Number(calc.amountTonGross || 0);
      if(!gross || gross <= 0) throw new Error('Monto TON bruto inválido');
      const payment = await sendTreasuryWithdrawRequest({
        toAddress: w.wallet_to,
        amountTonGross: gross,
        withdrawalId: w.id
      });
      const paid = await markWithdrawalPaid(w, payment.txHash, note || `Orden enviada al TON Treasury. El contrato descuenta 6% + 1 TON. seqno=${payment.seqno}`, payment.expectedTonNet);
      return res.json({ ok:true, ...paid, payment });
    }
    if(action === 'paid'){
      if(!['pending','approved'].includes(w.status)) throw new Error('Retiro no se puede marcar pagado');
      const paid = await markWithdrawalPaid(w, txHash || w.tx_hash, note || w.admin_note);
      return res.json({ ok:true, ...paid });
    }
    if(action === 'reject'){
      if(!['pending','approved'].includes(w.status)) throw new Error('Retiro no se puede rechazar');
      const { data:bal, error:balErr } = await supabase.from('balances').select('*').eq('user_id', w.user_id).single();
      if(balErr) throw new Error(balErr.message);
      const updBal = await supabase.from('balances').update({
        gems: Number(bal.gems || 0) + Number(w.gems_requested || 0),
        locked_gems: Math.max(0, Number(bal.locked_gems || 0) - Number(w.gems_requested || 0))
      }).eq('user_id', w.user_id).select('*').single();
      if(updBal.error) throw new Error(updBal.error.message);
      const upd = await supabase.from('withdrawals').update({ status:'rejected', admin_note:note || null }).eq('id', w.id).select('*').single();
      if(upd.error) throw new Error(upd.error.message);
      return res.json({ ok:true, withdrawal:upd.data, balance:updBal.data });
    }
    throw new Error('Acción inválida');
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.post('/api/admin/gifts/gems', async (req, res) => {
  try{
    const admin = requireAdmin(req);
    requireSupabase();
    const { wallet, userId, gems, note } = req.body || {};
    const user = await resolveUserTarget({ userId, wallet });
    const balance = await addGemsToUser(user.id, Number(gems || 0), 'gems');
    const gift = await supabase.from('admin_gifts').insert({ admin_user_id:null, to_user_id:user.id, to_wallet:user.wallet_address, gift_type:'gems', gems:Number(gems), status:'delivered', note:note || null, delivered_at:new Date().toISOString() }).select('*').single();
    if(gift.error) throw new Error(gift.error.message);
    return res.json({ ok:true, user, balance, gift:gift.data });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.post('/api/admin/gifts/nft', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const { wallet, userId, catalogCode, note } = req.body || {};
    if(!catalogCode) throw new Error('catalogCode requerido');
    const user = await resolveUserTarget({ userId, wallet });
    const nft = await createNftForUser(user.id, catalogCode, 'admin_gift');
    const gift = await supabase.from('admin_gifts').insert({ admin_user_id:null, to_user_id:user.id, to_wallet:user.wallet_address, gift_type:'nft', catalog_code:catalogCode, status:'delivered', note:note || null, delivered_at:new Date().toISOString() }).select('*').single();
    if(gift.error) throw new Error(gift.error.message);
    return res.json({ ok:true, user, nft, gift:gift.data });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.post('/api/admin/tournament-prize', async (req, res) => {
  try{
    requireAdmin(req);
    requireSupabase();
    const { wallet, userId, gems, tournamentId, note } = req.body || {};
    const user = await resolveUserTarget({ userId, wallet });
    const balance = await addGemsToUser(user.id, Number(gems || 0), 'gems');
    const gift = await supabase.from('admin_gifts').insert({
      admin_user_id:null,
      to_user_id:user.id,
      to_wallet:user.wallet_address,
      gift_type:'gems',
      gems:Number(gems),
      status:'delivered',
      note: note || `Premio torneo ${tournamentId || ''}`.trim(),
      delivered_at:new Date().toISOString()
    }).select('*').single();
    if(gift.error) throw new Error(gift.error.message);
    return res.json({ ok:true, user, balance, gift:gift.data });
  }catch(e){ return res.status(e.status || 400).json({ ok:false, error:e.message }); }
});

app.listen(PORT, () => {
  console.log(`FUTMUNDI admin backend escuchando en http://localhost:${PORT}`);
});
