import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import { Address, beginCell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';
import { sha256 } from '@ton/crypto';
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

function validatePaymentAmount(kind, amountUsdt, gems){
  const usdt = Number(amountUsdt);
  const g = Number(gems || 0);
  if(kind === 'deposit'){
    const allowed = new Map([[10,320],[50,1600],[125,4000],[500,16000]]);
    if(!allowed.has(usdt) || allowed.get(usdt) !== g) throw new Error('Paquete de depósito inválido');
  } else if(kind === 'tournament'){
    if(usdt !== 10) throw new Error('El torneo requiere 10 USDT');
  } else if(kind === 'training'){
    if(usdt <= 0 || usdt > 5000) throw new Error('Monto de entrenamiento inválido');
  } else {
    throw new Error('Tipo de pago inválido');
  }
  return { usdt, gems:g };
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


function requireSupabase(){
  if(!supabase) throw new Error('Supabase no está configurado en Render');
}
function friendlyTonAddress(value){
  return Address.parse(value).toString({ bounceable:false, urlSafe:true });
}
async function getOrCreateUser(address){
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

  if(!user){
    const inserted = await supabase
      .from('app_users')
      .insert({ wallet_address: walletAddress, wallet_raw: walletRaw, is_admin: isAdmin, last_login_at: new Date().toISOString() })
      .select('*')
      .single();
    if(inserted.error) throw new Error(inserted.error.message);
    user = inserted.data;
  } else {
    const updated = await supabase
      .from('app_users')
      .update({ wallet_address: walletAddress, is_admin: isAdmin, last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('*')
      .single();
    if(updated.error) throw new Error(updated.error.message);
    user = updated.data;
  }

  const bal = await supabase.from('balances').upsert({ user_id: user.id }, { onConflict:'user_id', ignoreDuplicates:false }).select('*').single();
  if(bal.error) throw new Error(bal.error.message);
  await supabase.from('ranking').upsert({ user_id: user.id, season:'S1' }, { onConflict:'user_id,season', ignoreDuplicates:true });
  return { user, balance: bal.data };
}
async function getUserState(userId){
  requireSupabase();
  const [{ data:balance, error:balanceError }, { data:nfts, error:nftsError }] = await Promise.all([
    supabase.from('balances').select('*').eq('user_id', userId).single(),
    supabase.from('nfts').select('*').eq('user_id', userId).is('destroyed_at', null).order('created_at', { ascending:true })
  ]);
  if(balanceError) throw new Error(balanceError.message);
  if(nftsError) throw new Error(nftsError.message);
  return { balance, nfts: nfts || [] };
}
function calcWithdrawal(gemsRequested){
  const gems = Number(gemsRequested);
  if(!Number.isInteger(gems)) throw new Error('Monto de gemas inválido');
  if(gems < 160 || gems > 3200) throw new Error('Monto fuera de rango (160–3200 gemas)');
  const feePercentGems = Math.floor(gems * 0.05);
  const feeFixedGems = 32;
  const gemsNet = Math.max(0, gems - feePercentGems - feeFixedGems);
  const amountUsdtNet = +(gemsNet / 32).toFixed(6);
  if(gemsNet <= 0) throw new Error('Monto neto inválido después de comisiones');
  return { gemsRequested:gems, feePercentGems, feeFixedGems, gemsNet, amountUsdtNet };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'futmundi-admin-backend', supabase: !!supabase });
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


app.get('/api/payments/health', (_req, res) => {
  res.json({ ok:true, service:'payments', usdtMaster: USDT_MASTER_ADDRESS, invoiceWallet: INVOICE_WALLET_ADDRESS });
});

app.post('/api/payments/usdt-order', async (req, res) => {
  try{
    const { address, amountUsdt, gems, kind } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const payment = validatePaymentAmount(kind, amountUsdt, gems);
    const built = await buildUsdtTransaction({ ownerAddress: address, amountUsdt: payment.usdt, gems: payment.gems, kind });
    let order = null;
    let user = null;
    if(supabase){
      const created = await getOrCreateUser(address);
      user = created.user;
      const inserted = await supabase.from('payment_orders').insert({
        user_id: user.id,
        wallet_address: friendlyTonAddress(address),
        kind,
        amount_usdt: payment.usdt,
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
          amount_usdt: payment.usdt,
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


app.post('/api/user/sync', async (req, res) => {
  try{
    const { address } = req.body || {};
    if(!address) return res.status(400).json({ ok:false, error:'Wallet requerida' });
    const { user, balance } = await getOrCreateUser(address);
    const state = await getUserState(user.id);
    return res.json({ ok:true, user, balance: state.balance || balance, nfts: state.nfts });
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

app.listen(PORT, () => {
  console.log(`FUTMUNDI admin backend escuchando en http://localhost:${PORT}`);
});
