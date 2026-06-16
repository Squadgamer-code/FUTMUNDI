/* ==========================================================================
   FUTMUNDI PES / GAMEBOY ADVANCE SUITE - TRUE DYNAMIC LANDSCAPE ENGINE
   Límites Físicos Re-Adaptables en cada fotograma (Cero Atascos de Escala)
   Módulo Purificado, Cero Botones Dobles y Unificado en un Solo Index
   ========================================================================== */

(function () {
  if (window.__fm_pes_gameboy_installed) return;
  window.__fm_pes_gameboy_installed = true;

  // --- BASE DE EQUIPOS Y RIVALES DEL MUNDO PARA TORNEO Y PARTIDOS ---
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

  // --- MOTOR DE AUDIO NATIVO ---
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
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
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

  // --- NUEVO VIDEOJUEGO DE PES GAMEBOY CON MATRIZ DINÁMICA DE CONTENEDOR REAL ---
  class FutmundiPesGameApp {
    constructor(mountEl, gameMode, detailCallbacks) {
      this.mountEl = mountEl;
      this.mode = gameMode; 
      this.onMatchEndCallback = detailCallbacks.onMatchEnd || null;
      this.isRecreational = detailCallbacks.isRecreationalMode || false;

      // Atrapamos Nombre de tu NFT seleccionado
      const playerObj = typeof window.getSelectedPlayer === "function" ? window.getSelectedPlayer() : null;
      this.myNftName = playerObj ? playerObj.name : localStorage.getItem("fm_selected_player_name") || "NEYMAR NFT";

      // Parámetros Rival
      this.tournamentOpponentIdx = 0;
      this.currentOpponent = this.mode === "tournament" ? TEAMS_DATABASE[0] : { name: "IA Élite Sports", tier: "Pro", aiAggression: 1.3, color: "#e04545", rewardGems: 25, rewardPts: 150 };

      // Config
      this.matchLengthSeconds = 90; 
      this.gameSpeed = 1.0;

      // Inicializamos RAM Re-adaptable
      this.canvasW = 960;
      this.canvasH = 540;
      this.audio = new PesAudioEngine();
      this.unsubscribers = [];
      this.raf = null;
      this.running = false;

      // Entidades físicas
      this.stickVector = { x: 0, y: 0, active: false };
      this.keys = new Set();
      this.shotCharge = 0;
      this.isChargingShot = false;
      this.screenShake = 0;
      this.particles = [];
      this.messageText = "¡COMIENZA EL ENFRENTAMIENTO!";
      this.messageTimer = 1.8;

      // Estatus
      this.started = false;
      this.matchOver = false;
      this.timeLeft = this.matchLengthSeconds;
      this.myGoals = 0;
      this.rivalGoals = 0;
      this.pointsEarned = 0;
      this.gemsEarned = 0;

      this.initWorldEntities();
      this.injectUniversalUi();
      this.initInputControllers();

      try {
        if(screen.orientation && screen.orientation.lock) {
          screen.orientation.lock("landscape").catch(() => {});
        }
      } catch {}

      this.running = true;
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame((now) => this.gameLoop(now));
    }

    initWorldEntities() {
      // Base inicial, se auto-ajustará en el gameLoop según pantalla visible
      this.ball = { x: 480, y: 270, vx: 0, vy: 0, radius: 12, owner: null, curve: 0 };

      this.myTeam = [
        { id: "my_p1", name: this.myNftName, x: 350, y: 270, vx: 0, vy: 0, speed: 5.5, isControlled: true, team: "blue", color: "#ffe871" },
        { id: "my_p2", name: "Compañero Pro", x: 250, y: 150, vx: 0, vy: 0, speed: 4.8, isControlled: false, team: "blue", color: "#ffe871" },
        { id: "my_p3", name: "Compañero Tact", x: 250, y: 390, vx: 0, vy: 0, speed: 4.8, isControlled: false, team: "blue", color: "#ffe871" },
        { id: "my_keeper", name: "Portero Oficial", x: 50, y: 270, vx: 0, vy: 0, speed: 4.0, isControlled: false, team: "blue", isKeeper: true, color: "#39ff88" }
      ];

      const rCol = this.currentOpponent.color;
      this.rivalTeam = [
        { id: "riv_p1", name: this.currentOpponent.name, x: 610, y: 270, vx: 0, vy: 0, speed: 4.6 * this.currentOpponent.aiAggression, isControlled: false, team: "red", color: rCol },
        { id: "riv_p2", name: "Rival Def 1", x: 710, y: 170, vx: 0, vy: 0, speed: 4.3 * this.currentOpponent.aiAggression, isControlled: false, team: "red", color: rCol },
        { id: "riv_p3", name: "Rival Def 2", x: 710, y: 370, vx: 0, vy: 0, speed: 4.3 * this.currentOpponent.aiAggression, isControlled: false, team: "red", color: rCol },
        { id: "riv_keeper", name: "Rival Keeper", x: 910, y: 270, vx: 0, vy: 0, speed: 4.1, isControlled: false, team: "red", isKeeper: true, color: "#ff4545" }
      ];

      this.activeMyPlayerEl = this.myTeam[0];
    }

    injectUniversalUi() {
      const stageCont = document.createElement("div");
      stageCont.className = "pes-soccer-stage";

      const canv = document.createElement("canvas");
      canv.className = "pes-game-canvas";
      canv.width = this.canvasW;
      canv.height = this.canvasH;
      this.canvasEl = canv;
      this.ctx = canv.getContext("2d");

      // HUD
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

      // Touch
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

      // NOTA Tech Lead: Aquí ya NO INYECTAMOS el botón de "Volver a Plataforma" doble para que no haya superposiciones con integration.js. 
      // Dejamos que actúe nativa y limpiamente el Universal Close Button del recuadro #pes-universal-close-btn.

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
      stageCont.appendChild(centerCont);

      this.mountEl.replaceChildren(stageCont);

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

      if (this.ui.modalLaunchBtn) {
        this.ui.modalLaunchBtn.onclick = (e) => {
          e.stopPropagation();
          this.audio.playWhistle();
          this.centerModalEl.hidden = true;
          this.started = true;
          this.matchOver = false;
          this.messageText = "¡EMPIEZA EL PARTIDO!";
          this.messageTimer = 1.5;
        };
      }

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
      this.stickVector = { x: Math.cos(angle), y: Math.sin(angle), active: true };

      if (this.ui.touchKnob) {
        this.ui.touchKnob.style.transform = `translate(${Math.cos(angle) * rad}px, ${Math.sin(angle) * rad}px)`;
      }
    }

    executePass() {
      if (this.ball.owner !== this.activeMyPlayerEl) return;
      this.ball.owner = null;
      const pAct = this.activeMyPlayerEl;
      let mates = this.myTeam.filter(p => !p.isKeeper && p !== pAct);
      let targetMate = mates[0];
      let bestDist = 9999;
      mates.forEach(m => {
        const d = Math.hypot(m.x - pAct.x, m.y - pAct.y);
        if (d < bestDist) { bestDist = d; targetMate = m; }
      });
      
      if (!targetMate) targetMate = { x: this.canvasW * 0.8, y: pAct.y };

      const angle = Math.atan2(targetMate.y - pAct.y, targetMate.x - pAct.x);
      this.ball.vx = Math.cos(angle) * 16;
      this.ball.vy = Math.sin(angle) * 16;
      this.ball.x += Math.cos(angle) * 12;
      this.ball.y += Math.sin(angle) * 12;

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

      const targetY = this.canvasH * 0.5 + (Math.random() - 0.5) * (this.canvasH * 0.3);
      const angle = Math.atan2(targetY - pAct.y, this.canvasW - 10);
      
      const shotPower = 20 + this.shotCharge * 15;
      this.ball.vx = Math.cos(angle) * shotPower;
      this.ball.vy = Math.sin(angle) * shotPower;
      this.ball.curve = (Math.random() - 0.5) * 4; 
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
          x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
          color: color, radius: 2 + Math.random() * 3, life: 1.0, maxLife: 1.0
        });
      }
    }

    gameLoop(now) {
      if (!this.running) return;
      const delta = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
      this.lastTime = now;

      // SÚPER ESCÁNER MATRICIAL DE CONTENEDOR VISIBLE REAL EN CADA FOTOGRAMA ("Dynamic Dimension Lock")
      // Soluciona para siempre que el muñequito o la camara se vaya fuera del celular en moviles de distinto tamano
      if (this.canvasEl) {
        const actualClientW = Math.max(320, this.canvasEl.clientWidth || 960);
        const actualClientH = Math.max(240, this.canvasEl.clientHeight || 540);
        if (this.canvasW !== actualClientW || this.canvasH !== actualClientH) {
          this.canvasW = actualClientW;
          this.canvasH = actualClientH;
          this.canvasEl.width = actualClientW;
          this.canvasEl.height = actualClientH;
          // Re-anclamos la bota y al rival keeper a la nueva Derecha Real Garantizada
          const rKeeper = this.rivalTeam.find(k => k.isKeeper);
          if (rKeeper && rKeeper.x > actualClientW - 20) rKeeper.x = actualClientW - 60;
        }
      }

      if (this.started && !this.matchOver) {
        this.updateWorldPhysics(delta);
      }

      this.updateVisualEffects(delta);
      this.renderPureLandscapeSoccerMatrix();
      this.updateStatusUi();

      this.raf = requestAnimationFrame((nNow) => this.gameLoop(nNow));
    }

    updateWorldPhysics(delta) {
      this.timeLeft = Math.max(0, this.timeLeft - delta);
      if (this.timeLeft <= 0 && !this.matchOver) {
        this.triggerMatchResolution();
        return;
      }

      // Control de Mi Futbolista Activo en los nuevos límites dinámicos (X = 0 a canvasW)
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

        // BARRERA BLINDADA: Humanamente IM-PO-SI-BLE que el jugador activo se vaya fuera de la cancha visible
        myP.x = Math.max(20, Math.min(this.canvasW - 20, myP.x));
        myP.y = Math.max(20, Math.min(this.canvasH - 20, myP.y));
      }

      // IA Compañeros
      this.myTeam.forEach(p => {
        if (!p.isControlled && !p.isKeeper) {
          const targX = this.ball.x < this.canvasW * 0.5 ? this.canvasW * 0.45 : this.canvasW * 0.8;
          p.x += (targX - p.x) * delta * 1.5;
          // Protegemos tambien a compañeros
          p.x = Math.max(20, Math.min(this.canvasW - 20, p.x));
        }
      });

      // IA Realista Rival
      const ballObj = this.ball;
      this.rivalTeam.forEach(riv => {
        if (!riv.isKeeper) {
          const ang = Math.atan2(ballObj.y - riv.y, ballObj.x - riv.x);
          const aiDist = Math.hypot(ballObj.x - riv.x, ballObj.y - riv.y);
          if (aiDist > 15) { riv.x += Math.cos(ang) * riv.speed; riv.y += Math.sin(ang) * riv.speed; }

          riv.x = Math.max(20, Math.min(this.canvasW - 20, riv.x));

          if (aiDist < 20 && ballObj.owner !== riv) {
            ballObj.owner = riv;
            if (riv.x < this.canvasW * 0.35 || Math.random() < 0.08) {
              ballObj.owner = null;
              const targetMyGoalY = this.canvasH * 0.5 + (Math.random() - 0.5) * (this.canvasH * 0.25);
              const shotAng = Math.atan2(targetMyGoalY - riv.y, 0 - riv.x);
              ballObj.vx = Math.cos(shotAng) * 16; ballObj.vy = Math.sin(shotAng) * 16;
              this.audio.playKick();
            }
          }
        }
      });

      // IA Porteros
      const myK = this.myTeam.find(k => k.isKeeper);
      if (myK) {
        const goalCenter = this.canvasH * 0.5;
        myK.y += (Math.max(goalCenter - 80, Math.min(goalCenter + 80, ballObj.y)) - myK.y) * delta * 4;
      }

      const rivK = this.rivalTeam.find(k => k.isKeeper);
      if (rivK) {
        const goalCenter = this.canvasH * 0.5;
        rivK.y += (Math.max(goalCenter - 80, Math.min(goalCenter + 80, ballObj.y)) - rivK.y) * delta * 4;
      }

      // Físicas del Balón
      if (ballObj.owner) {
        ballObj.x = ballObj.owner.x + (ballObj.owner.team === "blue" ? 14 : -14);
        ballObj.y = ballObj.owner.y + 10;
        ballObj.vx = 0; ballObj.vy = 0;
      } else {
        ballObj.x += ballObj.vx; ballObj.y += ballObj.vy;
        ballObj.vy += ballObj.curve; 
        ballObj.vx *= 0.985; ballObj.vy *= 0.985; ballObj.curve *= 0.95;

        // Rebotes Banda
        if (ballObj.y < 20) { ballObj.y = 20; ballObj.vy *= -1; this.audio.playPost(); }
        if (ballObj.y > this.canvasH - 20) { ballObj.y = this.canvasH - 20; ballObj.vy *= -1; this.audio.playPost(); }

        // Chequeo de Goles en Extremos Reales (X=0 y X=canvasW)
        const goalTop = this.canvasH * 0.5 - 80;
        const goalBot = this.canvasH * 0.5 + 80;

        // Gol Mío Destino Mi Arco (Izquierdo)
        if (ballObj.x < 30) {
          if (ballObj.y >= goalTop && ballObj.y <= goalBot) {
            this.rivalGoals += 1;
            this.handleGoalScored("red", "¡GOL DE " + this.currentOpponent.name.toUpperCase() + "!");
          } else {
            ballObj.x = 30; ballObj.vx *= -1; this.audio.playPost();
          }
        }

        // Gol Destino Arco Rival (Derecho, adaptativo a canvasW)
        if (ballObj.x > this.canvasW - 30) {
          if (ballObj.y >= goalTop && ballObj.y <= goalBot) {
            this.myGoals += 1; this.pointsEarned += 10;
            this.handleGoalScored("blue", "¡GOLAZO DE " + this.myNftName.toUpperCase() + "!");
          } else {
            ballObj.x = this.canvasW - 30; ballObj.vx *= -1; this.audio.playPost();
          }
        }

        // Control Esférico
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

      if (this.isChargingShot) {
        this.shotCharge = Math.min(1.0, this.shotCharge + delta * 1.5);
      }
    }

    handleGoalScored(team, toastMsg) {
      this.audio.playGoal();
      this.screenShake = 20;
      this.messageText = toastMsg;
      this.messageTimer = 2.5;
      this.spawnKickParticles(team === "blue" ? this.canvasW - 30 : 30, this.canvasH * 0.5, team === "blue" ? "#3fbfff" : "#ff4545", 50);

      setTimeout(() => {
        this.ball = { x: this.canvasW / 2, y: this.canvasH / 2, vx: 0, vy: 0, radius: 12, owner: null, curve: 0 };
        this.myTeam[0].x = this.canvasW * 0.4; this.myTeam[0].y = this.canvasH * 0.5;
        this.rivalTeam[0].x = this.canvasW * 0.6; this.rivalTeam[0].y = this.canvasH * 0.5;
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

      let rewardGemsWon = isWin ? this.currentOpponent.rewardGems || 25 : isDraw ? 5 : 0;
      let rewardPtsWon = isWin ? this.currentOpponent.rewardPts || 150 : isDraw ? 30 : 0;
      
      // Si entro con estamina en 0, es modo recreativo y no genera Gemas de premio
      if (this.isRecreational) {
        rewardGemsWon = 0;
      }

      if (this.mode === "tournament") {
        if (isWin || isDraw) {
          this.tournamentOpponentIdx += 1;
          if (this.tournamentOpponentIdx >= TEAMS_DATABASE.length) {
            rewardGemsWon += 500; rewardPtsWon += 5000;
            this.showMatchEndScreen("🏆 ¡CAMPEÓN MUNDIAL DE FUTMUNDI!", `¡Derrotaste a todos los rivales de la copa! +${rewardGemsWon} GEMAS`);
            this.emitBlockchainResult("Victoria", finalScoreStr, rewardGemsWon, rewardPtsWon, true);
            return;
          }
          const nextRivalObj = TEAMS_DATABASE[this.tournamentOpponentIdx];
          this.currentOpponent = nextRivalObj;
          this.showMatchEndScreen(`¡${matchStatusStr}! Clasificas a Ronda ${this.tournamentOpponentIdx + 1}/15`, `Siguiente Rival: ${nextRivalObj.name} (${nextRivalObj.tier})`);
          this.emitBlockchainResult(matchStatusStr, finalScoreStr, rewardGemsWon, rewardPtsWon, false);
        } else {
          this.showMatchEndScreen("💥 ELIMINADO DEL TORNEO", `Caíste ante ${this.currentOpponent.name}. Rondas logradas: ${this.tournamentOpponentIdx}/15`);
          this.emitBlockchainResult("Derrota", finalScoreStr, 0, 10, true);
        }
      } else {
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
        mode: this.mode, result: resStr, score: scoreStr, gemsDelta: gemsCount,
        pointsDelta: ptsCount, points: ptsCount,
        tournament: this.mode === "tournament" ? {
          round: this.tournamentOpponentIdx, champion: isFinalMatch && resStr === "Victoria",
          eliminated: isFinalMatch && resStr === "Derrota", highestTier: this.currentOpponent.tier, finalScore: ptsCount
        } : null
      };

      try {
        if (typeof this.onMatchEndCallback === "function") this.onMatchEndCallback(matchDetailObj);
        window.dispatchEvent(new CustomEvent("futmundi:gameplay_match_ended", { detail: matchDetailObj }));
        if (gemsCount > 0 && typeof BetDB !== "undefined" && BetDB.addGems) BetDB.addGems(gemsCount);
      } catch {}
    }

    updateVisualEffects(delta) {
      this.screenShake = Math.max(0, this.screenShake - delta * 20);
      this.messageTimer = Math.max(0, this.messageTimer - delta);
      this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= delta; });
      this.particles = this.particles.filter(p => p.life > 0);
    }

    renderPureLandscapeSoccerMatrix() {
      const ctx = this.ctx;
      ctx.save();
      ctx.clearRect(0, 0, this.canvasW, this.canvasH);

      if (this.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
      }

      // Pasto
      const stripeW = 60;
      for(let x = 0; x < this.canvasW; x += stripeW) {
        ctx.fillStyle = (x / stripeW) % 2 === 0 ? "#185a2a" : "#1e6b32";
        ctx.fillRect(x, 0, stripeW, this.canvasH);
      }
      ctx.fillStyle = "#144a22";
      for(let i = 0; i < 150; i++) {
        ctx.fillRect(Math.sin(i) * this.canvasW, Math.cos(i) * this.canvasH, 6, 3);
      }

      // Líneas
      ctx.save();
      ctx.shadowBlur = 8; ctx.shadowColor = "#ffffff";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.88)"; ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, this.canvasW - 20, this.canvasH - 20);
      
      const midX = this.canvasW * 0.5;
      const midY = this.canvasH * 0.5;
      ctx.beginPath(); ctx.moveTo(midX, 10); ctx.lineTo(midX, this.canvasH - 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(midX, midY, 70, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; ctx.beginPath(); ctx.arc(midX, midY, 8, 0, Math.PI * 2); ctx.fill();

      const goalTop = midY - 80;
      const goalBoxH = 160;

      // Mi Área Izquierda
      ctx.strokeRect(10, goalTop - 20, 140, goalBoxH + 40); 
      ctx.strokeRect(10, goalTop + 10, 60, goalBoxH - 20);  
      ctx.beginPath(); ctx.arc(150, midY, 50, -Math.PI*0.35, Math.PI*0.35); ctx.stroke(); 

      // Área Rival Derecha dinámica
      ctx.strokeRect(this.canvasW - 150, goalTop - 20, 140, goalBoxH + 40); 
      ctx.strokeRect(this.canvasW - 70, goalTop + 10, 60, goalBoxH - 20);   
      ctx.beginPath(); ctx.arc(this.canvasW - 150, midY, 50, Math.PI*0.65, Math.PI*1.35); ctx.stroke(); 
      ctx.restore();

      // Porterías
      function renderTrophyGoalNet(ctx, gx, gy, isLeft) {
        ctx.save(); ctx.translate(gx, gy);
        ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
        ctx.fillRect(isLeft ? 0 : -60, -80, 60, 160); 
        ctx.shadowBlur = 10; ctx.shadowColor = "#ffe871";
        ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 8;
        ctx.strokeRect(isLeft ? 0 : -60, -80, 60, 160); 
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
        ctx.strokeRect(isLeft ? 0 : -60, -80, 60, 160);
        ctx.restore();
      }
      renderTrophyGoalNet(ctx, 10, midY, true); 
      renderTrophyGoalNet(ctx, this.canvasW - 10, midY, false); 

      // Muñequitos PES Frame
      const entitiesToDraw = [...this.myTeam, ...this.rivalTeam].sort((a, b) => a.y - b.y);

      entitiesToDraw.forEach(player => {
        const hasBall = this.ball.owner === player;
        const isMeControl = player === this.activeMyPlayerEl;

        ctx.save();
        ctx.translate(player.x, player.y);

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

        const kitCol = player.color;
        const stride = (player.vx !== 0 || player.vy !== 0) ? Math.sin(performance.now() / 80) * 6 : 0;

        ctx.fillStyle = player.isKeeper ? "#222" : "#f1c27d";
        ctx.beginPath(); ctx.arc(-6, 12 + stride, 4, 0, Math.PI*2); ctx.arc(6, 12 - stride, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.fillRect(-8, 16 + stride, 6, 5); ctx.fillRect(4, 16 - stride, 6, 5);

        ctx.fillStyle = kitCol;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-12, -10, 24, 20, 6) : ctx.fillRect(-12, -10, 24, 20); ctx.fill();
        ctx.fillStyle = player.isKeeper ? "#0a4a72" : "#fff";
        ctx.fillRect(-14, -8, 5, 10); ctx.fillRect(9, -8, 5, 10);

        ctx.fillStyle = "#f1c27d"; ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = player.isKeeper ? "#ff4545" : "#3a230b"; ctx.beginPath(); ctx.arc(0, -14, 8.5, Math.PI*0.8, Math.PI*2.2); ctx.fill();

        ctx.fillStyle = player.team === "blue" ? "#000" : "#fff";
        ctx.font = "bold 10px 'Oswald', sans-serif"; ctx.textAlign = "center"; ctx.fillText(player.name.slice(0,3).toUpperCase(), 0, 2);
        ctx.restore();
      });

      // Balón
      const ballObj = this.ball;
      ctx.save();
      ctx.translate(ballObj.x, ballObj.y);
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(2, 6, 10, 5, 0, 0, Math.PI*2); ctx.fill();
      
      ctx.shadowBlur = ballObj.owner ? 20 : 10;
      ctx.shadowColor = ballObj.owner ? (ballObj.owner.team === "blue" ? "#3fbfff" : "#ff4545") : "#ffffff";
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, ballObj.radius, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(-8, -6, 5, 5); ctx.fillRect(3, -6, 5, 5); ctx.fillRect(-4, 7, 8, 4);
      ctx.restore();

      this.particles.forEach(p => {
        ctx.save(); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); ctx.restore();
      });

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

  // FIX CRÍTICO DE LATENCIA: la clase se llama FutmundiPesGameApp.
  // Antes se referenciaba "PurePesGameboyApp" (variable inexistente) y eso
  // lanzaba un ReferenceError que abortaba el IIFE entero, dejando
  // window.FutmundiPesGameApp === undefined y disparando el error de
  // "Latencia en Vercel". Ahora los dos alias apuntan a la clase real.
  window.PurePesGameboyApp = FutmundiPesGameApp;
  window.FutmundiPesGameApp = FutmundiPesGameApp;
})();
