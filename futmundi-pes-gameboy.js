/* ==========================================================================
   FUTMUNDI PES / GAMEBOY ADVANCE — v5 "REGLAS FIFA"
   ──────────────────────────────────────────────────────────────────────────
   • API pública 100% compatible con v4 (drop-in para integration.js):
       window.FutmundiPesGameApp = window.PurePesGameboyApp = class
       new FutmundiPesGameApp(mountEl, mode, { onMatchEnd, onConsumeStamina, isRecreationalMode })
       app.destroyMatch()
       event "futmundi:gameplay_match_ended" { mode, result, score, gemsDelta,
         pointsDelta, points, wasPlayed, consumedPlayerId, tournament }
   • NUEVO en v5:
       - Saque de salida (kickoff) tras gol y al iniciar cada tiempo
       - Saque de banda (throw-in) cuando el balón sale por banda
       - Saque de esquina / córner cuando el defensor manda al fondo
       - Saque de arco (goal kick) cuando el atacante manda al fondo
       - Faltas con probabilidad calibrada en choques duros
       - Tarjeta amarilla / segunda amarilla = roja / roja directa
       - Tiro libre directo (free kick) ejecutado por la IA o el jugador
       - Penal (penalty) con minijuego de dirección + portero
       - Medio tiempo con descanso visual y cambio de campo
       - Tiempo añadido (added time) por faltas
       - Árbitro visual en cancha con tarjetas animadas
       - Bandera de línea para banda/córner
       - HUD ampliado con marcador, reloj real (45+45 escalados), tarjetas
   • Rendimiento:
       - DPR-aware (canvas crisp en retina sin reventar la GPU)
       - 1 sola requestAnimationFrame, dt capado, render con clip
       - Cache de geometría (postes, áreas) recalculada SÓLO en resize
       - Cero alocaciones por frame en hot path (reutiliza objetos)
   ========================================================================== */

