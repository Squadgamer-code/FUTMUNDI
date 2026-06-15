# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem Pro (TON Network)

Juego de fútbol estilo arcade top-down apaisado (Landscape) y plataforma descentralizada de apuestas deportivas en vivo optimizada con integración de **Contratos Inteligentes en TON (The Open Network)** para pagos directos en **`USDT`**, agilidad de Gameplay profesional ("Snappy Controller") y conexión en tiempo real mediante tu Master Key oficial de **`API-Sports (API-Football v3)`** (Zero Lag en Vercel).

---

## ✨ Blindaje de Motor y Jugabilidad Horizontal (2026 Ultimate Build)

1. **🖥️ Formato Horizontal Apaisado de Alta Fidelidad (Landscape Mode)**:
   - **Orientación Automática**: Se eliminó la distorsión vertical empaquetada. Al ingresar a jugar tus partidos, el lienzo de la cancha se empaqueta y bloquea de forma forzada en **formato horizontal apaisado ancha (16:9 Landscape)** (`screen.orientation.lock("landscape")`), emulando la inmersión y ergonomía de una consola de videojuegos profesional en cualquier teléfono móvil o PC.

2. **⚽ Visibilidad Monumental en RAM (Balón de Neón y Redes Inmensas)**:
   - Para erradicar para siempre los errores externos de Vercel, el motor auto-genera sus recursos en memoria RAM.
   - En este proceso, se aumentó radicalmente la escala y contorno del balón (`shadowBlur: 12, fillStyle: '#ffffff'`) para que se visualice como un astro resplandeciente en el centro del pasto. Así mismo, la portería enemiga se dotó con una red interior blanca visible y gruesos marcos dorados de 8 píxeles.

3. **⚡ Dinámica de Joystick "Ultra Snappy" (Cero Latencia Táctil)**:
   - Siguiendo tu diagnóstico de agilidad, se eliminó la fricción o *deadzone* del joystick táctil (`updateStick`). 
   - Tan pronto deslices el pulgar en cualquier coordenada hacia la izquierda (`-1`), derecha (`+1`), arriba o abajo, el vector asume su potencia absoluta de inmediato (`{x: l.x, y: l.y}`). Así mismo, se multiplicó la velocidad de aceleración (`speed × 1.7`) en la física de los futbolistas para que la respuesta de regate y persecución sea instantánea y furiosa.

4. **🎽 Personalización en Vercel (Tu Nombre NFT estamapado en el HUD)**:
   - En el recuadro superior `.hud-blue` (donde anteriormente aparecía *"BLUE"* de forma fija), el Auto-Parche del sistema atrapa el nombre exacto de tu futbolista NFT seleccionado en tu inventario (por ejemplo, `[NEYMAR]`, `[LIONEL MESSI]`, `[BELLINGHAM]` o `[JAMES RODRÍGUEZ]`) y lo estampa con orgullo como el dueño del equipo en la cancha.

5. **🏆 Flujo Limpio de Modos en el Diseño Principal (` TEMPLATES`)**:
   - 📸 **Fotografía Izquierda (`"Cancha"` - PvE)**: Destinada de forma exclusiva para que practiques y juegues partidos rápidos usando tu NFT contra la Inteligencia Artificial de la CPU. Inicia `"pve"` físico de inmediato.
   - 📸 **Fotografía Derecha (`"Estadio"` - PvP)**: Destinada para los grandes enfrentamientos competitivos **Jugador 1 vs Jugador 2**. Inicia `"pvp"` físico de inmediato.
   - 🏆 **Copa del Riel Derecho (`"Torneo Mundial"`)**: Solo presenta tu botón de **`[Inscribirme — 10 USDT]`**. Tras verificar el pago en tu contrato, te abre de forma inmersiva el torneo de 15 rondas.

6. **🔒 Módulo Híbrido de Persistencia Remota en Supabase DB (`BetDB`)**:
   - **Almacenamiento Permanente en la Nube**: Al generarse cada ticket en tu Centro de Apuestas (`futmundi-bet.js`) o liquidar un premio, el sistema realiza peticiones asíncronas de guardado en Supabase a través de tu backend Render (`window.FM_ADMIN_API_BASE`). Tras reclamar las Gemas, se abonan directo a tu balance final de retiros.

7. **🎲 Sportsbook Conectado en Vivo a tu Master Key de API-Sports**:
   - Conectado directamente a tu clave secreta `cae4...7bc6`. Consume `/fixtures?live=all` sin restricciones en el protocolo `"x-apisports-key"`, traémdotelo al segundo los encuentros en vivo de todos los deportes soportados por `api-sports.io`. Apuestas en billetes de `$10.00+ USDT` depositables en tu smart contract de TON (`EQD3u6...MIs`).

---

## 📁 Contenido de tu Paquete Definitivo en GitHub

Extrae y arrastra los elementos de **`FUTMUNDI-HORIZONTAL-PRO-GAMEPLAY.zip`** directo sobre tu rama en GitHub para desplegar tu Telegram Mini App en Vercel:

```text
mi-repositorio-futmundi/
├── index (25).html             # Portal original web3
├── index-corregido.html        # Portal web3 Telegram Mini App (Sincronizado con juego real)
├── retro-cancha.js             # Motor del minijuego (⚠️ HORIZONTAL 16/9, RAM BALÓN MEGA)
├── retro-cancha.css            # Estilos visuales de la arena y Sportsbook
├── futmundi-bet.js             # Módulo de Apuestas Web3 (Conexión API-Sports real)
├── futmundi-bet.css            # Estilos del Sportsbook de Apuestas
├── integration.js              # Capa de comunicación y DOM Parche Universal Apaisado
├── assets.json                 # Manifiesto de imágenes
├── README.md                   # Este manual técnico
└── generated-assets/           # ⚠️ ARRASTRAR LA CARPETA COMPLETA AL REPOSITORIO
    ├── stadium_backdrop.png    # Fondo del estadio (1920x1080)
    ├── grass_texture.png       # Textura del pasto verde
    ├── goal_net.png            # Red del arco transparente
    ├── player_atlas.png        # Atlas con sprites de jugadores y balón
    └── player_atlas-frames.json# Metadata con coordenadas de sprites
```

**¡El titán indiscutible del gaming Web3 apaisado y apuestas descentralizadas en TON es Futmundi!** 🏆⚽⚡
