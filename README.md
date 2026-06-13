# FUTMUNDI Admin Backend

Backend mínimo para validar acceso admin mediante **TON proof**.

## 1. Instalar

```bash
cd admin-backend
npm install
cp .env.example .env
```

Edita `.env` y cambia:

```env
ADMIN_TOKEN_SECRET=un_secreto_largo_privado
CORS_ORIGIN=https://tuusuario.github.io
TON_PROOF_ALLOWED_DOMAINS=tuusuario.github.io
```

La wallet admin original ya está en `.env.example`:

```txt
UQB9uFaCgM5HVntXHe-mq3xYiYjcLEzvgnZUCffNC5DR-7vg
```

## 2. Ejecutar

```bash
npm start
```

Health check:

```bash
curl http://localhost:8787/health
```

## 3. Conectar con el index

En `index.html` cambia:

```js
window.FM_ADMIN_API_BASE = '';
```

por la URL real de tu backend:

```js
window.FM_ADMIN_API_BASE = 'https://tu-api.onrender.com';
```

## Importante

GitHub Pages solo sirve frontend estático. Este backend debe desplegarse en un servicio como Render, Railway, Fly.io, VPS, etc.
