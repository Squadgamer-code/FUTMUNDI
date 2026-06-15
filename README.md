# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem (TON Network)

Juego de fútbol estilo arcade top-down y plataforma descentralizada de apuestas deportivas optimizada con integración de **Contratos Inteligentes en TON (The Open Network)** para pagos directos en **`USDT`** y ejecución **100% standalone** (Zero Lag en Vercel).

---

## ✨ Características Oficiales de Web3 Implementadas (Mega Update 2026)

1. **⚡ Integración con Contrato Inteligente USDT en TON (`FutmundiBetApp`)**:
   - **Módulo Web3 Independiente (`futmundi-bet.js`)**: Conectado directamente a tu `index.html` principal mediante el botón de la barra superior `[🎲 Apuestas Sports USDT]` (o invocable con `data-open-sports-bet`).
   - **Apuestas Directas en USDT ($10 en adelante)**: El usuario explora el listado de encuentros reales (Mundial 2026, Champions, etc.), escoge su pronóstico e ingresa la cantidad exacta en **dólares / USDT** que desea apostar (con un mínimo estricto de `$10 USDT`).
   - **Depósito y Verificación en el Smart Contract**: Al confirmar, la ventana no recibe ni le descuenta gemas, sino que activa de inmediato un Modal Web3 con código QR y un deep link `ton://transfer/EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs?amount=...&jetton=[UsdtTon]` para realizar el depósito exacto en USDT en la red de TON. Si el usuario intenta poner un monto menor a 10 USDT, el sistema bloquea la orden en el acto.
   - **Ganancias y Liquidación a Balance Principal**: Cuando el partido culmina y el usuario acierta, el ticket liquida a ganador en Supabase DB. El jugador le da a **`[🎁 Reclamar Gemas]`**, donde el sistema convierte su premio en USD a **Gemas retirables** y se las abona directo en su Balance Principal. Ya con ellas, el usuario entra cuando lo desee a su **botón de retiros** para convertirlas a su TON Wallet.

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

## 🛠️ Dirección Oficial del Smart Contract en TON

En el archivo **`futmundi-bet.js`**, en la **línea 10**, ya se encuentra inyectado tu contrato oficial de depósitos USDT:

```javascript
  const TonUsdtContractConfig = {
    // Smart Contract Oficial de Futmundi para depósitos USDT en la red de TON
    contractAddress: "EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs", 
    jettonUsdtAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    rateGemsPerWinUSD: 10 
  };
```
Cada deep link de pago y código QR generado por la aplicación ya tiene programada esta dirección. Por política estricta de blockchain, el sistema no acepta ni procesa órdenes con montos menores a `$10.00 USDT`.

---

## 📁 Estructura Oficial para Subir a GitHub y Vercel

Sube exactamente esta estructura a tu repositorio en GitHub para desplegarlo en Vercel en segundos con rendimiento Web3 supremo:

```text
mi-repositorio-futmundi/
├── index.html                  # Página de arranque o portal de tu plataforma
├── retro-cancha.js             # Motor del juego (bundle standalone con Mega Torneos)
├── retro-cancha.css            # Estilos del juego, modales de neón y HUD
├── futmundi-bet.js             # ⚠️ MÓDULO INDEPENDIENTE DE APUESTAS WEB3 EN USDT
├── futmundi-bet.css            # ⚠️ ESTILOS DEL SPORTSBOOK WEB3
├── integration.js              # Capa de enlace Futmundi (conecta CustomEvents y backend)
├── assets.json                 # Manifiesto de carga de imágenes
├── README.md                   # Este manual técnico
└── generated-assets/           # ⚠️ CARPETA CRÍTICA CON LOS RECURSOS GRÁFICOS
    ├── stadium_backdrop.png    # Fondo del estadio (1920x1080)
    ├── grass_texture.png       # Textura del pasto verde
    ├── goal_net.png            # Red del arco transparente
    ├── player_atlas.png        # Atlas con sprites de jugadores y balón
    └── player_atlas-frames.json# Metadata con coordenadas de sprites
```

**¡El monstruo del deporte descentralizado en TON es Futmundi!** 🏆⚽⚡
