# 🏟️ FUTMUNDI — PES / Gameboy Advance Edition (Producción Limpia v3)

Suite deportiva Web3 (TON Network) con minijuego de fútbol estilo PES/Gameboy Advance,
casa de apuestas USDT y ecosistema NFT. **Paquete optimizado y depurado.**

---

## ✅ Qué se corrigió en esta versión

### 🚨 1. El juego NO ingresaba (causa raíz)
El lanzador universal (`integration.js`) **bloqueaba el acceso** con dos `alert()`
durantes si faltaba cualquiera de estos requisitos:

1. Wallet TON conectada (`window.STATE.tonWallet`).
2. NFT de jugador en el inventario (`window.getSelectedPlayer()`).

Para un usuario nuevo que abría la app por primera vez, ambas condiciones eran
falsas, por lo que al tocar *Jugar* solo veía una alerta de denegación y el overlay
del juego **nunca se creaba**. Esto se confundía con "el juego no carga".

**Solución v3:**
- **Cancha PvE** ahora permite jugar sin wallet en **modo recreativo** (sin gemas de recompensa).
- Si no tienes NFT, el lanzador **reclama automáticamente a Neymar gratis** o te redirige al Market.
- Solo **Estadio PvP** y **Torneo** siguen exigiendo wallet TON (porque registran recompensas en blockchain).

---

### 🗑️ 2. Archivos muertos eliminados (v2)
Se quitaron del proyecto **3 archivos muertos (~53 KB)** que dependían de recursos
404 inexistentes y ya no se instanciaban:

| Archivo eliminado | Motivo |
|---|---|
| `retro-cancha.js` | Motor antiguo (`RetroCancha`). Cargaba assets 404 y `integration.js` lo borraba del DOM. |
| `retro-cancha.css` | Estilos del motor antiguo que ya no se renderiza. |
| `assets.json` | Mapa de rutas hacia recursos inexistentes; nadie lo leía en runtime. |

---

### 🐛 3. Bugs ocultos corregidos
- **`ITEM_PRICES` indefinido** → ahora se construye automáticamente desde
  `window.NFT_CONFIG` (comprar en el Market ya no crashea).
- **`getUtcWeekIdentifier` indefinido** → implementado (el modal de Check-in
  ya no crashea).
- **`saveOwned` duplicada** → se dejó una sola definición.
- **`setInterval` infinito** en el patcher de `integration.js` → reemplazado por un one-shot con 4 reintentos cortos.
- **Renderer recalculando tamaño de canvas cada frame** → ahora usa `ResizeObserver` + `visibilitychange` (menos reflow, menos batería).
- **Peso de fuente `950` inválido en canvas** → corregido a `900`.

---

## 📁 Estructura del paquete de producción

```text
FUTMUNDI-PES-CLEAN-PRODUCTION/
├── index.html                  # Pantalla principal
├── futmundi-pes-gameboy.js     # Motor del minijuego PES/Gameboy
├── futmundi-pes-gameboy.css    # Estilos del estadio apaisado
├── futmundi-bet.js             # Sportsbook Web3 (USDT TON + Time-Decay)
├── futmundi-bet.css            # Estilos del centro de apuestas
├── integration.js              # Lanzador universal del juego (v3)
├── tonconnect-manifest.json    # Manifest requerido por TON Connect
└── README.md                   # Este manual
```

---

## 🚀 Despliegue (Vercel / GitHub)

1. Sobrescribe estos 8 archivos en la raíz de tu repositorio.
2. Borra `retro-cancha.js`, `retro-cancha.css` y `assets.json` si aún existen.
3. Edita `tonconnect-manifest.json` con tu dominio real, icono y URLs legales.
4. Asegúrate de que existan las carpetas `imagen/` y `assets/img/` con los recursos usados.
5. Commit & push. Vercel compilará sin los 404 heredados y el juego cargará al instante.

---

## ⚙️ Notas técnicas

- **TON Connect** se carga vía CDN (`@tonconnect/ui@2.0.9`). El manifest debe estar
  en `https://TU_DOMINIO/tonconnect-manifest.json` o la conexión de wallet fallará.
- El backend de validación admin vive en `window.FM_ADMIN_API_BASE`
  (`https://futmundi-admin-backend.onrender.com`).
- Contrato de depósito USDT (TON): `EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs`.
- El minijuego admite 3 modos: `pve` (sin wallet), `pvp` (requiere wallet), `tournament` (requiere wallet).

---

## 🎮 Flujo de ingreso corregido

1. Usuario toca **Cancha** (PvE) → juega inmediatamente, sin wallet, con Neymar gratis.
2. Usuario toca **Estadio** (PvP) o **Torneo** → se le pide conectar wallet TON.
3. Si no tiene NFT, el sistema le reclama **Neymar gratis** automáticamente.

🏆⚽⚡
