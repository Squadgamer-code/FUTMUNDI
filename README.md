# 🏟️ FUTMUNDI — PES / Gameboy Advance Edition (Producción Limpia v2)

Suite deportiva Web3 (TON Network) con minijuego de fútbol estilo PES/Gameboy Advance,
casa de apuestas USDT y ecosistema NFT. **Paquete optimizado y depurado.**

---

## ✅ Qué se corrigió en esta versión

### 🚨 1. Latencia / El juego NO cargaba (causa raíz)
En `futmundi-pes-gameboy.js` las últimas líneas referenciaban una variable
inexistente (`PurePesGameboyApp`) en vez de la clase real (`FutmundiPesGameApp`).
Eso lanzaba un `ReferenceError` que abortaba todo el módulo, dejando
`window.FutmundiPesGameApp === undefined` y disparando indefinidamente el
mensaje _"Latencia en Vercel: El motor está terminando de componer"_.

```diff
- window.PurePesGameboyApp = PurePesGameboyApp;   // ❌ variable inexistente
- window.FutmundiPesGameApp = PurePesGameboyApp;  // ❌ nunca se ejecutaba
+ window.PurePesGameboyApp = FutmundiPesGameApp;  // ✅ clase real
+ window.FutmundiPesGameApp = FutmundiPesGameApp; // ✅ alias correcto
```

### 🗑️ 2. Archivos muertos eliminados
Se quitaron del proyecto **3 archivos muertos (~53 KB)** que dependían de recursos
404 inexistentes y ya no se instanciaban:

| Archivo eliminado | Motivo |
|---|---|
| `retro-cancha.js` | Motor antiguo (`RetroCancha`). Cargaba assets 404 y `integration.js` lo borraba del DOM. |
| `retro-cancha.css` | Estilos del motor antiguo que ya no se renderiza. |
| `assets.json` | Mapa de rutas hacia recursos inexistentes; nadie lo leía en runtime. |

También se desconectaron sus `<link>` y `<script>` del `index.html` y se
limpiaron las reglas CSS y el código de `integration.js` que los referenciaban.

### 🐛 3. Bugs ocultos corregidos
- **`ITEM_PRICES` indefinido** → ahora se construye automáticamente desde
  `window.NFT_CONFIG` (comprar en el Market ya no crashea).
- **`getUtcWeekIdentifier` indefinido** → implementado (el modal de Check-in
  ya no crashea).
- **`saveOwned` duplicada** → se dejó una sola definición.
- **`setInterval` infinito** en el patcher de `integration.js` (ejecutaba
  querying de DOM cada 1 s para siempre) → reemplazado por un one-shot con
  4 reintentos cortos.

---

## 📁 Estructura del paquete de producción

```text
FUTMUNDI-PES-CLEAN-PRODUCTION/
├── index.html                  # Pantalla principal (HTML+CSS+JS purificados)
├── futmundi-pes-gameboy.js     # Motor del minijuego PES/Gameboy (FIX LATENCIA)
├── futmundi-pes-gameboy.css    # Estilos del estadio apaisado
├── futmundi-bet.js             # Sportsbook Web3 (USDT TON + Time-Decay)
├── futmundi-bet.css            # Estilos del centro de apuestas
├── integration.js              # Lanzador universal del juego (limpio)
└── README.md                   # Este manual
```

> **Eliminar del repositorio antes de subir esta versión:** `retro-cancha.js`,
> `retro-cancha.css`, `assets.json`, y cualquier `index*.html` de respaldo viejo.

---

## 🚀 Despliegue (Vercel / GitHub)

1. Sobrescribe estos 7 archivos en la raíz de tu repositorio.
2. Borra `retro-cancha.js`, `retro-cancha.css` y `assets.json`.
3. Commit & push. Vercel compilará sin los 404 heredados y el juego cargará al instante.

---

## ⚙️ Notas técnicas

- **TON Connect** se carga vía CDN (`@tonconnect/ui@2.0.9`).
- El backend de validación admin vive en `window.FM_ADMIN_API_BASE`
  (`https://futmundi-admin-backend.onrender.com`).
- Contrato de depósito USDT (TON): `EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs`.
- El minijuego admite 3 modos: `pve`, `pvp`, `tournament` y fuerza
  orientación landscape nativa en móviles.

🏆⚽⚡
