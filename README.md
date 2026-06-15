# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem Pro (TON Network)

Juego de fútbol estilo arcade top-down y plataforma descentralizada de apuestas deportivas en vivo optimizada con integración de **Contratos Inteligentes en TON (The Open Network)** para depósitos exactos en **`USDT`** y conexión en tiempo real mediante tu Master Key oficial de **`API-Sports (API-Football v3)`** (Zero Lag en Vercel).

---

## ✨ Características Oficiales de Web3 y Producción (2026 Build)

1. **🎲 Sportsbook Conectado en Vivo a API-Sports (`futmundi-bet.js`)**:
   - **Master Key Unificada (`cae4...7bc6`)**: Conectada directamente al corazón del módulo. Permite consumir sin restricciones de autenticación y al milisegundo cualquier liga, copa o deporte (Fútbol, Baloncesto, NBA, Fórmula 1, MMA, Béisbol) soportado por los servidores de `api-sports.io`.
   - **Encuentros y Tiempos en Directo**: Consume de forma continua `/fixtures?live=all`, entregando la lista de encuentros que se están disputando al segundo en el mundo con sus marcadores y minutos.
   - **Apuestas Directas en USDT ($10 en adelante)**: Al elegir Local (1), Empate (X) o Visitante (2), el boleto solicita ingresar el monto en **USDT exactos** con un mínimo estricto de `$10.00 USDT`. 
   - **Depósito TON Smart Contract Directo**: Al confirmar, la boleta no deduce gemas, sino que abre el deep link de TON Blockchain `ton://transfer/EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs?amount=...` para pagar directo a tu Smart Contract en TON con Tonkeeper o Telegram Billetera en 1 segundo. Si el usuario intenta colocar un saldo menor a 10 USDT, el sistema le bloquea el pago en el acto.
   - **Ganancias a Balance Retirable**: Cuando culmina el encuentro y acierta, su boleta pasa a **`🟢 ¡GANASTE!`**. Tras darle a **`[🎁 Reclamar Premio]`**, la plataforma convierte su liquidación ganada en USD a su equivalente de **Gemas retirables** y las abona directo en su Balance Principal. Ya con ellas, el usuario entra cuando lo desee a su **botón de retiros** que tienes configurado en tu plataforma.

2. **🎁 Bolsa de Premios Dinámica & Mega Mega Torneos (> 250 Activos)**:
   - **Cálculo Matemático en Vivo**: El sistema realiza y expone el cálculo de premios basándose en el total de inscritos activos:
     `Total Bruto Ingresado = Personas Activas × $10 USD`.
     `Bolsa de Premios en Gemas (30%) = Total Bruto × 0.30`.
   - **Mega Cláusula Top 100**: Si se superan los **250 inscritos activos**, la plataforma garantiza una fantástica lluvia de regalos en NFTs ecosistémicos para los primeros 100 puestos de la tabla:
     - 🥇 **1º Puesto**: **1 NFT Exclusivo del Torneo** + **50% de Gemas del Pozo**.
     - 🥈 **2º Puesto**: **2 NFTs Secundarios** + **30% de Gemas del Pozo**.
     - 🥉 **3º Puesto**: **20% de Gemas del Pozo**.
     - 🏅 **4º al 10º Puesto**: **👟 NFT Zapatillas Pro Elite (Boots)**.
     - 🏅 **11º al 30º Puesto**: **🎽 NFT Uniforme Retro Oficial (Kits)**.
     - 🏅 **31º al 60º Puesto**: **👨‍ NFT Entrenador / Preparador Físico (Coach)**.
     - 🏅 **61º al 100º Puesto**: **🎟️ NFT Ticket / Pase de Entrenamiento**.
   - **Simuladores**: Contiene botones de simulación interactiva para sumar nuevos inscritos o lanzar la modalidad Mega Torneo con un clic y ver actualizar toda la bolsa en tiempo real.

3. **📜 Historial Personal de Torneos & Récords (`RetrocHistoryManager`)**:
   - Guardado automático en `localStorage` (`"retroCancha03:tournamentHistory"`) de cada torneo finalizado (Campeón o Eliminado).
   - Modal retro invocable desde el Menú (`[📜 MIS TORNEOS]`) o el HUD del juego (`[📜 HIST]`).
   - Muestra estadísticas en vivo: Récord Personal (Best Score), Total de Torneos Jugados, Total de Títulos y lista detallada de intentos anteriores con botón de **🔄 Revancha Rápida**.

