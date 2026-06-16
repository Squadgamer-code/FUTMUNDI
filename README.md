# 🏟️ Retro Cancha 03 - Futmundi Web3 Ecosystem Pro (TON Network)

Plataforma deportiva descentralizada, casa de apuestas y la **Grandiosa Suite de Minijuegos Apaisados Estilo PES / Gameboy Advance** 100% programada desde cero para Vercel y Telegram WebApps.

---

## ✨ El Grandioso Hito: Nuevo Videojuego PES Gameboy Edition

1. **🎮 Nuevo Motor Físico (`futmundi-pes-gameboy.js`)**:
   - Para erradicar de raíz cualquier tipo de parpadeo, recuadro verde o atasco del código heredado de terceros, **he programado desde los cimientos un videojuego de fútbol 100% original y nativo** para Futmundi.
   - **Estética Clásica Console Feel**: La arena se empaqueta en `960x540` en un True Landscape apaisado impecable (`screen.orientation.lock("landscape")`), proyectando gradas oscuras resplandecientes, una imponente bota con líneas de broadcast apaisadas alternadas (`#185a2a` y `#1e6b32`) y dos porterías de postes de oro en los extremos Izquierdo (`X=0`) y Derecho (`X=960`).

2. **⚽ Dinámica de Regate y Disparos Curvos ("PES Banana Bend")**:
   - **Adherencia al Pie**: La física del balón responde de forma hiper realista con bucles de inercia y fricción en el pasto. En cuanto un jugador lo intercepta, este entra en su "zona de control de bota" (`ball.owner = player`), quedándose perfectamente adherido y sin girar alocadamente en el aire.
   - **Roscas Visuales y Partículas**: Al mantener y soltar tu botón `SHOT` (o Espacio), el muñequito despide la pelota a una tremenda velocidad hacia la portería enemiga, adquiriendo una rosca/curva visual en el aire hacia las escuadras y dejando una gloriosa estela de partículas de polvo de estrellas en el césped.
   - **Poession Indicator Light**: En el pasto se estampa continuamente un anillo de color brillante justo sobre la sombra del jugador que mantiene el control. E impone el nombre real de tu **Futbolista NFT** en el HUD superior (`[NEYMAR]`, `[MESSI]`, etc.).

3. **🛡️ Bloqueos Estrictos de Accesos Web3 (`__FM_UNIVERSAL_OPEN_GAME`)**:
   - Nadie puede acceder a Jugar en PvE, PvP o Torneo si no cumple de forma obligatoria con las dos reglas de oro: **A) Billetera de TON conectada** y **B) Un Futbolista NFT en su inventario**.

4. **⌛ Time-Decay Odds Algorithm en el Sportsbook**:
   - Implementado en `futmundi-bet.js`. A medida que los encuentros de la Copa del Mundo en directo se adentran pasados el pitazo de la segunda mitad (`45'`), la cuota de la selección que va ganando se comprime progresivamente hacia `1.02x` o `1.01x`, eliminando por completo cualquier vulnerabilidad comercial. Consumiendo `/fixtures?live=all` sin lag y con persistencia remota garantizada en Supabase DB.

5. **🕒 00:00 UTC Daily Check-in & Auto-Reset de Estamina**:
   - Reloj asíncrono configurado a las 00:00 UTC. Con el majestuoso "Check de Marcaje Web3" (`daily_check.jpg`) embebido al reclamar y auto-restauración de estamina al máximo (`4/4 balones`) para todo tu inventario al llegar a la medianoche UTC.

---

## 📁 Estructura Inmaculada para Subir a GitHub y Vercel

Sube o extrae directamente el contenido de **`FUTMUNDI-PES-GAMEBOY-ULTIMATE-BUILD.zip`** sobre la raíz de tu repositorio en GitHub para compilar en Vercel:

```text
mi-repositorio-futmundi/
├── index (25).html             # Portal Original Web3 (Enlazado a la nueva PES Suite)
├── index-corregido.html        # Portal Web3 Telegram Mini App (Enlazado a la PES Suite)
├── futmundi-pes-gameboy.js     # ⚠️ EL NUEVO E IMPONENTE MOTOR FÍSICO ESTILO PES / GAMEBOY
├── futmundi-pes-gameboy.css    # ⚠️ ESTILOS DEL NUEVO VIDEOJUEGO DE CONSOLA APAISADA
├── futmundi-bet.js             # Módulo de Apuestas Minimalista (API-Football v3)
├── futmundi-bet.css            # Estilos del Sportsbook
├── retro-cancha.js             # Respaldo del minijuego nativo heredado pulido
├── retro-cancha.css            # Estilos visuales bases
├── integration.js              # Capa de comunicación y Puerta Blindada Universal
├── assets.json                 # Mapeo de recursos gráficos
├── README.md                   # Este manual de uso
└── generated-assets/           # ⚠️ ARRASTRAR LA CARPETA COMPLETA AL REPOSITORIO
    ├── daily_check.jpg         # Sello visual de check-in diario
    ├── grass_texture.webp      # Césped WebP
    ├── blue_attacker.webp      # Sprite oficial
    ├── keeper_black.webp       # Portero oficial Pro
    └── ...
```

**¡Tienes en tus manos el producto de videojuegos Web3 y apuestas más monstruoso, fluido y hermoso de Web3 en TON!** 🏆⚽⚡
