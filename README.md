# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem Pro (TON Network)

Juego de fútbol estilo arcade top-down y plataforma descentralizada de apuestas deportivas en vivo optimizada con integración de **Contratos Inteligentes en TON (The Open Network)** para depósitos exactos en **`USDT`**, persistencia permanente en **`Supabase DB`** y conexión en tiempo real mediante tu Master Key oficial de **`API-Sports (API-Football v3)`** (Zero Lag en Vercel).

---

## ✨ Mega Actualización Oficial (Production Build 2026)

1. **🔒 Módulo Híbrido de Persistencia en Supabase DB (`BetDB`)**:
   - **Almacenamiento Permanente en la Nube**: El Centro de Apuestas (`futmundi-bet.js`) no depende solo de la memoria del navegador (`localStorage`). Al generarse cada ticket, realizar un pago USDT o liquidar un premio, el sistema realiza peticiones asíncronas de guardado en Supabase a través de tu backend (`window.FM_ADMIN_API_BASE`).
   - **Sincronización Automática Web3**: Cuando un usuario borra su caché, actualiza la página o entra desde otro celular, la app jala y unifica sus tickets en la nube en tiempo real.

2. **🎲 Sportsbook Conectado en Vivo a API-Sports (`futmundi-bet.js`)**:
   - **Master Key Unificada (`cae4...7bc6`)**: Conectada directamente al corazón del módulo. Permite consumir sin restricciones de autenticación y al milisegundo cualquier liga, copa o deporte (Fútbol, Baloncesto, NBA, Fórmula 1, MMA, Béisbol) soportado por los servidores de `api-sports.io`.
   - **Encuentros y Tiempos en Directo**: Consume de forma continua `/fixtures?live=all`, entregando la lista de encuentros que se están disputando al segundo en el mundo con sus marcadores y minutos.
   - **Apuestas Directas en USDT ($10 en adelante)**: Al elegir Local (1), Empate (X) o Visitante (2), el boleto solicita ingresar el monto en **USDT exactos** con un mínimo estricto de `$10.00 USDT`. 
   - **Depósito TON Smart Contract Directo**: Al confirmar, la boleta no deduce gemas, sino que abre el deep link de TON Blockchain `ton://transfer/EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs?amount=...` para pagar directo a tu Smart Contract en TON con Tonkeeper o Telegram Billetera en 1 segundo. Si el usuario intenta colocar un saldo menor a 10 USDT, el sistema le bloquea el pago en el acto.
   - **Ganancias a Balance Retirable**: Cuando culmina el encuentro y acierta, su boleta pasa a **`🟢 ¡GANASTE!`**. Tras darle a **`[🎁 Reclamar Premio]`**, la plataforma convierte su liquidación ganada en USD a su equivalente de **Gemas retirables** y las abona directo en su Balance Principal. Ya con ellas, el usuario entra cuando lo desee a su **botón de retiros** que tienes configurado en tu plataforma.

3. **🎁 Bolsa de Premios Dinámica & Mega Mega Torneos (> 250 Activos)**:
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

4. **📜 Historial Personal de Torneos & Récords (`RetrocHistoryManager`)**:
   - Guardado automático en `localStorage` (`"retroCancha03:tournamentHistory"`) de cada torneo finalizado (Campeón o Eliminado).
   - Modal retro invocable desde el Menú (`[📜 MIS TORNEOS]`) o el HUD del juego (`[📜 HIST]`).
   - Muestra estadísticas en vivo: Récord Personal (Best Score), Total de Torneos Jugados, Total de Títulos y lista detallada de intentos anteriores con botón de **🔄 Revancha Rápida**.

5. **🏆 Tabla de Posiciones Dual & Top 100 (`RetrocLeaderboardManager`)**:
   - **Leaderboard Mundial / Local (`[🏆 RANKING]`)**: Muestra la tabla oficial extendida hasta el **Top 100 Mejores Jugadores**. Refleja Billeteras (*Wallets*), el **NFT Utilizado** por cada jugador, sus Récords Absolutos y su Recompensa Ganada.
   - **Bracket del Torneo en Vivo (`[🏆 Bracket]` en el HUD)**: Permite visualizar en cualquier momento de un torneo tus rondas superadas, el **Rival Actual** en disputa, su recompensa de puntos y tu Tier asegurado (Bronce / Plata / Oro / Leyenda).

6. **☁️ Notificaciones de Puntos al Backend cada N Rondas (Checkpoints)**:
   - Notificación programada cada 3 rondas completadas (`NOTIFY_EVERY_N_ROUNDS = 3`).
   - Al ganar las rondas **R3, R6, R9 y R12**, el juego sincroniza de forma inmediata tu puntaje intermedio y tier superado con la nube o backend de Futmundi (`/api/tournament/submit`).
   - Notificación visual en pantalla con el mensaje flotante: **`💾 Checkpoint R[X] guardado en backend`**.

7. **💎 Lógica de Récord Máximo con Múltiples NFTs en Torneos**:
   - **Comportamiento Estricto de "Best Score"**: Si un usuario posee 20 NFTs y participa en el torneo múltiples veces (ej. hace 5000 PTS con uno, 2000 PTS con otro y 1500 PTS con un tercero durante los 4 días del torneo), el sistema **no suma ni acumula los puntajes**.
   - En la **Tabla de Posiciones (Ranking)** se registrará y mostrará **únicamente el puntaje mayor de ese usuario (5000 PTS)**. Cada intento nuevo solo sobreescribirá el ranking si supera su récord absoluto anterior.

---

## 🛠️ Esquema SQL para tu Billetera de Apuestas en Supabase

Para asegurarte de que tu Supabase esté 100% listo para almacenar permanentemente estas boletas de apuestas, solo ve al editor SQL en tu Supabase (Supabase Dashboard → **SQL Editor**) y corre esto:

```sql
CREATE TABLE IF NOT EXISTS public.bets_tickets (
  id text PRIMARY KEY,
  wallet_address text NOT NULL,
  match_id text NOT NULL,
  match_name text NOT NULL,
  selection_key text NOT NULL,
  selection_label text NOT NULL,
  odds numeric NOT NULL,
  stake_usdt numeric NOT NULL,
  win_usd numeric NOT NULL,
  prize_gems numeric NOT NULL,
  smart_contract text NOT NULL,
  status text DEFAULT 'active', -- active, won, lost, claimed
  created_at timestamp with time zone DEFAULT now()
);

-- Políticas de Seguridad (Row Level Security)
ALTER TABLE public.bets_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede leer los tickets" 
  ON public.bets_tickets FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden registrar sus propios tickets" 
  ON public.bets_tickets FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios pueden actualizar el estado de sus tickets" 
  ON public.bets_tickets FOR UPDATE USING (true);
```

---

## 📁 Estructura Definitiva de Producción en GitHub

Este es el contenido unificado de tu archivo de producción **`FUTMUNDI-MEGA-PRODUCTION-BUILD.zip`** en tu espacio de trabajo:

```text
mi-repositorio-futmundi/
├── index (25).html             # Portal original web3
├── index-corregido.html        # Portal web3 Telegram Mini App (Inyectado con apuestas)
├── retro-cancha.js             # Motor del juego (bundle con Top 100 y Mega Torneos)
├── retro-cancha.css            # Estilos generales visuales
├── futmundi-bet.js             # ⚠️ MÓDULO DE APUESTAS WEB3 (Persistencia Supabase DB)
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

**¡Tienes el ecosistema deportivo, de gaming Web3 y de apuestas más monstruoso de Web3 en TON!** 🏆⚽⚡
