# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem Pro (TON Network)

Juego de fútbol estilo arcade top-down en formato horizontal apaisado (Landscape Mode) y plataforma descentralizada de apuestas deportivas en vivo optimizada con **Restricciones de Ciberseguridad Web3 Blindadas (Wallet & NFT Free Strict Lock)**, Contratos Inteligentes en TON para depósitos directos en USDT y consumo en vivo de **`API-Sports (API-Football v3)`** (Zero Lag en Vercel).

---

## ✨ Blindaje de Producción y Seguridad Web3 (Mega Build 2026)

1. **🔒 Bloqueo Estricto Web3 de Accesos (No Wallet, No NFT, No Game)**:
   - **Billetera de TON Obligatoria**: Por política inquebrantable de la economía del proyecto, ningún usuario ni visitante puede acceder o visualizar el minijuego sin tener su *TON Billetera* físicamente conectada en la parte superior.
   - **NFT Exclusivo / Free Lock**: Nadie puede entrar al terreno de juego si no posee un **Futbolista NFT activo** en su inventario (sea su NFT inicial Free o comprado en Market). Si un usuario quema, agota o no ha reclamado su NFT Inicial, la entrada se bloquea al instante con una alerta de seguridad Web3 en pantalla.

2. **⚔️ Purificación Minimalista de Competición en Estadio (PvP)**:
   - Se removió la información ajena de premios fijos (5,000 gemas) y el temporizador en la ventana de **Estadio (`TEMPLATES['estadio']`)**.
   - Ahora opera puramente como lo que representa: la **Grandiosa Arena Competitiva 1v1**, donde los usuarios sincronizan físicamente a sus jugadores para disputar quién es el amo del regate y del gol.

3. **⚽ Entradas de Práctica Dinámicas en las 4 Tarjetas de Cancha (PvE)**:
   - En tu recuadro de **Cancha de Práctica (`TEMPLATES['cancha']`)** para modo 1 Jugador vs CPU, la interactividad es absoluta y directa.
   - El jugador visualiza su NFT en pantalla y puede hacer clic tanto en el gran botón inferior verde como **directamente sobre cualquiera de las 4 tarjetas de niveles de cancha (`Cancha Mundial`, `Arena Indoor`, `Barrial Futsal`, `Liga de Barrio`)** para que el juego físico se desplaye al segundo en Horizontal con la arena y pasto exacto seleccionado.

4. **🖥️ Landscape Físico Rotado Nativo**:
   - Para erradicar la sobrecarga vertical de Telegram Mini Apps, la proyección matricial de `retro-cancha.js` dibuja sus 105 metros nativamente de izquierda a derecha. E impone un rotado apaisado por CSS en pantallas *portrait*, dándote un control de bota, Anillo de Posesión de Balón de neón y agilidad de Joystick sencillamente insuperables.

5. **💾 Persistencia Híbrida Robusta en Supabase DB (`BetDB`)**:
   - En el Centro de Apuestas (`futmundi-bet.js`), todas las boletas de pronósticos (Local 1, Empate X o Visitante 2), liquidaciones y depósitos USDT al Smart Contract `EQD3u6...MIs` se guardan y unifican de forma permanente en tu Supabase remoto (`window.FM_ADMIN_API_BASE`), garantizando que tus usuarios no tengan ninguna pérdida de registros si cambian de celular.

---

## 🔑 Configuración Oficial del Ecosistema

En tus archivos de lógica ya se encuentran embebidos y asegurados tus parámetros oficiales de TON:

```javascript
  // Configuración del Contrato en futmundi-bet.js (Línea 10)
  const TonUsdtContractConfig = {
    // Smart Contract oficial de Futmundi que atiende depósitos exactos ($10+ USDT)
    contractAddress: "EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs", 
    jettonUsdtAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    rateGemsPerWinUSD: 10 
  };

  // Autenticación Master Key de API-Football v3 en futmundi-bet.js (Línea 77)
  const SportsApiProvider = {
    apiKey: "cae471625cb7232f9a54146633227bc6", // Tu Clave Privada de Sincronización al Segundo
    baseUrl: "https://v3.football.api-sports.io",
  };
```

---

## 📁 Estructura Inmaculada de Producción en GitHub

Extrae y sobreescribe estos archivos sobre la **raíz principal de tu repositorio** en GitHub para desplegar el megaproyecto en Vercel en 1 minuto:

```text
mi-repositorio-futmundi/
├── index (25).html             # Portal original web3 (⚠️ CON RESTRICCIONES DE WALLET/NFT)
├── index-corregido.html        # Portal web3 Telegram Mini App (⚠️ CON RESTRICCIONES Y PVP LIMPIO)
├── retro-cancha.js             # Motor de minijuego (⚠️ APARIENCIA REAL WEBP Y JUEGO APAISADO)
├── retro-cancha.css            # Estilos generales visuales
├── futmundi-bet.js             # Sportsbook Minimalista Web3 (API-Football en el fondo)
├── futmundi-bet.css            # Estilos del Centro de Apuestas Zero Lag
├── integration.js              # Capa de enlace con Supabase y window.__FM_UNIVERSAL_OPEN_GAME
├── assets.json                 # Mapeo de rutas visuales
├── README.md                   # Este manual técnico
└── generated-assets/           # ⚠️ CARPETA CRÍTICA CON LOS PNG Y WEBP WEBP PRO
    ├── grass_texture.webp      # Textura del césped en alta resolución real
    ├── blue_attacker.webp      # Jugador real en WebP
    ├── keeper_black.webp       # Portero oficial WebP
    ├── soccer_ball.webp        # Balón fotográfico de producción
    ├── goal_net.png            # Red del arco transparente
    └── player_atlas-frames.json# Metadata matricial de frames
```

**¡Tienes el producto descentralizado de Web3, gaming y apuestas deportivas más monstruoso de The Open Network!** 🏆⚽⚡