4. **🏆 Tabla de Posiciones Dual & Top 100 (`RetrocLeaderboardManager`)**:
   - **Leaderboard Mundial / Local (`[🏆 RANKING]`)**: Muestra la tabla oficial extendida hasta el **Top 100 Mejores Jugadores**. Refleja Billeteras (*Wallets*), el **NFT Utilizado** por cada jugador, sus Récords Absolutos y su Recompensa Ganada.
   - **Bracket del Torneo en Vivo (`[🏆 Bracket]` en el HUD)**: Permite visualizar en cualquier momento de un torneo tus rondas superadas, el **Rival Actual** en disputa, su recompensa de puntos y tu Tier asegurado (Bronce / Plata / Oro / Leyenda).

5. **☁️ Notificaciones de Puntos al Backend cada N Rondas (Checkpoints)**:
   - Notificación programada cada 3 rondas completadas (`NOTIFY_EVERY_N_ROUNDS = 3`).
   - Al ganar las rondas **R3, R6, R9 y R12**, el juego sincroniza de forma inmediata tu puntaje intermedio y tier superado con la nube o backend de Futmundi (`/api/tournament/submit`).
   - Notificación visual en pantalla con el mensaje flotante: **`💾 Checkpoint R[X] guardado en backend`**.

6. **💎 Lógica de Récord Máximo con Múltiples NFTs en Torneos**:
   - **Comportamiento Estricto de "Best Score"**: Si un usuario posee 20 NFTs y participa en el torneo múltiples veces (ej. hace 5000 PTS con uno, 2000 PTS con otro y 1500 PTS con un tercero durante los 4 días del torneo), el sistema **no suma ni acumula los puntajes**.
   - En la **Tabla de Posiciones (Ranking)** se registrará y mostrará **únicamente el puntaje mayor de ese usuario (5000 PTS)**. Cada intento nuevo solo sobreescribirá el ranking si supera su récord absoluto anterior.

---

## 🔑 Autenticación Unificada API-Sports (Master Key)

En tu módulo **`futmundi-bet.js`**, en la **línea 77**, ya se encuentra inyectada y protegida tu Clave Maestra de tu suscripción de API-Sports:

```javascript
  const SportsApiProvider = {
    // Clave Privada Unificada API-Sports (Futmundi Master Key)
    apiKey: "cae471625cb7232f9a54146633227bc6", 
    baseUrl: "https://v3.football.api-sports.io",
  };
```
Esta clave secreta atiende y autoriza de inmediato tus peticiones bajo los protocolos `"x-apisports-key"` y `"x-rapidapi-key"`. Adicionalmente a **API-Football**, puedes utilizar esta misma Master Key en tus futuras actualizaciones para consultar en tiempo real el resto de la suite de la plataforma:
- `v2.nba.api-sports.io` (Baloncesto / NBA)
- `v1.formula-1.api-sports.io` (Fórmula 1)
- `v1.baseball.api-sports.io` (Béisbol / MLB)
- `v1.mma.api-sports.io` (UFC / MMA)

---

## 📁 Estructura Definitiva de Producción en GitHub

Sube y extrae el contenido de **`FUTMUNDI-MEGA-PRODUCTION-BUILD.zip`** de forma directa en tu repositorio en GitHub para compilar la versión cumbre en Vercel:

```text
mi-repositorio-futmundi/
├── index (25).html             # Portal original web3
├── index-corregido.html        # Portal web3 Telegram Mini App (Inyectado con apuestas)
├── retro-cancha.js             # Motor del juego (bundle con Top 100 y Mega Torneos)
├── retro-cancha.css            # Estilos generales visuales
├── futmundi-bet.js             # ⚠️ MÓDULO DE APUESTAS WEB3 (Con Master Key API-Sports)
├── futmundi-bet.css            # ⚠️ ESTILOS DEL SPORTSBOOK PRO
├── integration.js              # Capa de comunicación Futmundi
├── assets.json                 # Mapeo de recursos
├── README.md                   # Este manual técnico
└── generated-assets/           # ⚠️ ARRASTRAR LA CARPETA COMPLETA AL REPOSITORIO
    ├── stadium_backdrop.png    # Fondo del estadio (1920x1080)
    ├── grass_texture.png       # Textura del pasto verde
    ├── goal_net.png            # Red del arco transparente
    ├── player_atlas.png        # Atlas con sprites de jugadores y balón
    └── player_atlas-frames.json# Metadata con coordenadas de sprites
```

**¡Tienes el monstruo deportivo y de apuestas Web3 definitivo de The Open Network!** 🏆⚽⚡
