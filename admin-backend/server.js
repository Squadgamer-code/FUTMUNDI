import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import { Address } from '@ton/core';
import { sha256 } from '@ton/crypto';

const PORT = Number(process.env.PORT || 8787);
const PROOF_TTL_SECONDS = Number(process.env.TON_PROOF_TTL_SECONDS || 300);
const SESSION_TTL_SECONDS = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 86400);
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

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

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'futmundi-admin-backend' });
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

app.listen(PORT, () => {
  console.log(`FUTMUNDI admin backend escuchando en http://localhost:${PORT}`);
});
