# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem Pro (TON Network)

Juego de fútbol estilo arcade top-down y plataforma descentralizada de apuestas deportivas en vivo optimizada con integración de **Contratos Inteligentes en TON (The Open Network)** para pagos en **`USDT`**, Auto-Fallback gráfico en RAM y conexión nativa con tu cuenta oficial de **`API-Sports (API-Football v3)`** (Zero Lag en Vercel).

---

## ✨ Mega Actualización y Blindaje de Producción (Engine Fix 2026)

1. **🛠️ Blindaje del Motor de Juego (`preloadAssets` Auto-Fallback en RAM)**:
   - **Arranque Instantáneo Garantizado**: Se solucionó de forma definitiva el error `"No se pudo cargar la cancha. Reintenta actualizar."` que saltaba en Vercel al fallar la red o no encontrar recursos externos.
   - Si el `fetch` de alguna imagen o del JSON de *frames* falla, el motor genera lienzos de `canvas` en la memoria RAM al milisegundo (estadio, pasto verde, arcos y sprites), ejecutando `this.resetMatch(!1)` para que el minijuego arranque siempre con una fluidez y estabilidad gloriosa.

2. **🏆 Flujo Limpio de Torneos Mundiales (`TEMPLATES['torneo']`)**:
   - Se eliminaron los botones duplicados de configuración o *"Entrar a disputar torneo"*.
   - El recuadro del torneo presenta únicamente tu botón de **`[Inscribirme — 10 USDT]`** (`#t-register`). Al confirmar el pago exitoso en el contrato, te abre de forma inmersiva la cancha contra tus rivales.

3. **📸 Interfaz Principal Cero Botones Duplicados (`.actions`)**:
   - Se removieron por completo los botones secundarios de `"🔍 Configuración de Estadio"` y `"🔍 Configuración de Cancha"`.
   - Toda la interactividad reside de forma ultra intuitiva y directa en las **dos grandiosas fotografías de tu pantalla central**:
     - 📸 **Fotografía Izquierda (`"Cancha"` - PvE)**: Inicia de inmediato tu minijuego físico para practicar 1 Jugador vs Inteligencia Artificial (CPU).
     - 📸 **Fotografía Derecha (`"Estadio"` - PvP)**: Inicia de inmediato tu minijuego físico para competir Jugador 1 vs Jugador 2.

4. **🔒 Módulo Híbrido de Persistencia en Supabase DB (`BetDB`)**:
   - **Almacenamiento Permanente en la Nube**: El Centro de Apuestas (`futmundi-bet.js`) no depende solo de la memoria del navegador (`localStorage`). Al generarse cada ticket, realizar un pago USDT o liquidar un premio, el sistema realiza peticiones asíncronas de guardado en Supabase a través de tu backend Render (`window.FM_ADMIN_API_BASE`).
   - **Sincronización Automática Web3**: Cuando un usuario borra su caché, actualiza la página o entra desde otro celular, la app jala y unifica sus boletas en la nube en tiempo real.

5. **🎲 Sportsbook Conectado en Vivo a tu Cuenta en API-Sports (`futmundi-bet.js`)**:
   - **Master Key Unificada (`cae4...7bc6`)**: Permite consumir sin restricciones de autenticación y al milisegundo cualquier liga, copa o deporte (Fútbol, Baloncesto, NBA, Fórmula 1, MMA, Béisbol) de `api-sports.io` enviando los headers automáticos `"x-apisports-key"` y `"x-rapidapi-key"`.
   - **Apuestas Directas en USDT ($10 en adelante)**: Al elegir Local (1), Empate (X) o Visitante (2), la consola te pide depositar el monto exacto en **USDT / dólares nativos** con un mínimo estricto de `$10.00 USDT` a la dirección de tu smart contract `EQD3u6...MIs`. Si intenta colocar un saldo menor a 10 USDT, el script bloquea la boleta en el acto.
   - **Premios Retirables en Gemas**: Al culminar el encuentro a ganador, el jugador le da a **`[🎁 Reclamar Premio]`**, donde se convierten sus ganancias en USD a **Gemas retirables** directo a su balance final.

---

## 📁 Estructura Definitiva de Producción para GitHub y Vercel

Sube y extrae el contenido de **`FUTMUNDI-ENGINE-FIX-PRODUCTION-BUILD.zip`** de forma directa en tu repositorio en GitHub para compilar la versión definitiva en Vercel:

```text
mi-repositorio-futmundi/
├── index (25).html             # Portal original web3
├── index-corregido.html        # Portal web3 Telegram Mini App (Diseño central limpio)
├── retro-cancha.js             # Motor del minijuego (⚠️ CON AUTO-FALLBACK EN RAM)
├── retro-cancha.css            # Estilos visuales generales
├── futmundi-bet.js             # ⚠️ MÓDULO DE APUESTAS WEB3 (Persistencia Supabase DB)
├── futmundi-bet.css            # ⚠️ ESTILOS DEL SPORTSBOOK PRO
├── integration.js              # Capa de comunicación y "Auto-Patcher Universal"
├── assets.json                 # Mapeo de imágenes
├── README.md                   # Este manual técnico
└── generated-assets/           # ⚠️ ARRASTRAR LA CARPETA COMPLETA AL REPOSITORIO
    ├── stadium_backdrop.png    # Fondo del estadio (1920x1080)
    ├── grass_texture.png       # Textura del pasto verde
    ├── goal_net.png            # Red del arco transparente
    ├── player_atlas.png        # Atlas con sprites de jugadores y balón
    └── player_atlas-frames.json# Metadata con coordenadas de sprites
```

**¡Tienes la plataforma deportiva, de apuestas Web3 y de videojuegos más monstruosa de The Open Network!** 🏆⚽⚡
