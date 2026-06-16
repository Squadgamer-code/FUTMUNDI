/* ==========================================================================
   FUTMUNDI PES / GAMEBOY ADVANCE EDITION - TRUE APAISADO ENGINE
   Videojuego de Consola Clásica 100% Desarrollado desde Cero para Futmundi
   ========================================================================== */

(function () {
  if (window.__fm_pes_gameboy_installed) return;
  window.__fm_pes_gameboy_installed = true;

  // --- BASE DE EQUIPOS Y RIVALES DEL MUNDO PARA EL MODO TORNEO Y PARTIDOS ---
  const TEAMS_DATABASE = [
    { name: "Curdo FC", tier: "Bronce", aiAggression: 1.1, color: "#8e8e8e", rewardGems: 15, rewardPts: 120 },
    { name: "River Pinto", tier: "Bronce", aiAggression: 1.2, color: "#e04545", rewardGems: 20, rewardPts: 140 },
    { name: "Boca Juniors", tier: "Bronce", aiAggression: 1.3, color: "#1e63d6", rewardGems: 25, rewardPts: 160 },
    { name: "Atlas Tijuana", tier: "Bronce", aiAggression: 1.4, color: "#c3423f", rewardGems: 30, rewardPts: 180 },
    { name: "Real Mandril", tier: "Bronce", aiAggression: 1.5, color: "#f5f5f5", rewardGems: 35, rewardPts: 200 },
    { name: "Atleti Nuccia", tier: "Plata", aiAggression: 1.6, color: "#9c4137", rewardGems: 45, rewardPts: 260 },
    { name: "Bayern München", tier: "Plata", aiAggression: 1.7, color: "#c20e1a", rewardGems: 55, rewardPts: 320 },
    { name: "Paris SG", tier: "Plata", aiAggression: 1.8, color: "#004170", rewardGems: 65, rewardPts: 380 },
    { name: "Liverpool FC", tier: "Plata", aiAggression: 1.9, color: "#c8102e", rewardGems: 75, rewardPts: 440 },
    { name: "Man City", tier: "Plata", aiAggression: 2.0, color: "#6cabdd", rewardGems: 85, rewardPts: 500 },
    { name: "Juventus", tier: "Oro", aiAggression: 2.1, color: "#000000", rewardGems: 100, rewardPts: 600 },
    { name: "FC Barcelona", tier: "Oro", aiAggression: 2.2, color: "#a50044", rewardGems: 120, rewardPts: 700 },
    { name: "Real Madrid", tier: "Oro", aiAggression: 2.3, color: "#fcbf00", rewardGems: 150, rewardPts: 800 },
    { name: "Inter de Miami", tier: "Leyenda", aiAggression: 2.5, color: "#ff6f61", rewardGems: 200, rewardPts: 1000 },
    { name: "Man United", tier: "Leyenda", aiAggression: 2.7, color: "#da291c", rewardGems: 300, rewardPts: 2500 }
  ];

  // --- MOTOR DE AUDIO NATIVO DE CONSOLA DE RECUERDOS ---
  class PesAudioEngine {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(()=>{});
      }
    }
    playTone(freq, type, duration, vol) {
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch {}
    }
    playKick() { this.playTone(180, "triangle", 0.08, 0.15); }
    playPass() { this.playTone(320, "sine", 0.06, 0.1); }
    playPost() { this.playTone(450, "square", 0.1, 0.2); }
    playGoal() {
      this.playTone(440, "square", 0.1, 0.2);
      setTimeout(() => this.playTone(554, "triangle", 0.12, 0.22), 100);
      setTimeout(() => this.playTone(659, "triangle", 0.25, 0.25), 220);
    }
    playWhistle() {
      this.playTone(880, "sine", 0.2, 0.3);
      setTimeout(() => this.playTone(920, "sine", 0.3, 0.3), 150);
    }
  }

  // --- EL SÚPER VIDEOJUEGO APAISADO NATIVO HORIZONTAL ---
  class FutmundiPesGameApp {
    constructor(mountEl, gameMode, detailCallbacks) {
      this.mountEl = mountEl;
      this.mode = gameMode; // "pve", "pvp", or "tournament"
      this.onMatchEndCallback = detailCallbacks.onMatchEnd || null;

      // Obtener el Futbolista NFT del usuario
      const playerObj = typeof window.getSelectedPlayer === "function" ? window.getSelectedPlayer() : null;
      this.myNftName = playerObj ? playerObj.name : localStorage.getItem("fm_selected_player_name") || "NEYMAR NFT";

      // Configuración en vivo del oponente
      this.tournamentOpponentIdx = 0;
      this.currentOpponent = this.mode === "tournament" ? TEAMS_DATABASE[0] : { name: "IA Élite Sports", tier: "Pro", aiAggression: 1.3, color: "#e04545", rewardGems: 25, rewardPts: 150 };

      // Opciones de partida
      this.matchLengthSeconds = 90; // 90 segundos clásicos
      this.gameSpeed = 1.0;

      // Matriz de RAM Apaisada Nativa
      this.canvasW = 960;
      this.canvasH = 540;
      this.audio = new PesAudioEngine();
      this.unsubscribers = [];
      this.raf = null;
      this.running = false;

      // Variables de control y dinámicas
      this.stickVector = { x: 0, y: 0, active: false };
      this.keys = new Set();
      this.shotCharge = 0;
      this.isChargingShot = false;
      this.screenShake = 0;
      this.particles = [];
      this.messageText = "¡COMIENZA EL PARTIDO!";
      this.messageTimer = 1.8;

      // Estados de juego
      this.started = false;
      this.matchOver = false;
      this.timeLeft = this.matchLengthSeconds;
      this.myGoals = 0;
      this.rivalGoals = 0;
      this.pointsEarned = 0;
      this.gemsEarned = 0;

      // Creación de personajes y entidades físicas en la cancha HORIZONTAL apaisada
      this.initWorldEntities();
      this.injectUniversalUi();
      this.initInputControllers();

      // Bloquear pantalla en Landscape de inmediato
      try {
        if(screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(() => {});
        }
      } catch {}

      // Arrancar motor
      this.running = true;
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame((now) => this.gameLoop(now));
    }

    initWorldEntities() {
      // La cancha 16:9 va de X=0 a X=960 (Largo) y Y=0 a Y=540 (Ancho). 
      // Arcos a Izquierda (X=0) y Derecha (X=960).

      this.ball = {
        x: this.canvasW / 2,
        y: this.canvasH / 2,
        vx: 0,
        vy: 0,
        radius: 12,
        owner: null,
        curve: 0 // rosca visual banana bend
      };

      // Catálogo de Jugadores: Mi Equipo (Azul) ataca de Izquierda a Derecha (Hacia X=960)
      this.myTeam = [
        { id: "my_p1", name: this.myNftName, x: 380, y: 270, vx: 0, vy: 0, speed: 5.2, isControlled: true, team: "blue", color: "#ffe871" },
        { id: "my_p2", name: "Compañero Pro", x: 260, y: 140, vx: 0, vy: 0, speed: 4.6, isControlled: false, team: "blue", color: "#ffe871" },
        { id: "my_p3", name: "Compañero Tact", x: 260, y: 400, vx: 0, vy: 0, speed: 4.6, isControlled: false, team: "blue", color: "#ffe871" },
        { id: "my_keeper", name: "Portero Oficial", x: 60, y: 270, vx: 0, vy: 0, speed: 3.8, isControlled: false, team: "blue", isKeeper: true, color: "#39ff88" }
      ];

      // Equipo Rival (Rojo) ataca de Derecha a Izquierda (Hacia X=0)
      const rCol = this.currentOpponent.color;
      this.rivalTeam = [
        { id: "riv_p1", name: this.currentOpponent.name, x: 580, y: 270, vx: 0, vy: 0, speed: 4.5 * this.currentOpponent.aiAggression, isControlled: false, team: "red", color: rCol },
        { id: "riv_p2", name: "Rival Def 1", x: 700, y: 160, vx: 0, vy: 0, speed: 4.2 * this.currentOpponent.aiAggression, isControlled: false, team: "red", color: rCol },
        { id: "riv_p3", name: "Rival Def 2", x: 700, y: 380, vx: 0, vy: 0, speed: 4.2 * this.currentOpponent.aiAggression, isControlled: false, team: "red", color: rCol },
        { id: "riv_keeper", name: "Rival Keeper", x: 900, y: 270, vx: 0, vy: 0, speed: 4.0, isControlled: false, team: "red", isKeeper: true, color: "#ff4545" }
      ];

      this.activeMyPlayerEl = this.myTeam[0];
    }

    injectUniversalUi() {
      // Inyectamos todo el Markup de Broadcast y joysticks en el mountEl
      const stageCont = document.createElement("div");
      stageCont.className = "pes-soccer-stage";

      const canv = document.createElement("canvas");
      canv.className = "pes-game-canvas";
      canv.width = this.canvasW;
      canv.height = this.canvasH;
      this.canvasEl = canv;
      this.ctx = canv.getContext("2d");

      // HUD Markup
      const hudCont = document.createElement("div");
      hudCont.className = "pes-hud-bar";
      hudCont.innerHTML = `
        <div class="pes-hud-badge">
          <span class="pes-hud-team blue">${this.myNftName.toUpperCase()}</span>
          <span class="pes-hud-goals" id="pes-my-goals-txt">0</span>
        </div>

        <div class="pes-hud-timer">
          <span>⌚</span>
          <strong id="pes-match-timer-txt">1:30</strong>
        </div>

        <div class="pes-hud-badge">
          <span class="pes-hud-goals" id="pes-rival-goals-txt">0</span>
          <span class="pes-hud-team red" id="pes-rival-name-txt">${this.currentOpponent.name.toUpperCase()}</span>
        </div>

        <div class="pes-hud-pts">
          <span>🏆</span>
          <strong id="pes-earned-pts-txt">0 PTS</strong>
        </div>
      `;

      // Touch Markup
      const touchCont = document.createElement("div");
      touchCont.className = "pes-touch-controls";
      touchCont.innerHTML = `
        <div class="pes-joystick-base" id="pes-touch-joystick-cont">
          <div class="pes-joystick-knob" id="pes-touch-knob"></div>
        </div>

        <div class="pes-actions-cluster">
          <div class="pes-btn-arcade pes-btn-pass" id="pes-action-pass-btn">PASS</div>
          <div class="pes-btn-arcade pes-btn-shot" id="pes-action-shot-btn">SHOT</div>
        </div>
      `;

      // Botón de Volver a Plataforma
      const closeEl = document.createElement("button");
      closeEl.className = "pes-game-close-btn";
      closeEl.innerHTML = "✕ VOLVER A FUTMUNDI";
      closeEl.onclick = () => this.destroyMatch();

      // Recuadro Inmersivo Central (Para iniciar o revanchas)
      const centerCont = document.createElement("div");
      centerCont.className = "pes-center-message-panel";
      centerCont.id = "pes-center-modal";
      centerCont.innerHTML = `
        <h3 class="pes-panel-title" id="pes-modal-headline">🕹️ MODO ${this.mode.toUpperCase()} APAISADO</h3>
        <p class="pes-panel-subtitle" id="pes-modal-sub">Rival: ${this.currentOpponent.name} (${this.currentOpponent.tier})</p>
        <div class="pes-panel-score" id="pes-modal-bigscore">⚽</div>
        <button class="pes-panel-cta-btn" type="button" id="pes-modal-launch-btn">ENTRAR A JUGAR FÍSICO DIRECTO ✔</button>
      `;
      this.centerModalEl = centerCont;

      stageCont.appendChild(canv);
      stageCont.appendChild(hudCont);
      stageCont.appendChild(touchCont);
      stageCont.appendChild(closeEl);
      stageCont.appendChild(centerCont);

      this.mountEl.replaceChildren(stageCont);

      // Referencias de Elementos de UI
      this.ui = {
        myGoalsTxt: stageCont.querySelector("#pes-my-goals-txt"),
        rivalGoalsTxt: stageCont.querySelector("#pes-rival-goals-txt"),
        timerTxt: stageCont.querySelector("#pes-match-timer-txt"),
        ptsTxt: stageCont.querySelector("#pes-earned-pts-txt"),
        rivalNameTxt: stageCont.querySelector("#pes-rival-name-txt"),
        touchBase: stageCont.querySelector("#pes-touch-joystick-cont"),
        touchKnob: stageCont.querySelector("#pes-touch-knob"),
        passBtn: stageCont.querySelector("#pes-action-pass-btn"),
        shotBtn: stageCont.querySelector("#pes-action-shot-btn"),
        modalHeadline: stageCont.querySelector("#pes-modal-headline"),
        modalSub: stageCont.querySelector("#pes-modal-sub"),
        modalBigScore: stageCont.querySelector("#pes-modal-bigscore"),
        modalLaunchBtn: stageCont.querySelector("#pes-modal-launch-btn")
      };
    }

    initInputControllers() {
      this.audio.init();

      // Evento de Iniciar en el modal
      if (this.ui.modalLaunchBtn) {
        this.ui.modalLaunchBtn.onclick = (e) => {
          e.stopPropagation();
          this.audio.playWhistle();
          this.centerModalEl.hidden = true;
          this.started = true;
          this.matchOver = false;
          this.messageText = "¡COMIENZA EL PARTIDO!";
          this.messageTimer = 1.5;
        };
      }

      // Conexión del Joystick Táctil de Extrema Firmeza ("True Snappy Controller")
      let pointerId = null;
      if (this.ui.touchBase) {
        this.ui.touchBase.addEventListener("pointerdown", (e) => {
          pointerId = e.pointerId;
          this.ui.touchBase.setPointerCapture(pointerId);
          this.handleJoystickMove(e);
        });
        this.ui.touchBase.addEventListener("pointermove", (e) => {
          if (e.pointerId === pointerId) this.handleJoystickMove(e);
        });
        const endJoy = (e) => {
          if (e.pointerId === pointerId) {
            pointerId = null;
            this.stickVector = { x: 0, y: 0, active: false };
            if (this.ui.touchKnob) this.ui.touchKnob.style.transform = "none";
          }
        };
        this.ui.touchBase.addEventListener("pointerup", endJoy);
        this.ui.touchBase.addEventListener("pointercancel", endJoy);
      }

      // Eventos Táctiles en PASS y SHOT
      if (this.ui.passBtn) {
        this.ui.passBtn.addEventListener("pointerdown", (e) => {
          e.preventDefault(); e.stopPropagation();
          this.audio.playPass();
          this.executePass();
        });
      }
      if (this.ui.shotBtn) {
        this.ui.shotBtn.addEventListener("pointerdown", (e) => {
          e.preventDefault(); e.stopPropagation();
          this.isChargingShot = true;
        });
        const endShot = (e) => {
          e.preventDefault(); e.stopPropagation();
          if (this.isChargingShot) {
            this.isChargingShot = false;
            this.audio.playKick();
            this.executePowerfulShot();
          }
        };
        this.ui.shotBtn.addEventListener("pointerup", endShot);
        this.ui.shotBtn.addEventListener("pointerleave", endShot);
      }

      // Conexión Teclado de Respaldo
      this.onKeyDown = (e) => {
        const k = e.key.toLowerCase();
        this.keys.add(k);
        if (k === " ") { e.preventDefault(); this.isChargingShot = true; }
        if (k === "k") { e.preventDefault(); this.audio.playPass(); this.executePass(); }
        if (k === "enter" && !this.started) { this.ui.modalLaunchBtn?.click(); }
      };
      this.onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        this.keys.delete(k);
        if (k === " " && this.isChargingShot) {
          e.preventDefault();
          this.isChargingShot = false;
          this.audio.playKick();
          this.executePowerfulShot();
        }
      };

      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
    }

    handleJoystickMove(e) {
      e.preventDefault();
      const rect = this.ui.touchBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const maxR = rect.width * 0.35;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      
      const rad = Math.min(dist, maxR);
      // Vector directo a 1 firme ("Ultra Snappy")
      this.stickVector = {
        x: Math.cos(angle),
        y: Math.sin(angle),
        active: true
      };

      if (this.ui.touchKnob) {
        this.ui.touchKnob.style.transform = `translate(${Math.cos(angle) * rad}px, ${Math.sin(angle) * rad}px)`;
      }
    }

    // --- ACCIONES DE JUEGO (PASES, TIROS, IA Y FÍSICAS DE BALÓN) ---
    executePass() {
      if (this.ball.owner !== this.activeMyPlayerEl) return;
      this.ball.owner = null;
      // Buscamos el compañero más cercano
      const pAct = this.activeMyPlayerEl;
      let mates = this.myTeam.filter(p => !p.isKeeper && p !== pAct);
      let targetMate = mates[0];
      let bestDist = 9999;
      mates.forEach(m => {
        const d = Math.hypot(m.x - pAct.x, m.y - pAct.y);
        if (d < bestDist) { bestDist = d; targetMate = m; }
      });
      
      if (!targetMate) targetMate = { x: 800, y: pAct.y };

      const angle = Math.atan2(targetMate.y - pAct.y, targetMate.x - pAct.x);
      this.ball.vx = Math.cos(angle) * 16;
      this.ball.vy = Math.sin(angle) * 16;
      this.ball.x += Math.cos(angle) * 12;
      this.ball.y += Math.sin(angle) * 12;

      // Cambiamos el jugador activo al receptor
      if (targetMate && targetMate.team === "blue") {
        this.myTeam.forEach(p => p.isControlled = false);
        targetMate.isControlled = true;
        this.activeMyPlayerEl = targetMate;
      }

      this.spawnKickParticles(pAct.x, pAct.y, "#ffe871", 10);
    }

    executePowerfulShot() {
      if (this.ball.owner !== this.activeMyPlayerEl) return;
      this.ball.owner = null;
      const pAct = this.activeMyPlayerEl;

      // Tiro teledirigido y curvo ("PES Banana Misil") hacia el arco rival (X=960)
      const targetY = 270 + (Math.random() - 0.5) * 120; // Hacia las esquinas o centro de la portería
      const angle = Math.atan2(targetY - pAct.y, 960 - pAct.x);
      
      const shotPower = 20 + this.shotCharge * 15;
      this.ball.vx = Math.cos(angle) * shotPower;
      this.ball.vy = Math.sin(angle) * shotPower;
      this.ball.curve = (Math.random() - 0.5) * 4; // Rosca en el aire
      this.ball.x += Math.cos(angle) * 15;
      this.ball.y += Math.sin(angle) * 15;

      this.shotCharge = 0;
      this.screenShake = 12;
      this.spawnKickParticles(pAct.x, pAct.y, "#ff8a3c", 20);
    }

    spawnKickParticles(x, y, color, count) {
      for(let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 8;
        this.particles.push({
          x: x, y: y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          color: color, radius: 2 + Math.random() * 3,
          life: 1.0, maxLife: 1.0
        });
      }
    }

    // --- EL BUCLE MATEMÁTICO PRINCIPAL (GAME LOOP) ---
    gameLoop(now) {
      if (!this.running) return;
      const delta = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
      this.lastTime = now;

      if (this.started && !this.matchOver) {
        this.updateWorldPhysics(delta);
      }

      this.updateVisualEffects(delta);
      this.renderPureLandscapeSoccerMatrix();
      this.updateStatusUi();

      this.raf = requestAnimationFrame((nextNow) => this.gameLoop(nextNow));
    }

    updateWorldPhysics(delta) {
      // 1. Temporizador
      this.timeLeft = Math.max(0, this.timeLeft - delta);
      if (this.timeLeft <= 0 && !this.matchOver) {
        this.triggerMatchResolution();
        return;
      }

      // 2. Control de Mi Futbolista Activo (WASD / Joysitck apaisado)
      const myP = this.activeMyPlayerEl;
      if (myP && this.ball.owner !== myP) {
        let mx = 0; let my = 0;
        if (this.stickVector.active) { mx += this.stickVector.x; my += this.stickVector.y; }
        if (this.keys.has("w") || this.keys.has("arrowup")) my -= 1;
        if (this.keys.has("s") || this.keys.has("arrowdown")) my += 1;
        if (this.keys.has("a") || this.keys.has("arrowleft")) mx -= 1;
        if (this.keys.has("d") || this.keys.has("arrowright")) mx += 1;

        if (mx !== 0 || my !== 0) {
          const ang = Math.atan2(my, mx);
          myP.x += Math.cos(ang) * myP.speed;
          myP.y += Math.sin(ang) * myP.speed;
        }

        // Límites de arena apaisada
        myP.x = Math.max(20, Math.min(this.canvasW - 20, myP.x));
        myP.y = Math.max(20, Math.min(this.canvasH - 20, myP.y));
      }

      // 3. IA de Mis Compañeros
      this.myTeam.forEach(p => {
        if (!p.isControlled && !p.isKeeper) {
          // Si tu amigo NFT posee el balón o ataca, los compañeros corren a ponerse en posición de pase
          const targX = this.ball.x < 480 ? 450 : 780;
          p.x += (targX - p.x) * delta * 1.5;
        }
      });

      // 4. IA Realista y Desafiante del Oponente
      const ballObj = this.ball;
      this.rivalTeam.forEach(riv => {
        if (!riv.isKeeper) {
          // Persecución veloz hacia donde esté la pelota
          const ang = Math.atan2(ballObj.y - riv.y, ballObj.x - riv.x);
          const aiDist = Math.hypot(ballObj.x - riv.x, ballObj.y - riv.y);
          
          if (aiDist > 15) {
            riv.x += Math.cos(ang) * riv.speed;
            riv.y += Math.sin(ang) * riv.speed;
          }

          // Si el rival alcanza el balón y lo roba
          if (aiDist < 20 && ballObj.owner !== riv) {
            ballObj.owner = riv;
            // El rival roba y patea de inmediato o avanza hacia mi arco (X=0)
            if (riv.x < 300 || Math.random() < 0.08) {
              ballObj.owner = null;
              const targetMyGoalY = 270 + (Math.random() - 0.5) * 80;
              const shotAng = Math.atan2(targetMyGoalY - riv.y, 0 - riv.x);
              ballObj.vx = Math.cos(shotAng) * 16;
              ballObj.vy = Math.sin(shotAng) * 16;
              this.audio.playKick();
            }
          }
        }
      });

      // 5. IA de los dos Porteros
      const myK = this.myTeam.find(k => k.isKeeper);
      if (myK) myK.y += (Math.max(180, Math.min(360, ballObj.y)) - myK.y) * delta * 4;

      const rivK = this.rivalTeam.find(k => k.isKeeper);
      if (rivK) rivK.y += (Math.max(180, Math.min(360, ballObj.y)) - rivK.y) * delta * 4;

      // 6. Físicas de la Pelota Inmaculada
      if (ballObj.owner) {
        // En posesión, acompaña exactamente adherida al pie del dueño
        ballObj.x = ballObj.owner.x + (ballObj.owner.team === "blue" ? 14 : -14);
        ballObj.y = ballObj.owner.y + 10;
        ballObj.vx = 0; ballObj.vy = 0;
      } else {
        // En rodado
        ballObj.x += ballObj.vx;
        ballObj.y += ballObj.vy;
        ballObj.vy += ballObj.curve; // rosca visual en vuelo
        ballObj.vx *= 0.985; // Fricción realista del césped
        ballObj.vy *= 0.985;
        ballObj.curve *= 0.95;

        // Rebotes contra líneas de banda
        if (ballObj.y < 18) { ballObj.y = 18; ballObj.vy *= -1; this.audio.playPost(); }
        if (ballObj.y > this.canvasH - 18) { ballObj.y = this.canvasH - 18; ballObj.vy *= -1; this.audio.playPost(); }

        // Chequeo de Goles en Porterías Izquierda (X=0) y Derecha (X=960)
        // Arco Izquierdo (Mi Arco, de X < 30 y Y entre 180 y 360)
        if (ballObj.x < 30) {
          if (ballObj.y >= 180 && ballObj.y <= 360) {
            // ¡Gol Rival!
            this.rivalGoals += 1;
            this.handleGoalScored("red", "¡GOL DE " + this.currentOpponent.name.toUpperCase() + "!");
          } else {
            // Saque de arco / rebote
            ballObj.x = 30; ballObj.vx *= -1;
            this.audio.playPost();
          }
        }

        // Arco Derecho (Arco Rival, de X > 930 y Y entre 180 y 360)
        if (ballObj.x > this.canvasW - 30) {
          if (ballObj.y >= 180 && ballObj.y <= 360) {
            // ¡Gol Mío!
            this.myGoals += 1;
            this.pointsEarned += 10;
            this.handleGoalScored("blue", "¡GOLAZO DE " + this.myNftName.toUpperCase() + "!");
          } else {
            ballObj.x = this.canvasW - 30; ballObj.vx *= -1;
            this.audio.playPost();
          }
        }

        // Interceptación de Balón por los Futbolistas
        [...this.myTeam, ...this.rivalTeam].forEach(player => {
          if (!ballObj.owner && Math.hypot(ballObj.x - player.x, ballObj.y - player.y) < 22) {
            ballObj.owner = player;
            if (player.team === "blue" && !player.isKeeper) {
              this.myTeam.forEach(p => p.isControlled = false);
              player.isControlled = true;
              this.activeMyPlayerEl = player;
            }
          }
        });
      }

      // 7. Carga de Disparo
      if (this.isChargingShot) {
        this.shotCharge = Math.min(1.0, this.shotCharge + delta * 1.5);
      }
    }

    handleGoalScored(team, toastMsg) {
      this.audio.playGoal();
      this.screenShake = 20;
      this.messageText = toastMsg;
      this.messageTimer = 2.5;
      this.spawnKickParticles(team === "blue" ? 930 : 30, 270, team === "blue" ? "#3fbfff" : "#ff4545", 50);

      // Reiniciamos al centro tras 2 segundos
      setTimeout(() => {
        this.ball = { x: this.canvasW / 2, y: this.canvasH / 2, vx: 0, vy: 0, radius: 12, owner: null, curve: 0 };
        this.myTeam[0].x = 380; this.myTeam[0].y = 270;
        this.rivalTeam[0].x = 580; this.rivalTeam[0].y = 270;
      }, 2000);
    }

    triggerMatchResolution() {
      this.matchOver = true;
      this.started = false;
      this.audio.playWhistle();

      const isWin = this.myGoals > this.rivalGoals;
      const isDraw = this.myGoals === this.rivalGoals;
      const matchStatusStr = isWin ? "Victoria" : isDraw ? "Empate" : "Derrota";
      const finalScoreStr = `${this.myGoals} - ${this.rivalGoals}`;

      // Calculamos recompensas
      let rewardGemsWon = isWin ? this.currentOpponent.rewardGems || 25 : isDraw ? 5 : 0;
      let rewardPtsWon = isWin ? this.currentOpponent.rewardPts || 150 : isDraw ? 30 : 0;

      // Si es torneo, actualizamos racha
      if (this.mode === "tournament") {
        if (isWin || isDraw) {
          this.tournamentOpponentIdx += 1;
          if (this.tournamentOpponentIdx >= TEAMS_DATABASE.length) {
            // ¡CAMPEÓN DEL TORNEO!
            rewardGemsWon += 500;
            rewardPtsWon += 5000;
            this.showMatchEndScreen("🏆 ¡CAMPEÓN MUNDIAL DE FUTMUNDI!", `¡Derrotaste a todos los rivales de la copa! +${rewardGemsWon} GEMAS`);
            this.emitBlockchainResult("Victoria", finalScoreStr, rewardGemsWon, rewardPtsWon, true);
            return;
          }
          const nextRivalObj = TEAMS_DATABASE[this.tournamentOpponentIdx];
          this.currentOpponent = nextRivalObj;
          this.showMatchEndScreen(`¡${matchStatusStr}! Clasificas a Ronda ${this.tournamentOpponentIdx + 1}/15`, `Siguiente Rival: ${nextRivalObj.name} (${nextRivalObj.tier})`);
          this.emitBlockchainResult(matchStatusStr, finalScoreStr, rewardGemsWon, rewardPtsWon, false);
        } else {
          // Eliminado
          this.showMatchEndScreen("💥 ELIMINADO DEL TORNEO", `Caíste ante ${this.currentOpponent.name}. Rondas logradas: ${this.tournamentOpponentIdx}/15`);
          this.emitBlockchainResult("Derrota", finalScoreStr, 0, 10, true);
        }
      } else {
        // Amistoso o PvP normal
        this.showMatchEndScreen(`⚽ ${matchStatusStr} en el ${this.mode === 'pvp' ? 'Estadio' : 'Cancha'}`, `Marcador Final: ${finalScoreStr} → Premio: 💎 +${rewardGemsWon} Gemas`);
        this.emitBlockchainResult(matchStatusStr, finalScoreStr, rewardGemsWon, rewardPtsWon, true);
      }
    }

    showMatchEndScreen(headline, copyText) {
      if (!this.centerModalEl) return;
      if (this.ui.modalHeadline) this.ui.modalHeadline.textContent = headline;
      if (this.ui.modalSub) this.ui.modalSub.textContent = copyText;
      if (this.ui.modalBigScore) this.ui.modalBigScore.textContent = `${this.myGoals} - ${this.rivalGoals}`;
      if (this.ui.modalLaunchBtn) {
        this.ui.modalLaunchBtn.textContent = this.mode === "tournament" && !this.matchOver ? "DISPUTAR SIGUIENTE RONDA ✔" : "🔄 JUGAR NUEVO PARTIDO ✔";
      }
      this.centerModalEl.hidden = false;
    }

    emitBlockchainResult(resStr, scoreStr, gemsCount, ptsCount, isFinalMatch) {
      const matchDetailObj = {
        mode: this.mode,
        result: resStr,
        score: scoreStr,
        gemsDelta: gemsCount,
        pointsDelta: ptsCount,
        points: ptsCount,
        tournament: this.mode === "tournament" ? {
          round: this.tournamentOpponentIdx,
          champion: isFinalMatch && resStr === "Victoria",
          eliminated: isFinalMatch && resStr === "Derrota",
          highestTier: this.currentOpponent.tier,
          finalScore: ptsCount
        } : null
      };

      try {
        if (typeof this.onMatchEndCallback === "function") this.onMatchEndCallback(matchDetailObj);
        window.dispatchEvent(new CustomEvent("futmundi:gameplay_match_ended", { detail: matchDetailObj }));
        
        // Sumamos las gemas al balance general en disco
        if (gemsCount > 0 && typeof BetDB !== "undefined" && BetDB.addGems) {
          BetDB.addGems(gemsCount);
        }
      } catch {}
    }

    updateVisualEffects(delta) {
      this.screenShake = Math.max(0, this.screenShake - delta * 20);
      this.messageTimer = Math.max(0, this.messageTimer - delta);

      this.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.life -= delta;
      });
      this.particles = this.particles.filter(p => p.life > 0);
    }

    // --- RENDERIZACIÓN APAISADA DE ARTE DE CONSOLA ESTILO PES / GAMEBOY ---
    renderPureLandscapeSoccerMatrix() {
      const ctx = this.ctx;
      ctx.save();
      ctx.clearRect(0, 0, this.canvasW, this.canvasH);

      // Sombra de impacto de cámara
      if (this.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
      }

      // 1. Dibuja el césped con franjas apaisadas horizontales ("PES Broadcast Lawn Stripes")
      const stripeW = 60;
      for(let x = 0; x < this.canvasW; x += stripeW) {
        ctx.fillStyle = (x / stripeW) % 2 === 0 ? "#185a2a" : "#1e6b32";
        ctx.fillRect(x, 0, stripeW, this.canvasH);
      }

      // Detalles del pasto
      ctx.fillStyle = "#144a22";
      for(let i = 0; i < 150; i++) {
        ctx.fillRect(Math.sin(i) * this.canvasW, Math.cos(i) * this.canvasH, 6, 3);
      }

      // 2. Líneas de Cal Blancas Resplandecientes de Par en Par
      ctx.save();
      ctx.shadowBlur = 8; ctx.shadowColor = "#ffffff";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.88)"; ctx.lineWidth = 4;

      // Límites de la bota
      ctx.strokeRect(10, 10, this.canvasW - 20, this.canvasH - 20);
      // Línea de medio campo (X = 480)
      ctx.beginPath(); ctx.moveTo(480, 10); ctx.lineTo(480, this.canvasH - 10); ctx.stroke();
      // Círculo central
      ctx.beginPath(); ctx.arc(480, 270, 70, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; ctx.beginPath(); ctx.arc(480, 270, 8, 0, Math.PI * 2); ctx.fill();

      // Área de Portería Izquierda (Mi Área)
      ctx.strokeRect(10, 140, 140, 260); // Área grande
      ctx.strokeRect(10, 200, 60, 140);  // Área chica
      ctx.beginPath(); ctx.arc(150, 270, 50, -Math.PI*0.35, Math.PI*0.35); ctx.stroke(); // Luna de área

      // Área de Portería Derecha (Área Rival)
      ctx.strokeRect(this.canvasW - 150, 140, 140, 260); // Área grande
      ctx.strokeRect(this.canvasW - 70, 200, 60, 140);   // Área chica
      ctx.beginPath(); ctx.arc(this.canvasW - 150, 270, 50, Math.PI*0.65, Math.PI*1.35); ctx.stroke(); // Luna
      ctx.restore();

      // 3. Dibujo de las 2 Porterías Monumentales Encajadas
      function renderTrophyGoalNet(ctx, gx, gy, isLeft) {
        ctx.save(); ctx.translate(gx, gy);
        ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
        ctx.fillRect(isLeft ? 0 : -60, -80, 60, 160); // Red semitransparente inmersiva
        
        ctx.shadowBlur = 10; ctx.shadowColor = "#ffe871";
        ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.strokeRect(isLeft ? 0 : -60, -80, 60, 160); // Postes de oro masivos
        
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.strokeRect(isLeft ? 0 : -60, -80, 60, 160);
        ctx.restore();
      }
      renderTrophyGoalNet(ctx, 10, 270, true); // Portería Izquierda
      renderTrophyGoalNet(ctx, this.canvasW - 10, 270, false); // Portería Derecha

      // 4. Dibujo Oblicuo Estilo PES / Gameboy de Entidades y Futbolistas
      const entitiesToDraw = [...this.myTeam, ...this.rivalTeam].sort((a, b) => a.y - b.y);

      entitiesToDraw.forEach(player => {
        const hasBall = this.ball.owner === player;
        const isMeControl = player === this.activeMyPlayerEl;

        ctx.save();
        ctx.translate(player.x, player.y);

        // A) Anillo de Posesión y Sombra de Jugador
        if (hasBall) {
          ctx.save();
          ctx.shadowBlur = 15; ctx.shadowColor = player.team === "blue" ? "#39ff88" : "#ffe871";
          ctx.strokeStyle = player.team === "blue" ? "#39ff88" : "#ffe871"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(0, 16, 22, 11, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        } else if (isMeControl) {
          ctx.save();
          ctx.globalAlpha = 0.85; ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.ellipse(0, 16, 18, 9, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.beginPath(); ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
        }

        // B) Kit y Cuerpo Oblicuo Pixel Gameboy Feel
        const kitCol = player.color;
        // Zancada animada viva al mover
        const stride = (player.vx !== 0 || player.vy !== 0) ? Math.sin(performance.now() / 80) * 6 : 0;

        // Piernitas
        ctx.fillStyle = player.isKeeper ? "#222" : "#f1c27d";
        ctx.beginPath(); ctx.arc(-6, 12 + stride, 4, 0, Math.PI*2); ctx.arc(6, 12 - stride, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.fillRect(-8, 16 + stride, 6, 5); ctx.fillRect(4, 16 - stride, 6, 5);

        // Camiseta
        ctx.fillStyle = kitCol;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-12, -10, 24, 20, 6) : ctx.fillRect(-12, -10, 24, 20); ctx.fill();
        
        // Mangas y acento
        ctx.fillStyle = player.isKeeper ? "#0a4a72" : "#fff";
        ctx.fillRect(-14, -8, 5, 10); ctx.fillRect(9, -8, 5, 10);

        // Cabeza Oblicua con Peinado
        ctx.fillStyle = "#f1c27d"; ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = player.isKeeper ? "#ff4545" : "#3a230b"; ctx.beginPath(); ctx.arc(0, -14, 8.5, Math.PI*0.8, Math.PI*2.2); ctx.fill();

        // Estampar Dorsal / Inicial en la Camiseta
        ctx.fillStyle = player.team === "blue" ? "#000" : "#fff";
        ctx.font = "bold 10px 'Oswald', sans-serif"; ctx.textAlign = "center"; ctx.fillText(player.name.slice(0,3).toUpperCase(), 0, 2);
        ctx.restore();
      });

      // 5. Dibujo Inmaculado del Balón Físico en la Arena
      const ballObj = this.ball;
      ctx.save();
      ctx.translate(ballObj.x, ballObj.y);
      // Sombra
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(2, 6, 10, 5, 0, 0, Math.PI*2); ctx.fill();
      
      // Esfera y Gajos Neón Brillantes
      ctx.shadowBlur = ballObj.owner ? 20 : 10;
      ctx.shadowColor = ballObj.owner ? (ballObj.owner.team === "blue" ? "#3fbfff" : "#ff4545") : "#ffffff";
      
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, ballObj.radius, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Parches de cuero clásicos
      ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(-8, -6, 5, 5); ctx.fillRect(3, -6, 5, 5); ctx.fillRect(-4, 7, 8, 4);
      ctx.restore();

      // 6. Pintura de Partículas Estelares
      this.particles.forEach(p => {
        ctx.save(); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });

      // 7. Mensajes de Celebración
      if (this.messageTimer > 0) {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; ctx.fillRect(0, this.canvasH / 2 - 40, this.canvasW, 80);
        ctx.font = "950 2.8rem 'Oswald', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowBlur = 15; ctx.shadowColor = "#ffe871"; ctx.fillStyle = "#ffe871";
        ctx.fillText(this.messageText, this.canvasW / 2, this.canvasH / 2);
        ctx.restore();
      }

      ctx.restore();
    }

    updateStatusUi() {
      if (this.ui.myGoalsTxt) this.ui.myGoalsTxt.textContent = this.myGoals;
      if (this.ui.rivalGoalsTxt) this.ui.rivalGoalsTxt.textContent = this.rivalGoals;
      if (this.ui.ptsTxt) this.ui.ptsTxt.textContent = `${this.pointsEarned} PTS`;
      if (this.ui.timerTxt) {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = Math.floor(this.timeLeft % 60);
        this.ui.timerTxt.textContent = `${mins}:${String(secs).padStart(2, "0")}`;
      }
    }

    destroyMatch() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      
      const gameOverlay = document.getElementById("fm-pes-gameboy-overlay");
      if (gameOverlay) gameOverlay.hidden = true;
      document.body.classList.remove("fm-pes-game-active");

      try {
        if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
      } catch {}
    }
  }

  // --- CAPA DE EXPORTACIÓN Y CONEXIÓN CON TU PLATAFORMA VERDE MILITAR ---
  window.FutmundiPesGameApp = FutmundiPesGameApp;

  // Inyectamos el Markup del Overlay al Body
  function injectGlobalPesContainer() {
    if (document.getElementById("fm-pes-gameboy-overlay")) return;
    const overlayCont = document.createElement("div");
    overlayCont.id = "fm-pes-gameboy-overlay";
    overlayCont.hidden = true;
    overlayCont.innerHTML = `<div id="pes-gameboy-mount-target" style="width:100%; height:100%; display:flex; justify-content:center; alignItems:center;"></div>`;
    document.body.appendChild(overlayCont);
  }

  // Súper Reemplazador de Inicialización ("Universal Web3 Smart Match Launcher")
  window.__FM_UNIVERSAL_OPEN_GAME = function(modeStr) {
    if (!window.STATE || !window.STATE.tonWallet) {
      alert("⚠️ PUERTA BLINDADA: Tu Billetera de TON no se encuentra conectada. Conecta tu Billetera en la barra superior para autorizar el ingreso.");
      return;
    }
    if (typeof window.getSelectedPlayer === "function" && !window.getSelectedPlayer()) {
      alert("⚠️ ACCESO RESTRINGIDO: No posees un Futbolista NFT activo en tu inventario. Adquiere o reclama tu Futbolista Gratis Inicial antes de saltar al campo.");
      return;
    }

    injectGlobalPesContainer();
    const targetDiv = document.getElementById("pes-gameboy-mount-target");
    const fullOverlayDiv = document.getElementById("fm-pes-gameboy-overlay");

    if (targetDiv && fullOverlayDiv) {
      // Ocultamos modales flotantes si existieran
      const fmModal = document.getElementById("fm-modal");
      if (fmModal) fmModal.classList.remove("open");
      
      fullOverlayDiv.hidden = false;
      document.body.classList.add("fm-pes-game-active");

      // Nace el nuevo motor Pes / Gameboy apaisado nativo
      new FutmundiPesGameApp(targetDiv, modeStr, {
        onMatchEnd: (detail) => {
          console.info("[Futmundi Play Integration] Boleta de minijuego completada:", detail);
          // Al cerrar llama o liquida con tu Supabase Remoto
        }
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectGlobalPesContainer);
  } else {
    injectGlobalPesContainer();
  }
})();