(function () {
  if (window.__fm_pes_gameboy_installed) return;
  window.__fm_pes_gameboy_installed = true;

  // ============================================================
  //  CATÁLOGO DE EQUIPOS
  // ============================================================
  var TEAMS = [
    { n:"Curdo FC",       t:"Bronce",  a:1.1, c:"#8e8e8e", g:15,  p:120  },
    { n:"River Pinto",    t:"Bronce",  a:1.2, c:"#e04545", g:20,  p:140  },
    { n:"Boca Juniors",   t:"Bronce",  a:1.3, c:"#1e63d6", g:25,  p:160  },
    { n:"Atlas Tijuana",  t:"Bronce",  a:1.4, c:"#c3423f", g:30,  p:180  },
    { n:"Real Mandril",   t:"Bronce",  a:1.5, c:"#f5f5f5", g:35,  p:200  },
    { n:"Atleti Nuccia",  t:"Plata",   a:1.6, c:"#9c4137", g:45,  p:260  },
    { n:"Bayern M\u00fcnchen", t:"Plata", a:1.7, c:"#c20e1a", g:55, p:320 },
    { n:"Paris SG",       t:"Plata",   a:1.8, c:"#004170", g:65,  p:380  },
    { n:"Liverpool FC",   t:"Plata",   a:1.9, c:"#c8102e", g:75,  p:440  },
    { n:"Man City",       t:"Plata",   a:2.0, c:"#6cabdd", g:85,  p:500  },
    { n:"Juventus",       t:"Oro",     a:2.1, c:"#000000", g:100, p:600  },
    { n:"FC Barcelona",   t:"Oro",     a:2.2, c:"#a50044", g:120, p:700  },
    { n:"Real Madrid",    t:"Oro",     a:2.3, c:"#fcbf00", g:150, p:800  },
    { n:"Inter de Miami", t:"Leyenda", a:2.5, c:"#ff6f61", g:200, p:1000 },
    { n:"Man United",     t:"Leyenda", a:2.7, c:"#da291c", g:300, p:2500 }
  ];

  // ============================================================
  //  AUDIO
  // ============================================================
  function AudioEngine() {
    this.ctx = null;
    this.init = function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(function(){});
    };
    this.tone = function (f, t, d, v) {
      if (!this.ctx) return;
      try {
        var o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = t; o.frequency.value = f;
        g.gain.setValueAtTime(v, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + d);
        o.connect(g).connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + d);
      } catch (e) {}
    };
    this.kick    = function(){ this.tone(180,"triangle",0.08,0.15); };
    this.pass    = function(){ this.tone(320,"sine",0.06,0.10); };
    this.post    = function(){ this.tone(450,"square",0.10,0.20); };
    this.foul    = function(){ this.tone(140,"sawtooth",0.18,0.20); };
    this.card    = function(){ this.tone(660,"square",0.08,0.18); var s=this; setTimeout(function(){s.tone(440,"square",0.12,0.20);},100); };
    this.corner  = function(){ this.tone(520,"triangle",0.10,0.18); };
    this.throwin = function(){ this.tone(380,"triangle",0.08,0.14); };
    this.goalKick= function(){ this.tone(260,"triangle",0.12,0.16); };
    this.halftime= function(){ var s=this; this.tone(880,"sine",0.18,0.25);
      setTimeout(function(){s.tone(660,"sine",0.18,0.25);},180);
      setTimeout(function(){s.tone(440,"sine",0.35,0.25);},360); };
    this.goal    = function () {
      this.tone(440,"square",0.10,0.20);
      var s=this;
      setTimeout(function(){s.tone(554,"triangle",0.12,0.22);},100);
      setTimeout(function(){s.tone(659,"triangle",0.25,0.25);},220);
    };
    this.whistle = function () {
      this.tone(880,"sine",0.20,0.30);
      var s=this;
      setTimeout(function(){s.tone(920,"sine",0.30,0.30);},150);
    };
  }

  // ============================================================
  //  HELPERS
  // ============================================================
  function getAvailableNfts() {
    try {
      var inv = window.STATE && window.STATE.inventory;
      if (!inv || !inv.players) return [];
      return inv.players.filter(function (p) {
        return p && p.id && p.name;
      }).sort(function (a, b) {
        var sa = Number(a.stamina)||0, sb = Number(b.stamina)||0;
        if (sb !== sa) return sb - sa;
        return Number(b.durability||0) - Number(a.durability||0);
      });
    } catch (e) { return []; }
  }
  function staminaIcons(player) {
    var cur = Math.max(0, Math.min(4, Number(player.stamina)||0));
    var max = Number(player.maxStamina)||4;
    var s = "";
    for (var i=0; i<max; i++) s += (i < cur) ? "\u26bd" : "\u26aa";
    return s;
  }
  function clamp(v, a, b){ return v<a?a:v>b?b:v; }
  function rand(a,b){ return a + Math.random()*(b-a); }

  // ============================================================
  //  CLASE PRINCIPAL
  // ============================================================
  function FutmundiPesGameApp(mountEl, gameMode, cb) {
    var self = this;
    self.mountEl = mountEl;
    self.mode    = gameMode || "pve";
    self.onMatchEndCb     = (cb && cb.onMatchEnd) || null;
    self.onConsumeStamina = (cb && cb.onConsumeStamina) || null;
    self.isRecreational   = (cb && cb.isRecreationalMode) || false;

    // NFT seleccionado
    var sp = (typeof window.getSelectedPlayer === "function") ? window.getSelectedPlayer() : null;
    self.myNftName        = sp ? sp.name : "FUTBOLISTA";
    self.selectedPlayerId = sp ? sp.id   : null;
    self.chosenNftObj     = sp;
    self.wasPlayed        = false;

    // Torneo
    self.tIdx = 0;
    self.opp  = (self.mode === "tournament") ? TEAMS[0] :
                { n:"IA \u00c9lite Sports", t:"Pro", a:1.3, c:"#e04545", g:25, p:150 };

    // Reloj: simulamos 90' en 180s reales (factor 0.5 min/seg) => half = 90s reales = 45'
    self.halfSeconds = 90;          // duración real de un tiempo (segundos)
    self.minutesPerHalf = 45;       // minutos de juego mostrados
    self.addedTimeFirst  = 0;
    self.addedTimeSecond = 0;

    self.cW = 960; self.cH = 540;
    self.dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    self.audio = new AudioEngine();
    self.raf = null;
    self.running = false;

    self.stick = { x:0, y:0, active:false };
    self.keys  = {};
    self.shotCharge = 0;
    self.charging = false;
    self.shake = 0;
    self.parts = [];
    self.msgText = "";
    self.msgTimer = 0;
    self.msgSub = "";

    self.started   = false;
    self.over      = false;
    self.halfNum   = 1;            // 1 o 2
    self.halftime  = false;        // estamos en descanso
    self.halftimeT = 0;
    self.timeLeft  = self.halfSeconds; // descuento del tiempo del tiempo actual
    self.myG = 0; self.riG = 0; self.pts = 0;

    // Tarjetas y faltas
    self.cards = { blue: { yellow:0, red:0 }, red: { yellow:0, red:0 } };
    self.playerCards = {};         // id -> {yellow:0, red:0}
    self.refCardPopup = null;      // {color, x, y, t}
    self.fouls = { blue:0, red:0 };

    // Reanudación tras parada
    self.restart = null;
    // { kind: "kickoff"|"throwin"|"corner"|"goalkick"|"freekick"|"penalty",
    //   team: "blue"|"red", x, y, dirX, dirY, freeze, freezeT, decided }

    self._buildStage();
    self._wireEvents();

    try {
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock("landscape").catch(function(){});
    } catch (e) {}

    self.running = true;
    self.lastT = performance.now();
    self.raf = requestAnimationFrame(function (t) { self._loop(t); });
  }

  var P = FutmundiPesGameApp.prototype;

  // ============================================================
  //  DOM
  // ============================================================
  P._buildStage = function () {
    var self = this;
    var stage = document.createElement("div");
    stage.className = "pes-soccer-stage";

    var cv = document.createElement("canvas");
    cv.className = "pes-game-canvas";
    cv.width = self.cW; cv.height = self.cH;
    self.canvasEl = cv;
    self.ctx = cv.getContext("2d", { alpha:false, desynchronized:true });

    var hud = document.createElement("div");
    hud.className = "pes-hud-bar";
    hud.innerHTML =
      '<div class="pes-hud-badge"><span class="pes-hud-team blue" id="pes-blue-nm">' + self.myNftName.toUpperCase() + '</span>' +
        '<span class="pes-hud-goals" id="pes-my-g">0</span>' +
        '<span class="pes-hud-cards" id="pes-blue-cards"></span></div>' +
      '<div class="pes-hud-timer"><span id="pes-half-lbl">1T</span>' +
        '<strong id="pes-time">00:00</strong></div>' +
      '<div class="pes-hud-badge"><span class="pes-hud-cards" id="pes-red-cards"></span>' +
        '<span class="pes-hud-goals" id="pes-ri-g">0</span>' +
        '<span class="pes-hud-team red" id="pes-red-nm">' + self.opp.n.toUpperCase() + '</span></div>' +
      '<div class="pes-hud-pts"><span>\uD83C\uDFC6</span><strong id="pes-pts">0 PTS</strong></div>';

    var tc = document.createElement("div");
    tc.className = "pes-touch-controls";
    tc.innerHTML =
      '<div class="pes-joystick-base" id="pes-joy"><div class="pes-joystick-knob" id="pes-knob"></div></div>' +
      '<div class="pes-actions-cluster">' +
        '<div class="pes-btn-arcade pes-btn-pass" id="pes-pass">PASS</div>' +
        '<div class="pes-btn-arcade pes-btn-shot" id="pes-shot">SHOT</div>' +
      '</div>';

    // PRE-GAME
    var panel = document.createElement("div");
    panel.className = "pes-pre-game-panel";
    panel.id = "pes-pregame";
    var html = '';
    html += '<div class="pes-pg-header">';
    html += '  <span class="pes-pg-mode">\uD83C\uDFAE MODO ' + self.mode.toUpperCase() + '</span>';
    html += '  <span class="pes-pg-vs">vs ' + self.opp.n + ' (' + self.opp.t + ')</span>';
    html += '</div>';
    html += '<div class="pes-pg-title">\u26BD SELECCIONA TU FUTBOLISTA NFT</div>';
    html += '<div class="pes-pg-subtitle">Reglas FIFA: c\u00f3rner, banda, faltas, tarjetas, penal, medio tiempo</div>';
    html += '<div class="pes-nft-selector-grid" id="pes-nft-grid"></div>';
    html += '<div class="pes-pg-selected-box" id="pes-sel-box" style="display:none;"></div>';
    html += '<button class="pes-start-btn pes-start-disabled" id="pes-start-btn" type="button" disabled>';
    html += '\u26FD SELECCIONA UN NFT ARRIBA PARA EMPEZAR';
    html += '</button>';
    panel.innerHTML = html;
    self.pregameEl  = panel;
    self.nftGridEl  = panel.querySelector("#pes-nft-grid");
    self.selBoxEl   = panel.querySelector("#pes-sel-box");
    self.startBtnEl = panel.querySelector("#pes-start-btn");

    // END
    var endPanel = document.createElement("div");
    endPanel.className = "pes-end-panel";
    endPanel.id = "pes-endpanel";
    endPanel.style.display = "none";
    endPanel.innerHTML =
      '<h3 class="pes-end-title" id="pes-end-h"></h3>' +
      '<p class="pes-end-sub" id="pes-end-s"></p>' +
      '<div class="pes-end-score" id="pes-end-sc"></div>' +
      '<div class="pes-end-stats" id="pes-end-stats"></div>' +
      '<button class="pes-start-btn" id="pes-replay-btn" type="button">\uD83D\uDD04 JUGAR DE NUEVO</button>';
    self.endPanelEl = endPanel;

    // HALFTIME (overlay corto, dentro del stage)
    var ht = document.createElement("div");
    ht.className = "pes-halftime-overlay";
    ht.id = "pes-halftime";
    ht.style.display = "none";
    ht.innerHTML =
      '<div class="pes-ht-card">' +
        '<div class="pes-ht-title">\u23F8 MEDIO TIEMPO</div>' +
        '<div class="pes-ht-score" id="pes-ht-sc">0 - 0</div>' +
        '<div class="pes-ht-sub">Cambio de campo. Toca para continuar.</div>' +
        '<button class="pes-start-btn" id="pes-ht-btn" type="button">\u25B6 SEGUNDO TIEMPO</button>' +
      '</div>';
    self.halftimeEl = ht;

    stage.appendChild(cv);
    stage.appendChild(hud);
    stage.appendChild(tc);
    stage.appendChild(panel);
    stage.appendChild(endPanel);
    stage.appendChild(ht);

    self.mountEl.replaceChildren(stage);

    self.ui = {
      myG: stage.querySelector("#pes-my-g"),
      riG: stage.querySelector("#pes-ri-g"),
      time: stage.querySelector("#pes-time"),
      halfLbl: stage.querySelector("#pes-half-lbl"),
      pts: stage.querySelector("#pes-pts"),
      blueNm: stage.querySelector("#pes-blue-nm"),
      redNm: stage.querySelector("#pes-red-nm"),
      blueCards: stage.querySelector("#pes-blue-cards"),
      redCards:  stage.querySelector("#pes-red-cards"),
      joy: stage.querySelector("#pes-joy"),
      knob: stage.querySelector("#pes-knob"),
      pass: stage.querySelector("#pes-pass"),
      shot: stage.querySelector("#pes-shot"),
      endH: stage.querySelector("#pes-end-h"),
      endS: stage.querySelector("#pes-end-s"),
      endSc: stage.querySelector("#pes-end-sc"),
      endStats: stage.querySelector("#pes-end-stats"),
      replayBtn: stage.querySelector("#pes-replay-btn"),
      htBtn: stage.querySelector("#pes-ht-btn"),
      htSc:  stage.querySelector("#pes-ht-sc")
    };

    self._renderNftSelector();
  };

  // ============================================================
  //  SELECTOR DE NFT
  // ============================================================
  P._renderNftSelector = function () {
    var self = this;
    var nfts = getAvailableNfts();
    if (nfts.length === 0) {
      self.nftGridEl.innerHTML =
        '<div class="pes-nft-empty">\u26A0\uFE0F No tienes NFTs. Ve a Market para reclamar Neymar gratis o comprar un jugador.</div>';
      return;
    }
    var html = "";
    nfts.forEach(function (p) {
      var balls = staminaIcons(p);
      var hasEnergy = Number(p.stamina||0) > 0;
      var isCurrent = (p.id === self.selectedPlayerId);
      var cls = "pes-nft-pick" + (hasEnergy ? "" : " pes-nft-empty-card") + (isCurrent ? " pes-nft-pick-active" : "");
      html += '<div class="' + cls + '" data-nft-id="' + p.id + '">';
      html +=   '<img src="' + (p.img||"") + '" alt="' + (p.name||"") + '" loading="lazy" onerror="this.style.display=\'none\'">';
      html +=   '<div class="pes-nft-name">' + (p.name||"NFT") + '</div>';
      html +=   '<div class="pes-nft-balls">' + balls + '</div>';
      html +=   '<div class="pes-nft-dur">Dur: ' + Math.round(Number(p.durability||0)) + '%</div>';
      if (!hasEnergy) html += '<div class="pes-nft-noenergy">SIN BALONES</div>';
      html += '</div>';
    });
    self.nftGridEl.innerHTML = html;
    self._selectNftInUi(self.selectedPlayerId);
  };

  P._selectNftInUi = function (id) {
    var self = this;
    var nfts = getAvailableNfts();
    var nft = null;
    for (var i=0;i<nfts.length;i++) if (nfts[i].id === id) { nft = nfts[i]; break; }
    if (!nft) return;
    if (Number(nft.stamina||0) <= 0) {
      if (typeof toast === "function")
        toast(nft.name + " no tiene balones. Entr\u00e9nalo para recuperar.", false);
      return;
    }
    self.selectedPlayerId = id;
    self.chosenNftObj = nft;
    self.myNftName = nft.name;
    self.isRecreational = false;

    var cards = self.nftGridEl.querySelectorAll("[data-nft-id]");
    cards.forEach(function (c) {
      if (c.getAttribute("data-nft-id") === id) c.classList.add("pes-nft-pick-active");
      else c.classList.remove("pes-nft-pick-active");
    });

    var balls = staminaIcons(nft);
    self.selBoxEl.style.display = "block";
    self.selBoxEl.innerHTML =
      '<img src="' + (nft.img||"") + '" alt="' + nft.name + '">' +
      '<div class="pes-sel-info"><b>' + nft.name + '</b>' +
      '<span>' + balls + ' Balones</span>' +
      '<span>Durabilidad: ' + Math.round(Number(nft.durability||0)) + '%</span></div>';

    self.startBtnEl.disabled = false;
    self.startBtnEl.classList.remove("pes-start-disabled");
    self.startBtnEl.textContent = "\u26BD ENTRAR A JUGAR CON " + nft.name.toUpperCase() + " \u2714";

    if (self.ui.blueNm) self.ui.blueNm.textContent = nft.name.toUpperCase();

    try {
      if (window.STATE) window.STATE.selectedPlayerId = id;
      if (typeof window.selectPlayer === "function") window.selectPlayer(id);
    } catch (e) {}
  };

  P._resetSelection = function () {
    var self = this;
    self.selectedPlayerId = null;
    self.startBtnEl.disabled = true;
    self.startBtnEl.classList.add("pes-start-disabled");
    self.startBtnEl.textContent = "\u26FD SELECCIONA UN NFT ARRIBA PARA EMPEZAR";
    self.selBoxEl.style.display = "none";
    var cards = self.nftGridEl.querySelectorAll("[data-nft-id]");
    cards.forEach(function (c) { c.classList.remove("pes-nft-pick-active"); });
  };

  // ============================================================
  //  EVENTOS
  // ============================================================
  P._wireEvents = function () {
    var self = this;
    self.audio.init();

    self.nftGridEl.addEventListener("pointerdown", function (e) {
      var card = e.target.closest ? e.target.closest("[data-nft-id]") : null;
      if (!card) return;
      e.preventDefault(); e.stopPropagation();
      self._selectNftInUi(card.getAttribute("data-nft-id"));
    });

    self._startHandler = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (self.started || self.over) return;
      if (!self.selectedPlayerId) {
        self.nftGridEl.style.animation = "none";
        void self.nftGridEl.offsetWidth;
        self.nftGridEl.style.animation = "pesShake 0.4s";
        return;
      }
      self._beginMatch();
    };
    self.startBtnEl.addEventListener("pointerdown", self._startHandler);

    if (self.ui.replayBtn) {
      self.ui.replayBtn.addEventListener("pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        self.endPanelEl.style.display = "none";
        self.pregameEl.style.display = "flex";
        self.over = false; self.started = false;
        self.timeLeft = self.halfSeconds;
        self.halfNum = 1;
        self.myG = 0; self.riG = 0; self.pts = 0;
        self.cards = { blue:{yellow:0,red:0}, red:{yellow:0,red:0} };
        self.playerCards = {};
        self.fouls = { blue:0, red:0 };
        self._renderNftSelector();
        self._resetSelection();
      });
    }

    if (self.ui.htBtn) {
      self.ui.htBtn.addEventListener("pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        self._endHalftime();
      });
    }

    // Joystick
    var pid = null;
    if (self.ui.joy) {
      self.ui.joy.addEventListener("pointerdown", function (e) {
        pid = e.pointerId;
        try { self.ui.joy.setPointerCapture(pid); } catch (ex) {}
        self._joyMove(e);
      });
      self.ui.joy.addEventListener("pointermove", function (e) {
        if (e.pointerId === pid) self._joyMove(e);
      });
      var endJoy = function (e) {
        if (e.pointerId === pid) {
          pid = null;
          self.stick.x = 0; self.stick.y = 0; self.stick.active = false;
          if (self.ui.knob) self.ui.knob.style.transform = "none";
        }
      };
      self.ui.joy.addEventListener("pointerup", endJoy);
      self.ui.joy.addEventListener("pointercancel", endJoy);
    }

    if (self.ui.pass) {
      self.ui.pass.addEventListener("pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        self.audio.pass();
        self._doPassOrSetPiece();
      });
    }

    if (self.ui.shot) {
      self.ui.shot.addEventListener("pointerdown", function (e) {
        e.preventDefault(); e.stopPropagation();
        self.charging = true;
      });
      var endShot = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (self.charging) {
          self.charging = false;
          self.audio.kick();
          self._doShotOrSetPiece();
        }
      };
      self.ui.shot.addEventListener("pointerup", endShot);
      self.ui.shot.addEventListener("pointerleave", endShot);
    }

    self._onKeyDown = function (e) {
      var k = e.key.toLowerCase();
      self.keys[k] = true;
      if (k === " ") { e.preventDefault(); self.charging = true; }
      if (k === "k") { e.preventDefault(); self.audio.pass(); self._doPassOrSetPiece(); }
      if (k === "enter" && !self.started && !self.over) {
        if (self.selectedPlayerId) self._beginMatch();
      }
    };
    self._onKeyUp = function (e) {
      var k = e.key.toLowerCase();
      self.keys[k] = false;
      if (k === " " && self.charging) {
        e.preventDefault();
        self.charging = false;
        self.audio.kick();
        self._doShotOrSetPiece();
      }
    };
    window.addEventListener("keydown", self._onKeyDown);
    window.addEventListener("keyup", self._onKeyUp);
  };

  P._joyMove = function (e) {
    var self = this;
    e.preventDefault();
    var r = self.ui.joy.getBoundingClientRect();
    var cx = r.left + r.width/2, cy = r.top + r.height/2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    var maxR = r.width * 0.35;
    var dist = Math.hypot(dx, dy);
    var ang = Math.atan2(dy, dx);
    var rad = Math.min(dist, maxR);
    self.stick.x = Math.cos(ang); self.stick.y = Math.sin(ang); self.stick.active = true;
    if (self.ui.knob)
      self.ui.knob.style.transform =
        "translate(" + (Math.cos(ang)*rad) + "px," + (Math.sin(ang)*rad) + "px)";
  };

  // ============================================================
  //  COMIENZO DE PARTIDO
  // ============================================================
  P._beginMatch = function () {
    var self = this;
    self.audio.whistle();
    self.pregameEl.style.display = "none";
    self.started = true;
    self.over = false;
    self.wasPlayed = true;
    self.halfNum = 1;
    self.timeLeft = self.halfSeconds;
    self.addedTimeFirst = 0; self.addedTimeSecond = 0;
    self.myG = 0; self.riG = 0; self.pts = 0;
    self.cards = { blue:{yellow:0,red:0}, red:{yellow:0,red:0} };
    self.playerCards = {};
    self.fouls = { blue:0, red:0 };
    self.msgText = "\u00A1EMPIEZA EL PARTIDO!";
    self.msgSub  = "1\u00B0 TIEMPO \u2022 " + self.opp.n;
    self.msgTimer = 1.8;
    self._initEntities();
    // Kickoff inicial del equipo azul
    self._setRestart("kickoff", "blue", self.cW*0.5, self.cH*0.5, 1.2);
  };

  // ============================================================
  //  ENTIDADES
  // ============================================================
  P._initEntities = function () {
    var self = this;
    self.ball = { x:self.cW*0.5, y:self.cH*0.5, vx:0, vy:0, r:12, owner:null, curve:0 };

    self.myTeam = [
      { id:"p1", name:self.myNftName, x:350, y:270, vx:0, vy:0, spd:5.5, ctrl:true,  team:"blue", col:"#ffe871", sentOff:false },
      { id:"p2", name:"Compa\u00f1ero", x:250, y:150, vx:0, vy:0, spd:4.8, ctrl:false, team:"blue", col:"#ffe871", sentOff:false },
      { id:"p3", name:"T\u00e1ctico",   x:250, y:390, vx:0, vy:0, spd:4.8, ctrl:false, team:"blue", col:"#ffe871", sentOff:false },
      { id:"kp", name:"Portero", x:50,  y:270, vx:0, vy:0, spd:4.0, ctrl:false, team:"blue", keeper:true, col:"#39ff88", sentOff:false }
    ];
    var rc = self.opp.c;
    self.riTeam = [
      { id:"r1", name:self.opp.n, x:610, y:270, vx:0, vy:0, spd:4.6*self.opp.a, ctrl:false, team:"red", col:rc, sentOff:false },
      { id:"r2", name:"Def 1",    x:710, y:170, vx:0, vy:0, spd:4.3*self.opp.a, ctrl:false, team:"red", col:rc, sentOff:false },
      { id:"r3", name:"Def 2",    x:710, y:370, vx:0, vy:0, spd:4.3*self.opp.a, ctrl:false, team:"red", col:rc, sentOff:false },
      { id:"rk", name:"Keeper",   x:910, y:270, vx:0, vy:0, spd:4.1, ctrl:false, team:"red", keeper:true, col:"#ff4545", sentOff:false }
    ];
    self.activeP = self.myTeam[0];
    self.ref = { x: self.cW*0.5, y: self.cH*0.5 + 60 };
  };

  // ============================================================
  //  RESTART (kickoff, throwin, corner, goalkick, freekick, penalty)
  //  Esta es la pieza CLAVE de las reglas FIFA: el juego se "congela",
  //  el jugador correspondiente toma el balón en posición, y la
  //  reanudación se hace pulsando PASS (corto) o SHOT (largo/centro).
  // ============================================================
  P._setRestart = function (kind, team, x, y, freezeSec) {
    var self = this;
    var b = self.ball;
    b.x = x; b.y = y; b.vx = 0; b.vy = 0; b.curve = 0; b.owner = null;
    self.restart = {
      kind: kind, team: team, x: x, y: y,
      freeze: true, freezeT: freezeSec || 1.0, decided: false
    };

    // Asignar ejecutor: el jugador más cercano del equipo correspondiente
    var pool = (team === "blue") ? self.myTeam : self.riTeam;
    var taker = null, bd = 1e9;
    for (var i=0;i<pool.length;i++) {
      var p = pool[i];
      if (p.sentOff) continue;
      if (kind === "goalkick" && !p.keeper) continue; // portero saca de arco
      if (kind !== "goalkick" && p.keeper) continue;
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; taker = p; }
    }
    if (!taker) {
      // fallback: cualquier no expulsado
      for (var j=0;j<pool.length;j++) if (!pool[j].sentOff) { taker = pool[j]; break; }
    }
    if (taker) {
      taker.x = x + (team === "blue" ? -14 : 14);
      taker.y = y;
      b.owner = taker;
      if (team === "blue" && !taker.keeper) {
        self.myTeam.forEach(function (q) { q.ctrl = false; });
        taker.ctrl = true;
        self.activeP = taker;
      }
    }

    // Mensaje en pantalla
    var label = ({
      "kickoff":  "\u26BD SAQUE DE SALIDA",
      "throwin":  "\uD83D\uDC4B SAQUE DE BANDA",
      "corner":   "\uD83D\uDEA9 SAQUE DE ESQUINA",
      "goalkick": "\uD83E\uDDE4 SAQUE DE ARCO",
      "freekick": "\uD83D\uDD25 TIRO LIBRE",
      "penalty":  "\u26AB PENAL"
    })[kind] || "";
    self.msgText = label;
    self.msgSub = (team === "blue" ? self.myNftName : self.opp.n) + (kind === "penalty" ? " ejecuta" : "");
    self.msgTimer = Math.max(1.2, freezeSec || 1.0);

    // Sonido por tipo
    if (kind === "corner")    self.audio.corner();
    if (kind === "throwin")   self.audio.throwin();
    if (kind === "goalkick")  self.audio.goalKick();
    if (kind === "freekick")  self.audio.foul();
    if (kind === "penalty")   self.audio.foul();
  };

  // ============================================================
  //  AUTO-EJECUCIÓN IA en restarts del rival
  // ============================================================
  P._aiExecuteRestart = function () {
    var self = this;
    var r = self.restart; if (!r) return;
    if (r.team !== "red") return;
    if (r.decided) return;
    r.decided = true;

    var b = self.ball;
    if (r.kind === "penalty") {
      // Penal de la IA: 70% gol salvo paradón
      var save = Math.random() < 0.30;
      setTimeout(function () {
        b.owner = null;
        b.vx = -22; b.vy = (Math.random()-0.5)*6;
        if (save) { b.vx = -10; b.vy = (Math.random()-0.5)*14; }
        self.audio.kick();
        self.restart = null;
      }, 700);
      return;
    }
    // En kickoff/throwin/corner/goalkick/freekick → pase al área propia o centro
    setTimeout(function () {
      b.owner = null;
      var tx, ty;
      if (r.kind === "corner")      { tx = self.cW*0.18; ty = self.cH*0.5 + rand(-40, 40); }
      else if (r.kind === "goalkick"){ tx = self.cW*0.5; ty = rand(self.cH*0.3, self.cH*0.7); }
      else if (r.kind === "throwin") { tx = r.x + (r.x < self.cW*0.5 ? 80 : -80); ty = self.cH*0.5; }
      else if (r.kind === "freekick"){ tx = self.cW*0.2; ty = self.cH*0.5; }
      else { tx = self.cW*0.45; ty = self.cH*0.5; } // kickoff
      var ang = Math.atan2(ty - b.y, tx - b.x);
      var pow = (r.kind === "freekick" || r.kind === "corner") ? 17 : 13;
      b.vx = Math.cos(ang)*pow; b.vy = Math.sin(ang)*pow;
      self.audio.kick();
      self.restart = null;
    }, 700);
  };

  // ============================================================
  //  ACCIONES (con awareness de restarts)
  // ============================================================
  P._doPassOrSetPiece = function () {
    var self = this;
    var r = self.restart;
    if (r && r.team === "blue") {
      // ejecutar restart corto
      r.decided = true;
      self._executePlayerRestart("pass");
      return;
    }
    self._doPass();
  };
  P._doShotOrSetPiece = function () {
    var self = this;
    var r = self.restart;
    if (r && r.team === "blue") {
      r.decided = true;
      self._executePlayerRestart("shot");
      return;
    }
    self._doShot();
  };

  P._executePlayerRestart = function (kind) {
    var self = this;
    var r = self.restart; var b = self.ball;
    if (!r) return;
    b.owner = null;
    var dirX = 1, dirY = 0;
    if (self.stick.active) { dirX = self.stick.x; dirY = self.stick.y; }
    else { dirX = 1; dirY = 0; } // hacia portería rival por defecto
    var ang = Math.atan2(dirY, dirX);

    if (r.kind === "penalty") {
      // Penal del jugador: ángulo según joystick, velocidad alta
      ang = Math.atan2(dirY, 1);     // siempre hacia adelante
      var pow = 24;
      b.vx = Math.cos(ang)*pow; b.vy = Math.sin(ang)*pow;
      // Portero rival reacciona aleatorio
      var rk = self.riTeam.find(function(k){return k.keeper;});
      if (rk) rk._dive = Math.sign(rand(-1,1)) || 1;
      self.audio.kick();
    } else {
      var pow2 = (kind === "shot") ? 22 : 14;
      b.vx = Math.cos(ang)*pow2; b.vy = Math.sin(ang)*pow2;
      if (r.kind === "corner") { b.curve = (Math.random()-0.5)*3; }
      self.audio.kick();
    }
    self.restart = null;
  };

  P._doPass = function () {
    var self = this;
    if (self.ball.owner !== self.activeP) return;
    self.ball.owner = null;
    var a = self.activeP;
    var mates = self.myTeam.filter(function (p) { return !p.keeper && p !== a && !p.sentOff; });
    var tgt = mates[0], bd = 9999;
    mates.forEach(function (m) {
      var d = Math.hypot(m.x-a.x, m.y-a.y);
      if (d < bd) { bd = d; tgt = m; }
    });
    if (!tgt) tgt = { x: self.cW*0.8, y: a.y };
    var ang = Math.atan2(tgt.y-a.y, tgt.x-a.x);
    self.ball.vx = Math.cos(ang)*16;
    self.ball.vy = Math.sin(ang)*16;
    self.ball.x += Math.cos(ang)*12;
    self.ball.y += Math.sin(ang)*12;
    if (tgt && tgt.team === "blue") {
      self.myTeam.forEach(function (p) { p.ctrl = false; });
      tgt.ctrl = true; self.activeP = tgt;
    }
    self._spawnParts(a.x, a.y, "#ffe871", 10);
  };

  P._doShot = function () {
    var self = this;
    if (self.ball.owner !== self.activeP) return;
    self.ball.owner = null;
    var a = self.activeP;
    var ty = self.cH*0.5 + (Math.random()-0.5)*self.cH*0.3;
    var ang = Math.atan2(ty-a.y, self.cW-10);
    var pow = 20 + self.shotCharge*15;
    self.ball.vx = Math.cos(ang)*pow;
    self.ball.vy = Math.sin(ang)*pow;
    self.ball.curve = (Math.random()-0.5)*4;
    self.ball.x += Math.cos(ang)*15;
    self.ball.y += Math.sin(ang)*15;
    self.shotCharge = 0;
    self.shake = 12;
    self._spawnParts(a.x, a.y, "#ff8a3c", 20);
  };

  P._spawnParts = function (x, y, col, n) {
    var self = this;
    for (var i=0;i<n;i++) {
      var a = Math.random()*Math.PI*2, s = 2+Math.random()*8;
      self.parts.push({ x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, col:col, r:2+Math.random()*3, life:1, max:1 });
    }
  };

  // ============================================================
  //  GAME LOOP
  // ============================================================
  P._loop = function (now) {
    var self = this;
    if (!self.running) return;
    var dt = Math.min(0.05, (now - self.lastT)/1000 || 0);
    self.lastT = now;

    if (self.canvasEl) {
      var aw = Math.max(320, self.canvasEl.clientWidth || 960);
      var ah = Math.max(240, self.canvasEl.clientHeight || 540);
      if (self.cW !== aw || self.cH !== ah) {
        self.cW = aw; self.cH = ah;
        self.canvasEl.width  = aw * self.dpr;
        self.canvasEl.height = ah * self.dpr;
        self.canvasEl.style.width = aw + "px";
        self.canvasEl.style.height = ah + "px";
        self.ctx.setTransform(self.dpr,0,0,self.dpr,0,0);
      }
    }

    if (self.started && !self.over && !self.halftime) {
      if (self.restart && self.restart.freeze) {
        self.restart.freezeT -= dt;
        if (self.restart.freezeT <= 0) {
          self.restart.freeze = false;
          if (self.restart.team === "red") self._aiExecuteRestart();
        }
      } else {
        self._physics(dt);
      }
    }
    self._fx(dt);
    self._render();
    self._updUi();
    self.raf = requestAnimationFrame(function (t) { self._loop(t); });
  };

  // ============================================================
  //  FÍSICA + REGLAS
  // ============================================================
  P._physics = function (dt) {
    var self = this;
    self.timeLeft = Math.max(0, self.timeLeft - dt);

    // Fin de tiempo / medio tiempo / fin de partido
    if (self.timeLeft <= 0) {
      if (self.halfNum === 1) {
        self._startHalftime();
        return;
      } else if (!self.over) {
        self._endMatch();
        return;
      }
    }

    // Movimiento del jugador activo
    var mp = self.activeP;
    if (mp && !mp.sentOff && self.ball.owner !== mp) {
      var mx = 0, my = 0;
      if (self.stick.active) { mx += self.stick.x; my += self.stick.y; }
      if (self.keys["w"] || self.keys["arrowup"])    my -= 1;
      if (self.keys["s"] || self.keys["arrowdown"])  my += 1;
      if (self.keys["a"] || self.keys["arrowleft"])  mx -= 1;
      if (self.keys["d"] || self.keys["arrowright"]) mx += 1;
      if (mx !== 0 || my !== 0) {
        var ang = Math.atan2(my, mx);
        mp.x += Math.cos(ang)*mp.spd;
        mp.y += Math.sin(ang)*mp.spd;
      }
      mp.x = clamp(mp.x, 20, self.cW-20);
      mp.y = clamp(mp.y, 20, self.cH-20);
    }

    // Compañeros (movimiento simple por flujo)
    self.myTeam.forEach(function (p) {
      if (!p.ctrl && !p.keeper && !p.sentOff) {
        var tx = self.ball.x < self.cW*0.5 ? self.cW*0.45 : self.cW*0.8;
        p.x += (tx - p.x) * dt * 1.5;
        p.x = clamp(p.x, 20, self.cW-20);
      }
    });

    var b = self.ball;

    // IA rivales — persiguen balón y pueden cometer falta
    self.riTeam.forEach(function (r) {
      if (r.keeper || r.sentOff) return;
      var ang = Math.atan2(b.y - r.y, b.x - r.x);
      var d = Math.hypot(b.x - r.x, b.y - r.y);
      if (d > 15) {
        r.x += Math.cos(ang)*r.spd;
        r.y += Math.sin(ang)*r.spd;
      }
      r.x = clamp(r.x, 20, self.cW-20);

      // Si está MUY cerca del jugador azul controlado: posible falta
      var ap = self.activeP;
      if (ap && !ap.sentOff) {
        var pd = Math.hypot(ap.x - r.x, ap.y - r.y);
        if (pd < 16 && b.owner === ap && Math.random() < 0.008) {
          self._commitFoul("red", r, ap.x, ap.y);
          return;
        }
      }

      if (d < 20 && b.owner !== r) {
        b.owner = r;
        if (r.x < self.cW*0.35 || Math.random() < 0.08) {
          b.owner = null;
          var ty = self.cH*0.5 + (Math.random()-0.5)*self.cH*0.25;
          var sa = Math.atan2(ty - r.y, 0 - r.x);
          b.vx = Math.cos(sa)*16; b.vy = Math.sin(sa)*16;
          self.audio.kick();
        }
      }
    });

    // Porteros
    var mk = self.myTeam.find(function (k) { return k.keeper && !k.sentOff; });
    if (mk) { var gc = self.cH*0.5; mk.y += (clamp(b.y, gc-80, gc+80) - mk.y) * dt * 4; }
    var rk = self.riTeam.find(function (k) { return k.keeper && !k.sentOff; });
    if (rk) {
      var gc2 = self.cH*0.5;
      var target = clamp(b.y, gc2-80, gc2+80);
      if (rk._dive) { target += rk._dive * 60; rk._dive *= 0.96; if (Math.abs(rk._dive) < 0.05) rk._dive = 0; }
      rk.y += (target - rk.y) * dt * 4;
    }

    // Balón: con dueño o libre
    if (b.owner) {
      b.x = b.owner.x + (b.owner.team === "blue" ? 14 : -14);
      b.y = b.owner.y + 10;
      b.vx = 0; b.vy = 0;
    } else {
      b.x += b.vx; b.y += b.vy;
      b.vy += b.curve;
      b.vx *= 0.985; b.vy *= 0.985; b.curve *= 0.95;

      // ─── SALIDAS POR BANDA (throw-in) ───
      if (b.y < 12) {
        var lastTouch = self._lastTouchTeam || "blue";
        self.audio.throwin();
        // Saque de banda al equipo contrario
        self._setRestart("throwin", lastTouch === "blue" ? "red" : "blue",
                         clamp(b.x, 60, self.cW-60), 18, 1.0);
        return;
      }
      if (b.y > self.cH-12) {
        var lastTouch2 = self._lastTouchTeam || "blue";
        self.audio.throwin();
        self._setRestart("throwin", lastTouch2 === "blue" ? "red" : "blue",
                         clamp(b.x, 60, self.cW-60), self.cH-18, 1.0);
        return;
      }

      // ─── SALIDAS POR FONDO (córner o saque de arco) ───
      var gt = self.cH*0.5 - 80, gb = self.cH*0.5 + 80;

      if (b.x < 18) {
        if (b.y >= gt && b.y <= gb) {
          // GOL al equipo azul
          self.riG++;
          self._goal("red", "\u00A1GOL DE " + self.opp.n.toUpperCase() + "!");
          return;
        } else {
          // ¿Quién tocó por última vez?
          if (self._lastTouchTeam === "red") {
            // Defensor azul sacó → no aplica. El que envió al fondo fue rojo → córner para azul
            self._setRestart("corner", "blue", 22, b.y < self.cH*0.5 ? 22 : self.cH-22, 1.0);
          } else {
            // El que envió al fondo fue azul → saque de arco para azul
            self._setRestart("goalkick", "blue", 60, self.cH*0.5, 1.0);
          }
          return;
        }
      }
      if (b.x > self.cW-18) {
        if (b.y >= gt && b.y <= gb) {
          // GOL del azul
          self.myG++; self.pts += 10;
          self._goal("blue", "\u00A1GOLAZO DE " + self.myNftName.toUpperCase() + "!");
          return;
        } else {
          if (self._lastTouchTeam === "blue") {
            // Azul envió al fondo → córner para rojo
            self._setRestart("corner", "red", self.cW-22, b.y < self.cH*0.5 ? 22 : self.cH-22, 1.0);
          } else {
            // Rojo envió al fondo → saque de arco para rojo
            self._setRestart("goalkick", "red", self.cW-60, self.cH*0.5, 1.0);
          }
          return;
        }
      }

      // Recoger balón
      var picked = false;
      var all = self.myTeam.concat(self.riTeam);
      for (var i=0; i<all.length; i++) {
        var p = all[i];
        if (p.sentOff) continue;
        if (!b.owner && Math.hypot(b.x-p.x, b.y-p.y) < 22) {
          b.owner = p;
          self._lastTouchTeam = p.team;
          if (p.team === "blue" && !p.keeper) {
            self.myTeam.forEach(function (pp) { pp.ctrl = false; });
            p.ctrl = true;
            self.activeP = p;
          }
          picked = true;
          break;
        }
      }
      if (!picked) {
        // Si el balón está en movimiento, marcamos último toque por velocidad
        if (Math.abs(b.vx) > 0.5 || Math.abs(b.vy) > 0.5) {
          // mantenemos _lastTouchTeam previo
        }
      }
    }

    if (self.charging) self.shotCharge = Math.min(1.0, self.shotCharge + dt*1.5);
  };

  // ============================================================
  //  FALTAS, TARJETAS, EXPULSIÓN
  // ============================================================
  P._commitFoul = function (offenderTeam, offender, fx, fy) {
    var self = this;
    self.audio.foul();
    self.fouls[offenderTeam]++;
    self.addedTimeFirst  = self.halfNum === 1 ? self.addedTimeFirst + 0.1  : self.addedTimeFirst;
    self.addedTimeSecond = self.halfNum === 2 ? self.addedTimeSecond + 0.1 : self.addedTimeSecond;

    // ¿Penal? Falta dentro del área rival
    var inMyBox  = (fx < 150);                  // área del equipo azul
    var inRiBox  = (fx > self.cW - 150);        // área del equipo rojo
    var isPenalty = (offenderTeam === "red" && inMyBox) || (offenderTeam === "blue" && inRiBox);

    // Tarjeta: 35% amarilla, 6% roja directa
    var rnd = Math.random();
    var card = null;
    if (rnd < 0.06) card = "red";
    else if (rnd < 0.41) card = "yellow";

    if (card) self._showCard(offender, card, fx, fy);

    if (isPenalty) {
      // Penal al equipo que recibió la falta
      var team = (offenderTeam === "red") ? "blue" : "red";
      var px = (team === "blue") ? self.cW - 110 : 110;
      var py = self.cH*0.5;
      self._setRestart("penalty", team, px, py, 1.6);
    } else {
      // Tiro libre en el sitio de la falta
      var teamFK = (offenderTeam === "red") ? "blue" : "red";
      self._setRestart("freekick", teamFK, clamp(fx, 40, self.cW-40), clamp(fy, 40, self.cH-40), 1.2);
    }
  };

  P._showCard = function (player, color, x, y) {
    var self = this;
    self.audio.card();
    var team = player.team;
    if (!self.playerCards[player.id]) self.playerCards[player.id] = { yellow:0, red:0 };
    var pc = self.playerCards[player.id];

    if (color === "yellow") {
      pc.yellow++;
      self.cards[team].yellow++;
      if (pc.yellow >= 2) {
        // segunda amarilla = roja
        pc.red = 1;
        self.cards[team].red++;
        player.sentOff = true;
        self.msgText = "\uD83D\uDFE5 DOBLE AMARILLA \u2192 ROJA";
        self.msgSub = (player.name || "Jugador") + " expulsado";
        self.msgTimer = 2.2;
      } else {
        self.msgText = "\uD83D\uDFE8 TARJETA AMARILLA";
        self.msgSub = (player.name || "Jugador") + " amonestado";
        self.msgTimer = 1.8;
      }
    } else {
      pc.red = 1;
      self.cards[team].red++;
      player.sentOff = true;
      self.msgText = "\uD83D\uDFE5 TARJETA ROJA";
      self.msgSub = (player.name || "Jugador") + " expulsado";
      self.msgTimer = 2.2;
    }

    // Popup visual del árbitro
    self.refCardPopup = { color: color, x: x, y: y - 30, t: 1.8 };
    // Acercar árbitro a la jugada
    self.ref.x = x; self.ref.y = y + 30;

    // Si el jugador activo fue expulsado, pasar control al siguiente azul
    if (player.team === "blue" && player.sentOff && player === self.activeP) {
      var nxt = self.myTeam.find(function (p) { return !p.keeper && !p.sentOff && p !== player; });
      if (nxt) { self.myTeam.forEach(function(q){q.ctrl=false;}); nxt.ctrl=true; self.activeP = nxt; }
    }
  };

  // ============================================================
  //  GOL
  // ============================================================
  P._goal = function (team, txt) {
    var self = this;
    self.audio.goal();
    self.shake = 20;
    self.msgText = txt;
    self.msgSub = self.myG + " - " + self.riG;
    self.msgTimer = 2.5;
    self._spawnParts(team === "blue" ? self.cW-30 : 30, self.cH*0.5,
                     team === "blue" ? "#3fbfff" : "#ff4545", 50);
    var b = self.ball;
    setTimeout(function () {
      // Resetear posiciones y kickoff del que recibió gol
      b.x = self.cW/2; b.y = self.cH/2; b.vx=0; b.vy=0; b.owner=null; b.curve=0;
      if (self.myTeam[0]) { self.myTeam[0].x = self.cW*0.4; self.myTeam[0].y = self.cH*0.5; }
      if (self.riTeam[0]) { self.riTeam[0].x = self.cW*0.6; self.riTeam[0].y = self.cH*0.5; }
      self._setRestart("kickoff", team === "blue" ? "red" : "blue", self.cW*0.5, self.cH*0.5, 1.4);
    }, 1500);
  };

  // ============================================================
  //  MEDIO TIEMPO
  // ============================================================
  P._startHalftime = function () {
    var self = this;
    self.halftime = true;
    self.audio.halftime();
    if (self.ui.htSc) self.ui.htSc.textContent = self.myG + " - " + self.riG;
    self.halftimeEl.style.display = "flex";
    self.msgText = "MEDIO TIEMPO";
    self.msgSub  = self.myG + " - " + self.riG;
    self.msgTimer = 0;
  };
  P._endHalftime = function () {
    var self = this;
    self.halftime = false;
    self.halftimeEl.style.display = "none";
    self.halfNum = 2;
    self.timeLeft = self.halfSeconds;
    // Cambiamos campo invirtiendo dirección de ataque visualmente con un kickoff del rival
    self.audio.whistle();
    self.msgText = "\u00A1ARRANCA EL 2\u00B0 TIEMPO!";
    self.msgSub  = "";
    self.msgTimer = 1.6;
    self._setRestart("kickoff", "red", self.cW*0.5, self.cH*0.5, 1.2);
  };

  // ============================================================
  //  FIN DE PARTIDO
  // ============================================================
  P._endMatch = function () {
    var self = this;
    self.over = true; self.started = false;
    self.audio.whistle();

    var win  = self.myG > self.riG;
    var draw = self.myG === self.riG;
    var res  = win ? "Victoria" : draw ? "Empate" : "Derrota";
    var sc   = self.myG + " - " + self.riG;

    var gems = win ? (self.opp.g||25) : draw ? 5 : 0;
    var pts  = win ? (self.opp.p||150) : draw ? 30 : 0;
    if (self.isRecreational) gems = 0;

    var headline, sub;
    if (self.mode === "tournament") {
      if (win || draw) {
        self.tIdx++;
        if (self.tIdx >= TEAMS.length) {
          gems += 500; pts += 5000;
          headline = "\uD83C\uDFC6 \u00A1CAMPE\u00D3N MUNDIAL!";
          sub = "Derrotaste a todos. +" + gems + " GEMAS";
          self._showEnd(headline, sub, sc);
          self._emit(res, sc, gems, pts, true);
          return;
        }
        var next = TEAMS[self.tIdx];
        self.opp = next;
        headline = "\u00A1" + res + "! Ronda " + (self.tIdx+1) + "/15";
        sub = "Siguiente: " + next.n + " (" + next.t + ")";
      } else {
        headline = "\uD83D\uDCA5 ELIMINADO";
        sub = "Ca\u00EDste ante " + self.opp.n + ". Rondas: " + self.tIdx + "/15";
        self._showEnd(headline, sub, sc);
        self._emit("Derrota", sc, 0, 10, true);
        return;
      }
    } else {
      headline = "\u26BD " + res + " en el " + (self.mode === "pvp" ? "Estadio" : "Cancha");
      sub = "Marcador: " + sc + " \u2192 \uD83D\uDC8E +" + gems + " Gemas";
    }

    self._showEnd(headline, sub, sc);
    self._emit(res, sc, gems, pts, true);
  };

  P._showEnd = function (h, s, sc) {
    var self = this;
    if (self.ui.endH)  self.ui.endH.textContent  = h;
    if (self.ui.endS)  self.ui.endS.textContent  = s;
    if (self.ui.endSc) self.ui.endSc.textContent = sc;
    if (self.ui.endStats) {
      self.ui.endStats.innerHTML =
        '<div class="pes-end-stat-row">' +
          '<span>\uD83D\uDFE8 ' + self.cards.blue.yellow + ' / \uD83D\uDFE5 ' + self.cards.blue.red + '</span>' +
          '<span>Faltas: ' + self.fouls.blue + ' \u2014 ' + self.fouls.red + '</span>' +
          '<span>\uD83D\uDFE8 ' + self.cards.red.yellow + ' / \uD83D\uDFE5 ' + self.cards.red.red + '</span>' +
        '</div>';
    }
    self.endPanelEl.style.display = "flex";
    self.wasPlayed = false;
  };

  P._emit = function (res, sc, gems, pts, fin) {
    var self = this;
    var d = {
      mode: self.mode, result: res, score: sc, gemsDelta: gems,
      pointsDelta: pts, points: pts, wasPlayed: true,
      consumedPlayerId: self.selectedPlayerId,
      stats: {
        cards: self.cards,
        fouls: self.fouls,
        addedTime: { first: self.addedTimeFirst, second: self.addedTimeSecond }
      },
      tournament: self.mode === "tournament" ? {
        round: self.tIdx, champion: fin && res === "Victoria",
        eliminated: fin && res === "Derrota", highestTier: self.opp.t, finalScore: pts
      } : null
    };
    try {
      if (typeof self.onMatchEndCb === "function") self.onMatchEndCb(d);
      window.dispatchEvent(new CustomEvent("futmundi:gameplay_match_ended", { detail: d }));
      if (gems > 0 && typeof BetDB !== "undefined" && BetDB.addGems) BetDB.addGems(gems);
    } catch (e) {}
  };

  // ============================================================
  //  FX
  // ============================================================
  P._fx = function (dt) {
    var self = this;
    self.shake = Math.max(0, self.shake - dt*20);
    self.msgTimer = Math.max(0, self.msgTimer - dt);
    if (self.refCardPopup) {
      self.refCardPopup.t -= dt;
      if (self.refCardPopup.t <= 0) self.refCardPopup = null;
    }
    for (var i=0; i<self.parts.length; i++) {
      var p = self.parts[i];
      p.x += p.vx; p.y += p.vy; p.life -= dt;
    }
    // Compactar sin .filter (menos GC)
    var w = 0;
    for (var j=0; j<self.parts.length; j++) {
      if (self.parts[j].life > 0) self.parts[w++] = self.parts[j];
    }
    self.parts.length = w;
  };

  // ============================================================
  //  RENDER
  // ============================================================
  P._render = function () {
    var self = this;
    var ctx = self.ctx;
    ctx.save();
    ctx.clearRect(0, 0, self.cW, self.cH);
    if (self.shake > 0)
      ctx.translate((Math.random()-0.5)*self.shake, (Math.random()-0.5)*self.shake);

    // Pasto rayado
    var sw = 60;
    for (var x=0; x<self.cW; x+=sw) {
      ctx.fillStyle = (x/sw)%2 === 0 ? "#185a2a" : "#1e6b32";
      ctx.fillRect(x, 0, sw, self.cH);
    }

    // Líneas
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = "#fff";
    ctx.strokeStyle = "rgba(255,255,255,0.88)"; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, self.cW-20, self.cH-20);
    var mx = self.cW*0.5, my = self.cH*0.5;
    ctx.beginPath(); ctx.moveTo(mx, 10); ctx.lineTo(mx, self.cH-10); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx, my, 70, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(mx, my, 8, 0, Math.PI*2); ctx.fill();
    var gt = my - 80;
    ctx.strokeRect(10, gt-20, 140, 200);
    ctx.strokeRect(10, gt+10, 60, 160);
    ctx.beginPath(); ctx.arc(150, my, 50, -Math.PI*0.35, Math.PI*0.35); ctx.stroke();
    ctx.strokeRect(self.cW-150, gt-20, 140, 200);
    ctx.strokeRect(self.cW-70, gt+10, 60, 160);
    ctx.beginPath(); ctx.arc(self.cW-150, my, 50, Math.PI*0.65, Math.PI*1.35); ctx.stroke();
    // Puntos de penal
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(110, my, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(self.cW-110, my, 3, 0, Math.PI*2); ctx.fill();
    // Arcos de córner
    ctx.beginPath(); ctx.arc(10, 10, 8, 0, Math.PI*0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(self.cW-10, 10, 8, Math.PI*0.5, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, self.cH-10, 8, -Math.PI*0.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(self.cW-10, self.cH-10, 8, Math.PI, Math.PI*1.5); ctx.stroke();
    ctx.restore();

    // Porterías
    function net(gx, gy, left) {
      ctx.save(); ctx.translate(gx, gy);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillRect(left?0:-60, -80, 60, 160);
      ctx.shadowBlur = 10; ctx.shadowColor = "#ffe871";
      ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 8;
      ctx.strokeRect(left?0:-60, -80, 60, 160);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.strokeRect(left?0:-60, -80, 60, 160);
      ctx.restore();
    }
    net(10, my, true);
    net(self.cW-10, my, false);

    // Banderines de córner
    var flags = [[12,12],[self.cW-12,12],[12,self.cH-12],[self.cW-12,self.cH-12]];
    flags.forEach(function (f) {
      ctx.save(); ctx.translate(f[0], f[1]);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-14); ctx.stroke();
      ctx.fillStyle = "#ffe871";
      ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(8,-11); ctx.lineTo(0,-8); ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    // Árbitro
    ctx.save();
    ctx.translate(self.ref.x, self.ref.y);
    ctx.fillStyle = "#111";
    ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = "#f1c27d";
    ctx.beginPath(); ctx.arc(0, -12, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Jugadores
    var ents = self.myTeam.concat(self.riTeam).sort(function (a,b) { return a.y - b.y; });
    ents.forEach(function (pl) {
      if (pl.sentOff) return; // expulsado no se renderiza
      var hb = self.ball.owner === pl;
      var mc = pl === self.activeP;
      ctx.save();
      ctx.translate(pl.x, pl.y);
      if (hb) {
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = pl.team === "blue" ? "#39ff88" : "#ffe871";
        ctx.strokeStyle = pl.team === "blue" ? "#39ff88" : "#ffe871"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 16, 22, 11, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      } else if (mc) {
        ctx.save();
        ctx.globalAlpha = 0.85; ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, 16, 18, 9, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI*2); ctx.fill();
      }
      var st = (pl.vx !== 0 || pl.vy !== 0) ? Math.sin(performance.now()/80)*6 : 0;
      ctx.fillStyle = pl.keeper ? "#222" : "#f1c27d";
      ctx.beginPath(); ctx.arc(-6, 12+st, 4, 0, Math.PI*2); ctx.arc(6, 12-st, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#000"; ctx.fillRect(-8, 16+st, 6, 5); ctx.fillRect(4, 16-st, 6, 5);
      ctx.fillStyle = pl.col;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-12, -10, 24, 20, 6);
      else ctx.rect(-12, -10, 24, 20);
      ctx.fill();
      ctx.fillStyle = pl.keeper ? "#0a4a72" : "#fff";
      ctx.fillRect(-14, -8, 5, 10); ctx.fillRect(9, -8, 5, 10);
      ctx.fillStyle = "#f1c27d";
      ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = pl.keeper ? "#ff4545" : "#3a230b";
      ctx.beginPath(); ctx.arc(0, -14, 8.5, Math.PI*0.8, Math.PI*2.2); ctx.fill();
      ctx.fillStyle = pl.team === "blue" ? "#000" : "#fff";
      ctx.font = "bold 10px 'Oswald',sans-serif"; ctx.textAlign = "center";
      ctx.fillText((pl.name||"").slice(0,3).toUpperCase(), 0, 2);
      // Tarjetas sobre el jugador
      var pc = self.playerCards[pl.id];
      if (pc && (pc.yellow || pc.red)) {
        if (pc.red)    { ctx.fillStyle = "#e02020"; ctx.fillRect(10, -22, 5, 7); }
        else if (pc.yellow) { ctx.fillStyle = "#ffd60a"; ctx.fillRect(10, -22, 5, 7); }
      }
      ctx.restore();
    });

    // Balón
    var b = self.ball;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.ellipse(2, 6, 10, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = b.owner ? 20 : 10;
    ctx.shadowColor = b.owner ? (b.owner.team === "blue" ? "#3fbfff" : "#ff4545") : "#fff";
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(-8, -6, 5, 5); ctx.fillRect(3, -6, 5, 5); ctx.fillRect(-4, 7, 8, 4);
    ctx.restore();

    // Partículas
    for (var i=0; i<self.parts.length; i++) {
      var pp = self.parts[i];
      ctx.fillStyle = pp.col;
      ctx.globalAlpha = Math.max(0, pp.life);
      ctx.beginPath(); ctx.arc(pp.x, pp.y, pp.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Tarjeta del árbitro (popup grande)
    if (self.refCardPopup) {
      var c = self.refCardPopup;
      var alpha = clamp(c.t / 1.8, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(-0.25);
      ctx.fillStyle = c.color === "yellow" ? "#ffd60a" : "#e02020";
      ctx.shadowBlur = 14; ctx.shadowColor = c.color === "yellow" ? "#ffd60a" : "#e02020";
      ctx.fillRect(-14, -22, 28, 44);
      ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.strokeRect(-14, -22, 28, 44);
      ctx.restore();
    }

    // Indicador de restart (anillo en la posición del balón parado)
    if (self.restart && self.restart.freeze) {
      ctx.save();
      ctx.strokeStyle = self.restart.team === "blue" ? "#39ff88" : "#ff4545";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(self.restart.x, self.restart.y,
              18 + Math.sin(performance.now()/120)*3, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // Mensaje central
    if (self.msgTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, self.cH/2 - 50, self.cW, 100);
      ctx.font = "950 2.4rem 'Oswald',system-ui,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowBlur = 15; ctx.shadowColor = "#ffe871"; ctx.fillStyle = "#ffe871";
      ctx.fillText(self.msgText, self.cW/2, self.cH/2 - 12);
      if (self.msgSub) {
        ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
        ctx.font = "700 1rem 'Oswald',system-ui,sans-serif";
        ctx.fillText(self.msgSub, self.cW/2, self.cH/2 + 22);
      }
      ctx.restore();
    }

    ctx.restore();
  };

  // ============================================================
  //  HUD
  // ============================================================
  P._updUi = function () {
    var self = this;
    if (self.ui.myG) self.ui.myG.textContent = self.myG;
    if (self.ui.riG) self.ui.riG.textContent = self.riG;
    if (self.ui.pts) self.ui.pts.textContent = self.pts + " PTS";
    if (self.ui.halfLbl) self.ui.halfLbl.textContent = self.halfNum === 1 ? "1T" : "2T";
    if (self.ui.time) {
      // Mapeo: timeLeft (segundos reales del tiempo actual) → minutos jugados
      var elapsedSec = self.halfSeconds - self.timeLeft;
      var ratio = self.minutesPerHalf / self.halfSeconds;
      var minPlayed = Math.floor(elapsedSec * ratio) + (self.halfNum === 2 ? self.minutesPerHalf : 0);
      minPlayed = clamp(minPlayed, self.halfNum === 1 ? 0 : 45, self.halfNum === 1 ? 45 : 90);
      var disp = String(minPlayed).padStart(2,"0") + "'";
      var add = self.halfNum === 1 ? self.addedTimeFirst : self.addedTimeSecond;
      if (add >= 1) disp += " +" + Math.floor(add);
      self.ui.time.textContent = disp;
    }
    if (self.ui.blueCards) {
      self.ui.blueCards.innerHTML =
        (self.cards.blue.yellow ? '<span class="pes-card-y">'+self.cards.blue.yellow+'</span>' : '') +
        (self.cards.blue.red    ? '<span class="pes-card-r">'+self.cards.blue.red+'</span>'    : '');
    }
    if (self.ui.redCards) {
      self.ui.redCards.innerHTML =
        (self.cards.red.yellow ? '<span class="pes-card-y">'+self.cards.red.yellow+'</span>' : '') +
        (self.cards.red.red    ? '<span class="pes-card-r">'+self.cards.red.red+'</span>'    : '');
    }
  };

  // ============================================================
  //  DESTRUIR
  // ============================================================
  P.destroyMatch = function () {
    var self = this;
    self.running = false;
    cancelAnimationFrame(self.raf);
    window.removeEventListener("keydown", self._onKeyDown);
    window.removeEventListener("keyup", self._onKeyUp);
    var ov = document.getElementById("fm-pes-gameboy-overlay");
    if (ov) ov.hidden = true;
    document.body.classList.remove("fm-pes-game-active");
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
  };

  // ============================================================
  //  EXPORT
  // ============================================================
  window.PurePesGameboyApp = FutmundiPesGameApp;
  window.FutmundiPesGameApp = FutmundiPesGameApp;
})();
