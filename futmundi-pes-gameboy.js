/* ==========================================================================
   FUTMUNDI PES PRO — Gameplay arcade horizontal estilo PES 2005
   v3: IA defensiva activa, tackle manual, temporizador estricto 45s,
       loop robusto para Mini App Telegram.
   ========================================================================== */
(function () {
  if (window.__fm_pes_gameboy_installed) return;
  window.__fm_pes_gameboy_installed = true;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const t = (k, r) => (typeof window.t === "function" ? window.t(k, r) : k);

  const TEAMS = [
    { n: "Curdo FC", a: 0.9, c: "#8e8e8e" },
    { n: "Boca Juniors", a: 1.0, c: "#1e63d6" },
    { n: "Real Madrid", a: 1.2, c: "#fcbf00" },
    { n: "FC Barcelona", a: 1.15, c: "#a50044" },
    { n: "Manchester City", a: 1.25, c: "#6cabdd" },
    { n: "Bayern München", a: 1.2, c: "#c20e1a" }
  ];

  function getAvailableNfts() {
    try {
      const inv = window.STATE && window.STATE.inventory;
      if (!inv || !inv.players) return [];
      return inv.players.filter(p => p && p.id && p.name).sort((a, b) => {
        const sa = Number(a.stamina) || 0, sb = Number(b.stamina) || 0;
        return sb - sa || (Number(b.durability) || 0) - (Number(a.durability) || 0);
      });
    } catch (e) { return []; }
  }

  function staminaIcons(p) {
    const cur = Math.max(0, Math.min(4, Number(p.stamina) || 0));
    const max = Math.max(1, Math.min(4, Number(p.maxStamina) || 4));
    let s = "";
    for (let i = 0; i < max; i++) s += i < cur ? "⚽" : "⚪";
    return s;
  }

  class AudioEngine {
    constructor() { this.ctx = null; }
    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    }
    tone(f, type, d, v) {
      if (!this.ctx) return;
      try {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(v, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + d);
        o.connect(g).connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + d);
      } catch (e) {}
    }
    kick() { this.tone(180, "triangle", 0.08, 0.15); }
    pass() { this.tone(320, "sine", 0.06, 0.10); }
    steal() { this.tone(160, "sawtooth", 0.12, 0.12); }
    whistle() { this.tone(880, "sine", 0.20, 0.30); const s = this; setTimeout(() => s.tone(920, "sine", 0.30, 0.30), 150); }
    goal() { this.tone(440, "square", 0.10, 0.20); const s = this; setTimeout(() => s.tone(554, "triangle", 0.12, 0.22), 100); setTimeout(() => s.tone(659, "triangle", 0.25, 0.25), 220); }
  }

  class FutmundiPesGameApp {
    constructor(mountEl, mode, callbacks) {
      this.mountEl = mountEl;
      this.mode = mode || "pve";
      this.onMatchEnd = callbacks && callbacks.onMatchEnd;
      this.onConsumeStamina = callbacks && callbacks.onConsumeStamina;
      this.isRecreational = (callbacks && callbacks.isRecreationalMode) || false;
      this.hasWallet = !!(window.STATE && window.STATE.tonWallet);

      this.sp = (typeof window.getSelectedPlayer === "function") ? window.getSelectedPlayer() : null;
      this.myNftName = this.sp ? this.sp.name : "FUTBOLISTA";
      this.selectedPlayerId = this.sp ? this.sp.id : null;
      this.staminaConsumed = false;
      this.matchCompleted = false;

      this.cW = 960; this.cH = 540;
      this.dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      this.audio = new AudioEngine();
      this.audio.init();

      this.state = "pregame"; // pregame, playing, goal, ended
      this.half = 1;
      this.totalTime = 60;
      this.timeLeft = this.totalTime;
      this.myGoals = 0; this.riGoals = 0; this.points = 0;
      this.opp = TEAMS[Math.floor(Math.random() * TEAMS.length)];

      this.ball = { x: 480, y: 270, vx: 0, vy: 0, r: 10 };
      this.players = [];
      this.active = null;
      this.stick = { x: 0, y: 0, active: false };
      this.keys = {};
      this.charging = false;
      this.charge = 0;
      this.tackleCooldown = 0;
      this.goalTimeout = null;
      this.shake = 0;
      this.msg = { text: "", sub: "", timer: 0 };
      this.parts = [];
      this.lastT = performance.now();
      this.raf = null;

      this.buildStage();
      this.resize();
      this.observeResize();
      this.bindEvents();
      this.renderPreGame();

      this.raf = requestAnimationFrame((t) => this.loop(t));
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
    }

    buildStage() {
      this.stageEl = document.createElement("div");
      this.stageEl.className = "pes-soccer-stage";
      this.canvasEl = document.createElement("canvas");
      this.canvasEl.className = "pes-game-canvas";
      this.ctx = this.canvasEl.getContext("2d", { alpha: false, desynchronized: true });
      this.stageEl.appendChild(this.canvasEl);
      this.mountEl.replaceChildren(this.stageEl);

      this.hudEl = document.createElement("div");
      this.hudEl.className = "pes-hud-bar";
      this.hudEl.innerHTML = `
        <div class="pes-hud-badge">
          <span class="pes-hud-team blue" id="pes-blue-nm">${this.myNftName.toUpperCase()}</span>
          <span class="pes-hud-goals" id="pes-my-g">0</span>
        </div>
        <div class="pes-hud-timer">
          <span id="pes-half-lbl">⏱</span>
          <strong id="pes-time">01:00</strong>
        </div>
        <div class="pes-hud-badge">
          <span class="pes-hud-goals" id="pes-ri-g">0</span>
          <span class="pes-hud-team red" id="pes-red-nm">${this.opp.n.toUpperCase()}</span>
        </div>
      `;
      this.stageEl.appendChild(this.hudEl);

      this.controlsEl = document.createElement("div");
      this.controlsEl.className = "pes-touch-controls";
      this.controlsEl.innerHTML = `
        <div class="pes-joystick-base" id="pes-joy"><div class="pes-joystick-knob" id="pes-knob"></div></div>
        <div class="pes-actions-cluster">
          <div class="pes-btn-arcade pes-btn-tackle" id="pes-tackle">QUITAR</div>
          <div class="pes-btn-arcade pes-btn-pass" id="pes-pass">${t('pass')}</div>
          <div class="pes-btn-arcade pes-btn-shot" id="pes-shot">${t('shot')}</div>
        </div>
      `;
      this.stageEl.appendChild(this.controlsEl);
      this.ui = {
        myG: this.hudEl.querySelector("#pes-my-g"),
        riG: this.hudEl.querySelector("#pes-ri-g"),
        time: this.hudEl.querySelector("#pes-time"),
        halfLbl: this.hudEl.querySelector("#pes-half-lbl"),
        joy: this.controlsEl.querySelector("#pes-joy"),
        knob: this.controlsEl.querySelector("#pes-knob"),
        pass: this.controlsEl.querySelector("#pes-pass"),
        shot: this.controlsEl.querySelector("#pes-shot"),
        tackle: this.controlsEl.querySelector("#pes-tackle"),
      };

      this.pregameEl = document.createElement("div");
      this.pregameEl.className = "pes-pre-game-panel";
      this.stageEl.appendChild(this.pregameEl);

      this.endEl = document.createElement("div");
      this.endEl.className = "pes-end-panel";
      this.endEl.style.display = "none";
      this.stageEl.appendChild(this.endEl);
    }

    resize() {
      if (!this.canvasEl || !this.stageEl) return;
      const rect = this.stageEl.getBoundingClientRect();
      const aw = Math.max(320, Math.floor(rect.width || 960));
      const ah = Math.max(240, Math.floor(rect.height || 540));
      if (this.cW === aw && this.cH === ah) return;
      this.cW = aw; this.cH = ah;
      this.canvasEl.width = aw * this.dpr;
      this.canvasEl.height = ah * this.dpr;
      this.canvasEl.style.width = aw + "px";
      this.canvasEl.style.height = ah + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this.state === "pregame") this.renderPreGame();
    }

    observeResize() {
      if (typeof ResizeObserver !== "undefined" && this.stageEl) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.stageEl);
      } else if (window.addEventListener) {
        this.onResize = () => this.resize();
        window.addEventListener("resize", this.onResize, { passive: true });
      }
      this.onVis = () => { this.hidden = document.hidden; };
      document.addEventListener("visibilitychange", this.onVis);
    }

    bindEvents() {
      this.onKeyDown = (e) => {
        const k = e.key.toLowerCase();
        this.keys[k] = true;
        if (k === " " || k === "j" || k === "k" || k === "shift" || k === "enter") {
          e.preventDefault();
          if (k === " " && this.state === "playing") this.startCharge();
          if (k === "j" && this.state === "playing") this.doPass();
          if ((k === "k" || k === "shift") && this.state === "playing") this.doTackle();
          if (k === "enter" && this.state === "pregame") this.startMatch();
        }
      };
      this.onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        this.keys[k] = false;
        if (k === " " && this.charging) this.releaseShot();
      };
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);

      let pid = null;
      const joyMove = (e) => {
        e.preventDefault();
        const r = this.ui.joy.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const maxR = r.width * 0.35;
        const angle = Math.atan2(dy, dx);
        const rad = Math.min(Math.hypot(dx, dy), maxR);
        this.stick.x = Math.cos(angle); this.stick.y = Math.sin(angle); this.stick.active = true;
        this.ui.knob.style.transform = `translate(${Math.cos(angle) * rad}px, ${Math.sin(angle) * rad}px)`;
      };
      const joyEnd = (e) => {
        if (e.pointerId === pid) {
          pid = null;
          this.stick.x = 0; this.stick.y = 0; this.stick.active = false;
          this.ui.knob.style.transform = "none";
        }
      };
      this.ui.joy.addEventListener("pointerdown", (e) => { pid = e.pointerId; try { this.ui.joy.setPointerCapture(pid); } catch (_) {} joyMove(e); });
      this.ui.joy.addEventListener("pointermove", (e) => { if (e.pointerId === pid) joyMove(e); });
      this.ui.joy.addEventListener("pointerup", joyEnd);
      this.ui.joy.addEventListener("pointercancel", joyEnd);

      const bindAction = (el, fn) => {
        if (!el) return;
        let lastTap = 0;
        const fire = (e) => {
          if (e) e.preventDefault();
          const now = performance.now();
          if (now - lastTap < 120) return;
          lastTap = now;
          fn();
        };
        el.addEventListener("pointerdown", fire);
        el.addEventListener("touchstart", fire, { passive: false });
        el.addEventListener("click", fire);
      };
      bindAction(this.ui.pass, () => this.doPass());
      bindAction(this.ui.tackle, () => this.doTackle());
      this.ui.shot.addEventListener("pointerdown", (e) => { e.preventDefault(); this.startCharge(); });
      this.ui.shot.addEventListener("touchstart", (e) => { e.preventDefault(); this.startCharge(); }, { passive: false });
      const shotEnd = (e) => { e.preventDefault(); if (this.charging) this.releaseShot(); };
      this.ui.shot.addEventListener("pointerup", shotEnd);
      this.ui.shot.addEventListener("touchend", shotEnd, { passive: false });
      this.ui.shot.addEventListener("pointerleave", shotEnd);
    }

    renderPreGame() {
      const nfts = getAvailableNfts();
      if (nfts.length === 0) {
        this.pregameEl.innerHTML = `
          <div class="pes-pg-header"><span class="pes-pg-mode">${t('field')} · ${this.mode.toUpperCase()}</span><span class="pes-pg-vs">vs ${this.opp.n}</span></div>
          <div class="pes-pg-title">⚽ ${t('noNfts')}</div>
        `;
        return;
      }
      let grid = "";
      nfts.forEach((p, idx) => {
        const selected = (this.selectedPlayerId === p.id) || (!this.selectedPlayerId && idx === 0);
        const cls = "pes-nft-pick" + (selected ? " pes-nft-pick-active" : "");
        grid += `<div class="${cls}" data-nft-id="${p.id}">
          <img src="${p.img || ""}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
          <div class="pes-nft-name">${p.name}</div>
          <div class="pes-nft-balls">${staminaIcons(p)}</div>
          <div class="pes-nft-dur">${t('durability')} ${Math.round(Number(p.durability) || 0)}%</div>
        </div>`;
      });
      const selected = nfts.find(p => p.id === this.selectedPlayerId) || nfts[0];
      this.pregameEl.innerHTML = `
        <div class="pes-pg-header"><span class="pes-pg-mode">${this.mode.toUpperCase()}</span><span class="pes-pg-vs">vs ${this.opp.n}</span></div>
        <div class="pes-pg-title">⚽ ${t('selectPlayer')}</div>
        <div class="pes-nft-selector-grid">${grid}</div>
        <div class="pes-pg-selected-box" id="pes-sel-box" style="display:flex">
          <img src="${selected.img || ""}" alt="${selected.name}" onerror="this.style.display='none'">
          <div class="pes-sel-info"><b>${selected.name}</b><span>${staminaIcons(selected)} ${t('stamina')}</span><span>${t('durability')} ${Math.round(Number(selected.durability) || 0)}%</span></div>
        </div>
        <button class="pes-start-btn" id="pes-start-btn" type="button">⚽ ${t('enterGame')} ${selected.name.toUpperCase()} ✔</button>
      `;
      this.pregameEl.querySelectorAll("[data-nft-id]").forEach(card => {
        card.addEventListener("pointerdown", (e) => { e.preventDefault(); this.selectNft(card.dataset.nftId); });
      });
      const startBtn = this.pregameEl.querySelector("#pes-start-btn");
      if (startBtn) startBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); this.startMatch(); });
    }

    selectNft(id) {
      const nfts = getAvailableNfts();
      const nft = nfts.find(p => p.id === id);
      if (!nft) return;
      if ((Number(nft.stamina) || 0) <= 0) {
        if (typeof toast === "function") toast(`${nft.name} ${t('stamina')} 0`, false);
        return;
      }
      this.selectedPlayerId = id;
      this.myNftName = nft.name;
      this.sp = nft;
      this.pregameEl.querySelectorAll("[data-nft-id]").forEach(c => {
        c.classList.toggle("pes-nft-pick-active", c.dataset.nftId === id);
      });
      const box = this.pregameEl.querySelector("#pes-sel-box");
      if (box) {
        box.innerHTML = `<img src="${nft.img || ""}" alt="${nft.name}" onerror="this.style.display='none'"><div class="pes-sel-info"><b>${nft.name}</b><span>${staminaIcons(nft)} ${t('stamina')}</span><span>${t('durability')} ${Math.round(Number(nft.durability) || 0)}%</span></div>`;
      }
      const nm = this.hudEl.querySelector("#pes-blue-nm");
      if (nm) nm.textContent = nft.name.toUpperCase();
      try { if (window.STATE) window.STATE.selectedPlayerId = id; if (typeof window.selectPlayer === "function") window.selectPlayer(id); } catch (e) {}
    }

    startMatch() {
      if (!this.sp) return;
      // Consumir stamina al inicio; si no hay wallet, no se consume (recreativo)
      if (!this.isRecreational) {
        if (this.sp.stamina <= 0) {
          if (typeof toast === "function") toast(t('noStamina'), false);
          return;
        }
        this.sp.stamina = Math.max(0, this.sp.stamina - 1);
        this.sp.durability = Math.max(0, +(this.sp.durability - 0.5).toFixed(1));
        this.staminaConsumed = true;
        if (typeof window.saveInventory === "function") window.saveInventory();
        if (typeof window.renderFutbolistaInventory === "function") window.renderFutbolistaInventory();
      }
      this.audio.whistle();
      this.state = "playing";
      this.pregameEl.style.display = "none";
      this.myGoals = 0; this.riGoals = 0; this.points = 0;
      this.half = 1; this.timeLeft = this.totalTime;
      this.ensureLoop();
      this.initTeams();
      this.kickOff("blue");
      this.showMsg(t('start'), "60 segundos");
    }

    initTeams() {
      const rc = this.opp.c;
      const c = { x: this.cW / 2, y: this.cH / 2 };
      this.players = [
        { id: "p1", name: this.myNftName, x: c.x - 120, y: c.y, homeX: c.x - 120, homeY: c.y, team: "blue", spd: 5.2, ctrl: true, keeper: false, col: "#ffe871" },
        { id: "p2", name: "Compañero", x: c.x - 220, y: c.y - 90, homeX: c.x - 220, homeY: c.y - 90, team: "blue", spd: 4.6, ctrl: false, keeper: false, col: "#ffe871" },
        { id: "p3", name: "Compañero", x: c.x - 220, y: c.y + 90, homeX: c.x - 220, homeY: c.y + 90, team: "blue", spd: 4.6, ctrl: false, keeper: false, col: "#ffe871" },
        { id: "gk", name: "Portero", x: 50, y: c.y, homeX: 50, homeY: c.y, team: "blue", spd: 3.8, ctrl: false, keeper: true, col: "#39ff88" },
        { id: "r1", name: this.opp.n, x: c.x + 120, y: c.y, homeX: c.x + 120, homeY: c.y, team: "red", spd: 4.35 * this.opp.a, ctrl: false, keeper: false, col: rc, aiState: "mark" },
        { id: "r2", name: "Defensa", x: c.x + 220, y: c.y - 90, homeX: c.x + 220, homeY: c.y - 90, team: "red", spd: 4.0 * this.opp.a, ctrl: false, keeper: false, col: rc, aiState: "mark" },
        { id: "r3", name: "Defensa", x: c.x + 220, y: c.y + 90, homeX: c.x + 220, homeY: c.y + 90, team: "red", spd: 4.0 * this.opp.a, ctrl: false, keeper: false, col: rc, aiState: "mark" },
        { id: "rgk", name: "Portero", x: this.cW - 50, y: c.y, homeX: this.cW - 50, homeY: c.y, team: "red", spd: 3.8, ctrl: false, keeper: true, col: "#ff4545" }
      ];
      this.active = this.players[0];
    }

    kickOff(team) {
      this.ball.x = this.cW / 2; this.ball.y = this.cH / 2; this.ball.vx = 0; this.ball.vy = 0;
      this.players.forEach(p => {
        if (p.team === "blue") { p.x = this.cW / 2 - 80 - rand(0, 40); p.y = this.cH / 2 + rand(-60, 60); }
        else { p.x = this.cW / 2 + 80 + rand(0, 40); p.y = this.cH / 2 + rand(-60, 60); }
      });
      this.ball.owner = null;
      if (team === "blue" && this.active) {
        this.active.x = this.ball.x - 20; this.active.y = this.ball.y;
        this.ball.owner = this.active;
      } else if (team === "red") {
        const starter = this.players.find(p => p.team === "red" && !p.keeper) || null;
        if (starter) { starter.x = this.ball.x + 20; starter.y = this.ball.y; this.ball.owner = starter; }
      }
    }

    loop(now) {
      if (this.state === "ended") { this.raf = null; return; }
      this.raf = requestAnimationFrame((t) => this.loop(t));
      if (this.hidden) return;
      const dt = Math.min(0.05, (now - this.lastT) / 1000 || 0);
      this.lastT = now;
      if (this.state === "playing") this.update(dt);
      this.updateFx(dt);
      this.draw();
      this.updateHud();
    }

    ensureLoop() {
      if (this.raf || this.state === "ended") return;
      this.lastT = performance.now();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) { this.endMatch(); return; }

      const frameScale = 60 * dt;
      this.tackleCooldown = Math.max(0, this.tackleCooldown - dt);

      // Jugador activo humano
      let mx = 0, my = 0;
      if (this.stick.active) { mx += this.stick.x; my += this.stick.y; }
      if (this.keys["w"] || this.keys["arrowup"]) my -= 1;
      if (this.keys["s"] || this.keys["arrowdown"]) my += 1;
      if (this.keys["a"] || this.keys["arrowleft"]) mx -= 1;
      if (this.keys["d"] || this.keys["arrowright"]) mx += 1;
      if (this.active && (mx !== 0 || my !== 0)) {
        const mag = Math.max(1, Math.hypot(mx, my));
        this.active.x += (mx / mag) * this.active.spd * frameScale;
        this.active.y += (my / mag) * this.active.spd * frameScale;
      }
      this.clampPlayer(this.active);

      this.updateBlueSupport(dt);
      this.updateRedAI(dt);
      this.updateKeepers(dt);
      this.updateBallPhysics(dt);
      this.resolvePossession();

      if (this.charging) this.charge = Math.min(1, this.charge + dt * 1.5);
    }

    clampPlayer(p) {
      if (!p) return;
      p.x = clamp(p.x, 20, this.cW - 20);
      p.y = clamp(p.y, 20, this.cH - 20);
    }

    movePlayerTowards(p, tx, ty, speedMul = 1) {
      if (!p) return;
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) return;
      const step = Math.min(d, p.spd * 60 * speedMul);
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      this.clampPlayer(p);
    }

    updateBlueSupport(dt) {
      this.players.filter(p => p.team === "blue" && !p.ctrl && !p.keeper).forEach(p => {
        const attacking = this.ball.owner && this.ball.owner.team === "blue";
        const tx = attacking ? Math.min(this.cW - 170, this.ball.x - 70) : Math.max(90, this.ball.x - 90);
        const ty = clamp(this.ball.y + (p.homeY > this.cH / 2 ? 65 : -65), 40, this.cH - 40);
        this.movePlayerTowards(p, tx, ty, dt * 0.95);
      });
    }

    updateRedAI(dt) {
      const redPlayers = this.players.filter(p => p.team === "red" && !p.keeper);
      redPlayers.forEach((p, idx) => {
        if (this.ball.owner === p) {
          p.aiState = "attack";
          const targetY = clamp(this.cH / 2 + Math.sin(performance.now() / 350 + idx) * 85, 50, this.cH - 50);
          this.movePlayerTowards(p, 38, targetY, dt * 0.92);
          if (p.x < this.cW * 0.28 || Math.random() < 0.004) this.redShootOrPass(p);
          return;
        }

        let tx = p.homeX || p.x;
        let ty = p.homeY || p.y;
        let aggression = 0.72;

        if (this.ball.owner && this.ball.owner.team === "blue") {
          const target = this.ball.owner;
          p.aiState = "chase";
          tx = target.x + (idx - 1) * 22;
          ty = target.y + (idx === 1 ? -18 : idx === 2 ? 18 : 0);
          aggression = 0.86;

          const dOwner = dist(p.x, p.y, target.x, target.y);
          if (dOwner < 28 && Math.random() < 0.028) {
            this.stealTo(p, target, "#ff4545");
            return;
          }
        } else if (!this.ball.owner) {
          p.aiState = "intercept";
          tx = this.ball.x + this.ball.vx * 5;
          ty = this.ball.y + this.ball.vy * 5;
          aggression = 0.96;
          if (dist(p.x, p.y, this.ball.x, this.ball.y) < 25) {
            this.ball.owner = p;
            this.audio.steal();
            this.spawnParts(p.x, p.y, "#ff4545", 8);
            return;
          }
        } else if (this.ball.owner && this.ball.owner.team === "red") {
          p.aiState = "support";
          tx = Math.max(80, this.ball.owner.x - 110 - idx * 18);
          ty = clamp(this.ball.owner.y + (idx - 1) * 70, 45, this.cH - 45);
          aggression = 0.82;
        }

        this.movePlayerTowards(p, tx, ty, dt * aggression);
      });
    }

    redShootOrPass(p) {
      if (this.state !== "playing" || this.ball.owner !== p) return;
      this.ball.owner = null;
      const targetY = this.cH / 2 + rand(-70, 70);
      const ang = Math.atan2(targetY - p.y, 0 - p.x);
      const power = p.x < this.cW * 0.32 ? 18 : 14;
      this.ball.vx = Math.cos(ang) * power;
      this.ball.vy = Math.sin(ang) * power;
      this.audio.kick();
      this.spawnParts(p.x, p.y, "#ff4545", 10);
    }

    updateKeepers(dt) {
      this.players.filter(p => p.keeper).forEach(k => {
        const targetY = clamp(this.ball.y, this.cH / 2 - 70, this.cH / 2 + 70);
        k.y += (targetY - k.y) * dt * 4;
        k.x = k.team === "blue" ? 40 : this.cW - 40;
      });
    }

    updateBallPhysics(dt) {
      if (this.ball.owner) {
        const dir = this.ball.owner.team === "blue" ? 1 : -1;
        this.ball.x = this.ball.owner.x + dir * 14;
        this.ball.y = this.ball.owner.y + 8;
        this.ball.vx = 0; this.ball.vy = 0;
        return;
      }

      const frameScale = 60 * dt;
      this.ball.x += this.ball.vx * frameScale;
      this.ball.y += this.ball.vy * frameScale;
      this.ball.vx *= Math.pow(0.985, frameScale);
      this.ball.vy *= Math.pow(0.985, frameScale);
      if (Math.abs(this.ball.vx) < 0.04) this.ball.vx = 0;
      if (Math.abs(this.ball.vy) < 0.04) this.ball.vy = 0;

      if (this.ball.y < this.ball.r || this.ball.y > this.cH - this.ball.r) {
        this.ball.vy *= -0.8;
        this.ball.y = clamp(this.ball.y, this.ball.r, this.cH - this.ball.r);
      }
      const gy = this.cH / 2; const gh = 90;
      if (this.ball.x < 20) {
        if (this.ball.y > gy - gh && this.ball.y < gy + gh) { this.riGoals++; this.goal("red"); }
        else { this.ball.vx *= -0.8; this.ball.x = 20; }
      }
      if (this.ball.x > this.cW - 20) {
        if (this.ball.y > gy - gh && this.ball.y < gy + gh) { this.myGoals++; this.goal("blue"); }
        else { this.ball.vx *= -0.8; this.ball.x = this.cW - 20; }
      }
    }

    resolvePossession() {
      if (this.ball.owner) return;
      let best = null, bd = 1e9;
      this.players.forEach(p => {
        const d = dist(p.x, p.y, this.ball.x, this.ball.y);
        if (d < 24 && d < bd) { bd = d; best = p; }
      });
      if (!best) return;
      this.ball.owner = best;
      if (best.team === "blue" && !best.keeper) {
        this.players.forEach(p => p.ctrl = false);
        best.ctrl = true; this.active = best;
      }
    }

    stealTo(taker, victim, color) {
      if (!taker || !victim) return;
      this.ball.owner = taker;
      if (taker.team === "blue" && !taker.keeper) {
        this.players.forEach(p => p.ctrl = false);
        taker.ctrl = true; this.active = taker;
      }
      this.audio.steal();
      this.spawnParts((taker.x + victim.x) / 2, (taker.y + victim.y) / 2, color || "#ffe871", 14);
      this.shake = 5;
    }

    doTackle() {
      if (this.state !== "playing" || !this.active || this.tackleCooldown > 0) return;
      this.tackleCooldown = 0.35;

      const rivalOwner = this.ball.owner && this.ball.owner.team !== "blue" ? this.ball.owner : null;
      if (rivalOwner && dist(this.active.x, this.active.y, rivalOwner.x, rivalOwner.y) <= 46) {
        this.stealTo(this.active, rivalOwner, "#39ff88");
        this.showMsg("¡ROBO!", "Balón recuperado");
        this.msg.timer = 0.75;
        return;
      }

      if (!this.ball.owner && dist(this.active.x, this.active.y, this.ball.x, this.ball.y) <= 30) {
        this.ball.owner = this.active;
        this.audio.steal();
        this.spawnParts(this.active.x, this.active.y, "#39ff88", 10);
        return;
      }

      this.audio.steal();
      this.spawnParts(this.active.x, this.active.y, "rgba(255,255,255,0.7)", 5);
    }

    doPass() {
      if (this.state !== "playing" || this.ball.owner !== this.active) return;
      this.ball.owner = null;
      const mates = this.players.filter(p => p.team === "blue" && !p.keeper && p !== this.active);
      let tgt = mates[0], best = 1e9;
      mates.forEach(m => { const d = dist(this.active.x, this.active.y, m.x, m.y); if (d < best) { best = d; tgt = m; } });
      // Pasar hacia adelante si es posible
      const fwd = mates.find(m => m.x > this.active.x && dist(this.active.x, this.active.y, m.x, m.y) < 260);
      if (fwd) tgt = fwd;
      const ang = Math.atan2(tgt.y - this.active.y, tgt.x - this.active.x);
      this.ball.vx = Math.cos(ang) * 17;
      this.ball.vy = Math.sin(ang) * 17;
      this.audio.pass();
      this.spawnParts(this.active.x, this.active.y, "#ffe871", 8);
    }

    startCharge() {
      if (this.state !== "playing" || this.ball.owner !== this.active) return;
      this.charging = true; this.charge = 0;
    }

    releaseShot() {
      if (!this.charging) return;
      this.charging = false;
      this.ball.owner = null;
      const aimY = this.stick.active ? (this.stick.y * 120) : rand(-60, 60);
      const targetY = this.cH / 2 + aimY;
      const ang = Math.atan2(targetY - this.active.y, this.cW - this.active.x);
      const power = 16 + this.charge * 16;
      this.ball.vx = Math.cos(ang) * power;
      this.ball.vy = Math.sin(ang) * power;
      this.charge = 0;
      this.audio.kick();
      this.shake = 10;
      this.spawnParts(this.active.x, this.active.y, "#ff8a3c", 16);
    }

    goal(team) {
      this.state = "goal";
      this.audio.goal();
      this.shake = 20;
      const title = team === "blue" ? `${t('goal')} ${this.myNftName.toUpperCase()}` : `${t('goal')} ${this.opp.n.toUpperCase()}`;
      this.showMsg(title, `${t('score')}: ${this.myGoals} - ${this.riGoals}`);
      this.spawnParts(team === "blue" ? this.cW - 30 : 30, this.cH / 2, team === "blue" ? "#3fbfff" : "#ff4545", 40);
      clearTimeout(this.goalTimeout);
      this.goalTimeout = setTimeout(() => {
        if (this.state !== "goal") return;
        this.state = "playing";
        this.kickOff(team === "blue" ? "red" : "blue");
      }, 2200);
    }

    showMsg(text, sub) { this.msg = { text, sub, timer: 2.2 }; }

    updateFx(dt) {
      this.shake = Math.max(0, this.shake - dt * 20);
      this.msg.timer = Math.max(0, this.msg.timer - dt);
      for (let i = 0; i < this.parts.length; i++) { const p = this.parts[i]; p.x += p.vx; p.y += p.vy; p.life -= dt; }
      let w = 0; for (let j = 0; j < this.parts.length; j++) { if (this.parts[j].life > 0) this.parts[w++] = this.parts[j]; }
      this.parts.length = w;
    }

    spawnParts(x, y, col, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 8;
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, col, r: 2 + Math.random() * 3, life: 1 });
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      ctx.clearRect(0, 0, this.cW, this.cH);

      // Pasto
      const sw = 60;
      for (let x = 0; x < this.cW; x += sw) { ctx.fillStyle = (x / sw) % 2 === 0 ? "#185a2a" : "#1e6b32"; ctx.fillRect(x, 0, sw, this.cH); }

      // Líneas
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, this.cW - 24, this.cH - 24);
      ctx.beginPath(); ctx.moveTo(this.cW / 2, 12); ctx.lineTo(this.cW / 2, this.cH - 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(this.cW / 2, this.cH / 2, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.arc(this.cW / 2, this.cH / 2, 6, 0, Math.PI * 2); ctx.fill();
      const gt = this.cH / 2 - 90, gh = 180;
      ctx.strokeRect(12, gt, 120, gh);
      ctx.strokeRect(this.cW - 132, gt, 120, gh);
      ctx.beginPath(); ctx.arc(132, this.cH / 2, 50, -Math.PI * 0.35, Math.PI * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(this.cW - 132, this.cH / 2, 50, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();

      // Porterías
      this.drawGoal(12, this.cH / 2, true);
      this.drawGoal(this.cW - 12, this.cH / 2, false);

      // Jugadores
      const ents = [...this.players].sort((a, b) => a.y - b.y);
      ents.forEach(p => this.drawPlayer(p));

      // Balón
      this.drawBall();

      // Indicador de carga de tiro
      if (this.charging && this.active) {
        ctx.save(); ctx.translate(this.active.x, this.active.y - 30);
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(-20, -4, 40, 8);
        ctx.fillStyle = `rgb(${255 - this.charge * 255}, ${this.charge * 255}, 0)`;
        ctx.fillRect(-20, -4, 40 * this.charge, 8);
        ctx.restore();
      }

      // Partículas
      ctx.globalAlpha = 1;
      this.parts.forEach(p => { ctx.fillStyle = p.col; ctx.globalAlpha = Math.max(0, p.life); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;

      // Mensaje central
      if (this.msg.timer > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, this.cH / 2 - 45, this.cW, 90);
        ctx.font = "900 2.2rem 'Oswald',system-ui,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowBlur = 14; ctx.shadowColor = "#ffe871"; ctx.fillStyle = "#ffe871";
        ctx.fillText(this.msg.text, this.cW / 2, this.cH / 2 - 10);
        ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
        ctx.font = "700 1rem 'Oswald',system-ui,sans-serif";
        ctx.fillText(this.msg.sub, this.cW / 2, this.cH / 2 + 18);
      }
      ctx.restore();
    }

    drawGoal(x, y, left) {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(left ? 0 : -60, -80, 60, 160);
      ctx.shadowBlur = 10; ctx.shadowColor = "#ffe871";
      ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 6;
      ctx.strokeRect(left ? 0 : -60, -80, 60, 160);
      ctx.restore();
    }

    drawPlayer(p) {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(p.x, p.y);
      const isActive = p === this.active;
      if (isActive || p === this.ball.owner) {
        ctx.save();
        ctx.shadowBlur = 12; ctx.shadowColor = p.team === "blue" ? "#39ff88" : "#ffe871";
        ctx.strokeStyle = p.team === "blue" ? "#39ff88" : "#ffe871"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 14, 20, 9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(0, 14, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.keeper ? "#222" : "#f1c27d";
      const st = Math.sin(performance.now() / 80) * 4;
      ctx.beginPath(); ctx.arc(-5, 10 + st, 4, 0, Math.PI * 2); ctx.arc(5, 10 - st, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.col;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-11, -9, 22, 18, 5);
      else ctx.rect(-11, -9, 22, 18);
      ctx.fill();
      ctx.fillStyle = p.keeper ? "#0a4a72" : "#fff";
      ctx.fillRect(-12, -7, 4, 7); ctx.fillRect(8, -7, 4, 7);
      ctx.fillStyle = "#f1c27d";
      ctx.beginPath(); ctx.arc(0, -11, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3a230b";
      ctx.beginPath(); ctx.arc(0, -12, 7.5, Math.PI * 0.8, Math.PI * 2.2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px 'Oswald',sans-serif"; ctx.textAlign = "center";
      ctx.fillText(p.name.slice(0, 3).toUpperCase(), 0, 1);
      ctx.restore();
    }

    drawBall() {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(this.ball.x, this.ball.y);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(2, 5, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = this.ball.owner ? 16 : 8; ctx.shadowColor = this.ball.owner ? (this.ball.owner.team === "blue" ? "#3fbfff" : "#ff4545") : "#fff";
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(0, 0, this.ball.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-6, -5, 4, 4); ctx.fillRect(2, -5, 4, 4); ctx.fillRect(-3, 5, 6, 3);
      ctx.restore();
    }

    updateHud() {
      if (this.ui.myG) this.ui.myG.textContent = this.myGoals;
      if (this.ui.riG) this.ui.riG.textContent = this.riGoals;
      if (this.ui.halfLbl) this.ui.halfLbl.textContent = "⏱";
      if (this.ui.time) {
        const remaining = Math.max(0, Math.ceil(this.timeLeft));
        const min = Math.floor(remaining / 60);
        const sec = remaining % 60;
        this.ui.time.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        this.ui.time.classList.toggle("danger", remaining <= 10 && this.state === "playing");
      }
    }

    endMatch() {
      if (this.state === "ended") return;
      this.state = "ended";
      this.timeLeft = 0;
      this.matchCompleted = true;
      clearTimeout(this.goalTimeout);
      this.audio.whistle();
      if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
      const win = this.myGoals > this.riGoals;
      const draw = this.myGoals === this.riGoals;
      const res = win ? t('win') : draw ? t('draw') : t('loss');
      let gems = 0, pts = 0;
      if (!this.isRecreational) {
        gems = win ? 25 : draw ? 10 : 0;
        pts = win ? 150 : draw ? 50 : 0;
      }
      const headline = win ? `🏆 ${t('win').toUpperCase()}` : draw ? `🤝 ${t('draw').toUpperCase()}` : `😔 ${t('loss').toUpperCase()}`;
      let sub = `${t('score')}: ${this.myGoals} - ${this.riGoals}`;
      if (gems > 0) sub += ` · 💎 +${gems}`;
      else if (this.isRecreational) sub += ` · ${t('noWalletNoGems')}`;
      else sub += ` · 0 💎`;

      this.endEl.style.display = "flex";
      this.endEl.innerHTML = `
        <h3 class="pes-end-title">${headline}</h3>
        <p class="pes-end-sub">${sub}</p>
        ${gems > 0 ? `<div class="pes-gems-announce">+${gems} ${t('gems')}</div>` : ''}
        <div class="pes-end-score">${this.myGoals} - ${this.riGoals}</div>
        <button class="pes-start-btn" id="pes-replay-btn" type="button">🔄 ${t('playAgain')}</button>
      `;
      const replay = this.endEl.querySelector("#pes-replay-btn");
      if (replay) replay.addEventListener("pointerdown", (e) => { e.preventDefault(); this.resetGame(); });
      this.emitResult(res, gems, pts);
    }

    resetGame() {
      this.endEl.style.display = "none";
      this.state = "pregame";
      this.pregameEl.style.display = "flex";
      this.myGoals = 0; this.riGoals = 0; this.points = 0;
      this.timeLeft = this.totalTime;
      this.staminaConsumed = false;
      this.matchCompleted = false;
      this.renderPreGame();
      this.ensureLoop();
    }

    emitResult(res, gems, pts) {
      const resultCode = this.myGoals > this.riGoals ? 'win' : this.myGoals === this.riGoals ? 'draw' : 'loss';
      const detail = {
        mode: this.mode, result: res, resultCode, score: `${this.myGoals} - ${this.riGoals}`,
        gemsDelta: gems, pointsDelta: pts, points: pts, wasPlayed: this.matchCompleted,
        consumedPlayerId: null
      };
      try {
        if (typeof this.onMatchEnd === "function") this.onMatchEnd(detail);
        window.dispatchEvent(new CustomEvent("futmundi:gameplay_match_ended", { detail }));
        if (gems > 0 && window.BetDB && window.BetDB.addGems) window.BetDB.addGems(gems);
      } catch (e) {}
    }

    destroyMatch() {
      // Si abandonó y había consumido stamina, no hay recompensa
      if (this.staminaConsumed && !this.matchCompleted && !this.isRecreational) {
        if (typeof toast === "function") toast(t('matchAbandoned'), false);
      }
      clearTimeout(this.goalTimeout);
      cancelAnimationFrame(this.raf);
      this.raf = null;
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
      if (this.ro && this.stageEl) try { this.ro.unobserve(this.stageEl); } catch (_) {}
      if (this.onResize) window.removeEventListener("resize", this.onResize);
      if (this.onVis && document.removeEventListener) document.removeEventListener("visibilitychange", this.onVis);
      const ov = document.getElementById("fm-pes-gameboy-overlay");
      if (ov) ov.hidden = true;
      document.body.classList.remove("fm-pes-game-active");
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    }
  }

  window.FutmundiPesGameApp = FutmundiPesGameApp;
  window.PurePesGameboyApp = FutmundiPesGameApp;
})();
