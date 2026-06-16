/* ==========================================================================
   FUTMUNDI PES / GAMEBOY ADVANCE v4
   - SELECTOR DE NFT dentro del overlay (balones visibles, ordenamiento auto)
   - Botón de inicio con pointerdown (SÍ funciona en móvil Telegram WebView)
   - Consumo diferido de estamina (no pierde balones si no juega)
   ========================================================================== */

(function () {
  if (window.__fm_pes_gameboy_installed) return;
  window.__fm_pes_gameboy_installed = true;

  var TEAMS = [
    { n:"Curdo FC", t:"Bronce", a:1.1, c:"#8e8e8e", g:15, p:120 },
    { n:"River Pinto", t:"Bronce", a:1.2, c:"#e04545", g:20, p:140 },
    { n:"Boca Juniors", t:"Bronce", a:1.3, c:"#1e63d6", g:25, p:160 },
    { n:"Atlas Tijuana", t:"Bronce", a:1.4, c:"#c3423f", g:30, p:180 },
    { n:"Real Mandril", t:"Bronce", a:1.5, c:"#f5f5f5", g:35, p:200 },
    { n:"Atleti Nuccia", t:"Plata", a:1.6, c:"#9c4137", g:45, p:260 },
    { n:"Bayern M\u00fcnchen", t:"Plata", a:1.7, c:"#c20e1a", g:55, p:320 },
    { n:"Paris SG", t:"Plata", a:1.8, c:"#004170", g:65, p:380 },
    { n:"Liverpool FC", t:"Plata", a:1.9, c:"#c8102e", g:75, p:440 },
    { n:"Man City", t:"Plata", a:2.0, c:"#6cabdd", g:85, p:500 },
    { n:"Juventus", t:"Oro", a:2.1, c:"#000000", g:100, p:600 },
    { n:"FC Barcelona", t:"Oro", a:2.2, c:"#a50044", g:120, p:700 },
    { n:"Real Madrid", t:"Oro", a:2.3, c:"#fcbf00", g:150, p:800 },
    { n:"Inter de Miami", t:"Leyenda", a:2.5, c:"#ff6f61", g:200, p:1000 },
    { n:"Man United", t:"Leyenda", a:2.7, c:"#da291c", g:300, p:2500 }
  ];

  function AudioEngine() {
    this.ctx = null;
    this.init = function(){
      if(!this.ctx){
        var AC = window.AudioContext || window.webkitAudioContext;
        if(AC) this.ctx = new AC();
      }
      if(this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(function(){});
    };
    this.tone = function(f,t,d,v){
      if(!this.ctx) return;
      try{
        var o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type=t; o.frequency.value=f;
        g.gain.setValueAtTime(v, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime+d);
        o.connect(g).connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime+d);
      }catch(e){}
    };
    this.kick = function(){ this.tone(180,"triangle",0.08,0.15); };
    this.pass = function(){ this.tone(320,"sine",0.06,0.1); };
    this.post = function(){ this.tone(450,"square",0.1,0.2); };
    this.goal = function(){
      this.tone(440,"square",0.1,0.2);
      var self=this; setTimeout(function(){self.tone(554,"triangle",0.12,0.22);},100);
      setTimeout(function(){self.tone(659,"triangle",0.25,0.25);},220);
    };
    this.whistle = function(){
      this.tone(880,"sine",0.2,0.3);
      var self=this; setTimeout(function(){self.tone(920,"sine",0.3,0.3);},150);
    };
  }

  // Helper: leer los NFTs del usuario desde window.STATE
  function getAvailableNfts(){
    try{
      var inv = window.STATE && window.STATE.inventory;
      if(!inv || !inv.players) return [];
      return inv.players.filter(function(p){
        return p && p.id && p.name;
      }).sort(function(a,b){
        var sa = Number(a.stamina)||0, sb = Number(b.stamina)||0;
        if(sb!==sa) return sb-sa;
        return Number(b.durability||0) - Number(a.durability||0);
      });
    }catch(e){ return []; }
  }

  function staminaIcons(player){
    var cur = Math.max(0, Math.min(4, Number(player.stamina)||0));
    var max = Number(player.maxStamina)||4;
    var s = "";
    for(var i=0; i<max; i++){
      s += (i < cur) ? "\u26bd" : "\u26aa";
    }
    return s;
  }

  function FutmundiPesGameApp(mountEl, gameMode, detailCallbacks){
    var self = this;
    self.mountEl = mountEl;
    self.mode = gameMode;
    self.onMatchEndCb = (detailCallbacks && detailCallbacks.onMatchEnd) || null;
    self.onConsumeStamina = (detailCallbacks && detailCallbacks.onConsumeStamina) || null;
    self.isRecreational = (detailCallbacks && detailCallbacks.isRecreationalMode) || false;

    // Datos del NFT (se actualizan cuando el usuario selecciona uno en el overlay)
    var selPlayer = (typeof window.getSelectedPlayer === "function") ? window.getSelectedPlayer() : null;
    self.myNftName = selPlayer ? selPlayer.name : "FUTBOLISTA";
    self.selectedPlayerId = selPlayer ? selPlayer.id : null;
    self.chosenNftObj = selPlayer;
    self.wasPlayed = false;

    self.tIdx = 0;
    self.opp = (self.mode === "tournament") ? TEAMS[0] : { n:"IA \u00c9lite Sports", t:"Pro", a:1.3, c:"#e04545", g:25, p:150 };

    self.matchLen = 90;
    self.cW = 960; self.cH = 540;
    self.audio = new AudioEngine();
    self.raf = null;
    self.running = false;

    self.stick = { x:0, y:0, active:false };
    self.keys = {};
    self.shotCharge = 0;
    self.charging = false;
    self.shake = 0;
    self.parts = [];
    self.msgText = "";
    self.msgTimer = 0;

    self.started = false;
    self.over = false;
    self.timeLeft = self.matchLen;
    self.myG = 0;
    self.riG = 0;
    self.pts = 0;

    self._buildStage();
    self._wireEvents();

    try{
      if(screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function(){});
    }catch(e){}

    self.running = true;
    self.lastT = performance.now();
    self.raf = requestAnimationFrame(function(t){ self._loop(t); });
  }

  var P = FutmundiPesGameApp.prototype;

  // =====================================================================
  //  CONSTRUCCIÓN DEL DOM — incluye el SELECTOR DE NFT
  // =====================================================================
  P._buildStage = function(){
    var self = this;
    var stage = document.createElement("div");
    stage.className = "pes-soccer-stage";

    // Canvas
    var cv = document.createElement("canvas");
    cv.className = "pes-game-canvas";
    cv.width = self.cW; cv.height = self.cH;
    self.canvasEl = cv;
    self.ctx = cv.getContext("2d");

    // HUD
    var hud = document.createElement("div");
    hud.className = "pes-hud-bar";
    hud.innerHTML = '<div class="pes-hud-badge"><span class="pes-hud-team blue" id="pes-blue-nm">'+self.myNftName.toUpperCase()+'</span><span class="pes-hud-goals" id="pes-my-g">0</span></div><div class="pes-hud-timer"><span>\u23f1</span><strong id="pes-time">1:30</strong></div><div class="pes-hud-badge"><span class="pes-hud-goals" id="pes-ri-g">0</span><span class="pes-hud-team red" id="pes-red-nm">'+self.opp.n.toUpperCase()+'</span></div><div class="pes-hud-pts"><span>\uD83C\uDFC6</span><strong id="pes-pts">0 PTS</strong></div>';

    // Controles táctiles
    var tc = document.createElement("div");
    tc.className = "pes-touch-controls";
    tc.innerHTML = '<div class="pes-joystick-base" id="pes-joy"><div class="pes-joystick-knob" id="pes-knob"></div></div><div class="pes-actions-cluster"><div class="pes-btn-arcade pes-btn-pass" id="pes-pass">PASS</div><div class="pes-btn-arcade pes-btn-shot" id="pes-shot">SHOT</div></div>';

    // === PANEL PRE-JUEGO CON SELECTOR DE NFT ===
    var panel = document.createElement("div");
    panel.className = "pes-pre-game-panel";
    panel.id = "pes-pregame";

    // Construir el HTML del selector con concatenación (sin backticks anidados)
    var html = '';
    html += '<div class="pes-pg-header">';
    html += '  <span class="pes-pg-mode">\uD83C\uDFAE MODO ' + self.mode.toUpperCase() + '</span>';
    html += '  <span class="pes-pg-vs">vs ' + self.opp.n + ' (' + self.opp.t + ')</span>';
    html += '</div>';
    html += '<div class="pes-pg-title">\u26BD SELECCIONA TU FUTBOLISTA NFT</div>';
    html += '<div class="pes-pg-subtitle">Toca el NFT con el que quieres jugar</div>';
    html += '<div class="pes-nft-selector-grid" id="pes-nft-grid"></div>';
    html += '<div class="pes-pg-selected-box" id="pes-sel-box" style="display:none;"></div>';
    html += '<button class="pes-start-btn pes-start-disabled" id="pes-start-btn" type="button" disabled>';
    html += '\u26FD SELECCIONA UN NFT ARRIBA PARA EMPEZAR';
    html += '</button>';

    panel.innerHTML = html;
    self.pregameEl = panel;
    self.nftGridEl = panel.querySelector("#pes-nft-grid");
    self.selBoxEl = panel.querySelector("#pes-sel-box");
    self.startBtnEl = panel.querySelector("#pes-start-btn");

    // Panel de fin de partido (oculto inicialmente)
    var endPanel = document.createElement("div");
    endPanel.className = "pes-end-panel";
    endPanel.id = "pes-endpanel";
    endPanel.style.display = "none";
    endPanel.innerHTML = '<h3 class="pes-end-title" id="pes-end-h"></h3><p class="pes-end-sub" id="pes-end-s"></p><div class="pes-end-score" id="pes-end-sc"></div><button class="pes-start-btn" id="pes-replay-btn" type="button">\uD83D\uDD04 JUGAR DE NUEVO</button>';
    self.endPanelEl = endPanel;

    stage.appendChild(cv);
    stage.appendChild(hud);
    stage.appendChild(tc);
    stage.appendChild(panel);
    stage.appendChild(endPanel);

    self.mountEl.replaceChildren(stage);

    // Referencias UI
    self.ui = {
      myG: stage.querySelector("#pes-my-g"),
      riG: stage.querySelector("#pes-ri-g"),
      time: stage.querySelector("#pes-time"),
      pts: stage.querySelector("#pes-pts"),
      blueNm: stage.querySelector("#pes-blue-nm"),
      redNm: stage.querySelector("#pes-red-nm"),
      joy: stage.querySelector("#pes-joy"),
      knob: stage.querySelector("#pes-knob"),
      pass: stage.querySelector("#pes-pass"),
      shot: stage.querySelector("#pes-shot"),
      endH: stage.querySelector("#pes-end-h"),
      endS: stage.querySelector("#pes-end-s"),
      endSc: stage.querySelector("#pes-end-sc"),
      replayBtn: stage.querySelector("#pes-replay-btn")
    };

    // Renderizar las tarjetas de NFT en el selector
    self._renderNftSelector();
  };

  // =====================================================================
  //  RENDERIZAR SELECTOR DE NFT — muestra balones disponibles
  // =====================================================================
  P._renderNftSelector = function(){
    var self = this;
    var nfts = getAvailableNfts();

    if(nfts.length === 0){
      self.nftGridEl.innerHTML = '<div class="pes-nft-empty">\u26A0\uFE0F No tienes NFTs. Ve a Market para reclamar Neymar gratis o comprar un jugador.</div>';
      return;
    }

    var html = "";
    nfts.forEach(function(p){
      var balls = staminaIcons(p);
      var hasEnergy = Number(p.stamina||0) > 0;
      var isCurrent = (p.id === self.selectedPlayerId);
      var cls = "pes-nft-pick" + (hasEnergy ? "" : " pes-nft-empty-card") + (isCurrent ? " pes-nft-pick-active" : "");

      html += '<div class="' + cls + '" data-nft-id="' + p.id + '">';
      html +=   '<img src="' + (p.img||"") + '" alt="' + (p.name||"") + '" loading="lazy" onerror="this.style.display=\'none\'">';
      html +=   '<div class="pes-nft-name">' + (p.name||"NFT") + '</div>';
      html +=   '<div class="pes-nft-balls">' + balls + '</div>';
      html +=   '<div class="pes-nft-dur">Dur: ' + Math.round(Number(p.durability||0)) + '%</div>';
      if(!hasEnergy) html += '<div class="pes-nft-noenergy">SIN BALONES</div>';
      html += '</div>';
    });

    self.nftGridEl.innerHTML = html;

    // Marcar el NFT actualmente seleccionado
    self._selectNftInUi(self.selectedPlayerId);
  };

  // =====================================================================
  //  EVENTOS — pointerdown para MÁXIMA compatibilidad móvil
  // =====================================================================
  P._wireEvents = function(){
    var self = this;
    self.audio.init();

    // --- Selector de NFT: clic en tarjeta ---
    // Usamos pointerdown que SÍ funciona en WebView móvil (click a veces no dispara)
    self.nftGridEl.addEventListener("pointerdown", function(e){
      var card = e.target.closest ? e.target.closest("[data-nft-id]") : null;
      if(!card) return;
      e.preventDefault();
      e.stopPropagation();
      var id = card.getAttribute("data-nft-id");
      self._selectNftInUi(id);
    });

    // --- Botón START: pointerdown (no click) ---
    self._startHandler = function(e){
      if(e){ e.preventDefault(); e.stopPropagation(); }
      if(self.started || self.over) return;
      if(!self.selectedPlayerId){
        // parpadea el grid para llamar atención
        self.nftGridEl.style.animation = "none";
        void self.nftGridEl.offsetWidth;
        self.nftGridEl.style.animation = "pesShake 0.4s";
        return;
      }
      self._beginMatch();
    };
    self.startBtnEl.addEventListener("pointerdown", self._startHandler);

    // --- Botón replay ---
    if(self.ui.replayBtn){
      self.ui.replayBtn.addEventListener("pointerdown", function(e){
        e.preventDefault(); e.stopPropagation();
        self.endPanelEl.style.display = "none";
        self.pregameEl.style.display = "flex";
        self.over = false;
        self.started = false;
        self.timeLeft = self.matchLen;
        self.myG = 0; self.riG = 0; self.pts = 0;
        self._renderNftSelector();
        self._resetSelection();
      });
    }

    // --- Joystick ---
    var pid = null;
    if(self.ui.joy){
      self.ui.joy.addEventListener("pointerdown", function(e){
        pid = e.pointerId;
        try{ self.ui.joy.setPointerCapture(pid); }catch(ex){}
        self._joyMove(e);
      });
      self.ui.joy.addEventListener("pointermove", function(e){
        if(e.pointerId === pid) self._joyMove(e);
      });
      var endJoy = function(e){
        if(e.pointerId === pid){
          pid = null;
          self.stick = { x:0, y:0, active:false };
          if(self.ui.knob) self.ui.knob.style.transform = "none";
        }
      };
      self.ui.joy.addEventListener("pointerup", endJoy);
      self.ui.joy.addEventListener("pointercancel", endJoy);
    }

    // --- PASS ---
    if(self.ui.pass){
      self.ui.pass.addEventListener("pointerdown", function(e){
        e.preventDefault(); e.stopPropagation();
        self.audio.pass();
        self._doPass();
      });
    }

    // --- SHOT ---
    if(self.ui.shot){
      self.ui.shot.addEventListener("pointerdown", function(e){
        e.preventDefault(); e.stopPropagation();
        self.charging = true;
      });
      var endShot = function(e){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        if(self.charging){
          self.charging = false;
          self.audio.kick();
          self._doShot();
        }
      };
      self.ui.shot.addEventListener("pointerup", endShot);
      self.ui.shot.addEventListener("pointerleave", endShot);
    }

    // --- Teclado ---
    self._onKeyDown = function(e){
      var k = e.key.toLowerCase();
      self.keys[k] = true;
      if(k === " "){ e.preventDefault(); self.charging = true; }
      if(k === "k"){ e.preventDefault(); self.audio.pass(); self._doPass(); }
      if(k === "enter" && !self.started && !self.over){
        if(self.selectedPlayerId) self._beginMatch();
      }
    };
    self._onKeyUp = function(e){
      var k = e.key.toLowerCase();
      self.keys[k] = false;
      if(k === " " && self.charging){
        e.preventDefault();
        self.charging = false;
        self.audio.kick();
        self._doShot();
      }
    };
    window.addEventListener("keydown", self._onKeyDown);
    window.addEventListener("keyup", self._onKeyUp);
  };

  // =====================================================================
  //  SELECCIÓN DE NFT EN LA UI
  // =====================================================================
  P._selectNftInUi = function(id){
    var self = this;
    var nfts = getAvailableNfts();
    var nft = null;
    for(var i=0; i<nfts.length; i++){
      if(nfts[i].id === id){ nft = nfts[i]; break; }
    }
    if(!nft) return;

    // No permitir seleccionar NFTs sin balones
    if(Number(nft.stamina||0) <= 0){
      if(typeof toast === "function") toast(nft.name + " no tiene balones. Entrénalo para recuperar.", false);
      return;
    }

    self.selectedPlayerId = id;
    self.chosenNftObj = nft;
    self.myNftName = nft.name;
    self.isRecreational = false;

    // Actualizar visual de tarjetas
    var cards = self.nftGridEl.querySelectorAll("[data-nft-id]");
    cards.forEach(function(c){
      if(c.getAttribute("data-nft-id") === id) c.classList.add("pes-nft-pick-active");
      else c.classList.remove("pes-nft-pick-active");
    });

    // Mostrar caja de selección
    var balls = staminaIcons(nft);
    self.selBoxEl.style.display = "block";
    self.selBoxEl.innerHTML = '<img src="' + (nft.img||"") + '" alt="' + nft.name + '"><div class="pes-sel-info"><b>' + nft.name + '</b><span>' + balls + ' Balones</span><span>Durabilidad: ' + Math.round(Number(nft.durability||0)) + '%</span></div>';

    // Activar botón de inicio
    self.startBtnEl.disabled = false;
    self.startBtnEl.classList.remove("pes-start-disabled");
    self.startBtnEl.textContent = "\u26BD ENTRAR A JUGAR CON " + nft.name.toUpperCase() + " \u2714";

    // Actualizar HUD
    if(self.ui.blueNm) self.ui.blueNm.textContent = nft.name.toUpperCase();

    // Sincronizar con el STATE global
    try{
      if(window.STATE) window.STATE.selectedPlayerId = id;
      if(typeof window.selectPlayer === "function") window.selectPlayer(id);
    }catch(e){}
  };

  P._resetSelection = function(){
    var self = this;
    self.selectedPlayerId = null;
    self.startBtnEl.disabled = true;
    self.startBtnEl.classList.add("pes-start-disabled");
    self.startBtnEl.textContent = "\u26FD SELECCIONA UN NFT ARRIBA PARA EMPEZAR";
    self.selBoxEl.style.display = "none";
    // Quitar activos
    var cards = self.nftGridEl.querySelectorAll("[data-nft-id]");
    cards.forEach(function(c){ c.classList.remove("pes-nft-pick-active"); });
  };

  // =====================================================================
  //  INICIO DEL PARTIDO
  // =====================================================================
  P._beginMatch = function(){
    var self = this;
    self.audio.whistle();
    self.pregameEl.style.display = "none";
    self.started = true;
    self.over = false;
    self.wasPlayed = true;
    self.timeLeft = self.matchLen;
    self.myG = 0; self.riG = 0; self.pts = 0;
    self.msgText = "\u00A1EMPIEZA EL PARTIDO!";
    self.msgTimer = 1.5;
    self._initEntities();
  };

  // =====================================================================
  //  ENTIDADES DEL MUNDO
  // =====================================================================
  P._initEntities = function(){
    var self = this;
    self.ball = { x:480, y:270, vx:0, vy:0, r:12, owner:null, curve:0 };

    self.myTeam = [
      { id:"p1", name:self.myNftName, x:350, y:270, vx:0, vy:0, spd:5.5, ctrl:true, team:"blue", col:"#ffe871" },
      { id:"p2", name:"Compa\u00f1ero", x:250, y:150, vx:0, vy:0, spd:4.8, ctrl:false, team:"blue", col:"#ffe871" },
      { id:"p3", name:"T\u00e1ctico", x:250, y:390, vx:0, vy:0, spd:4.8, ctrl:false, team:"blue", col:"#ffe871" },
      { id:"kp", name:"Portero", x:50, y:270, vx:0, vy:0, spd:4.0, ctrl:false, team:"blue", keeper:true, col:"#39ff88" }
    ];

    var rc = self.opp.c;
    self.riTeam = [
      { id:"r1", name:self.opp.n, x:610, y:270, vx:0, vy:0, spd:4.6*self.opp.a, ctrl:false, team:"red", col:rc },
      { id:"r2", name:"Def 1", x:710, y:170, vx:0, vy:0, spd:4.3*self.opp.a, ctrl:false, team:"red", col:rc },
      { id:"r3", name:"Def 2", x:710, y:370, vx:0, vy:0, spd:4.3*self.opp.a, ctrl:false, team:"red", col:rc },
      { id:"rk", name:"Keeper", x:910, y:270, vx:0, vy:0, spd:4.1, ctrl:false, team:"red", keeper:true, col:"#ff4545" }
    ];

    self.activeP = self.myTeam[0];
  };

  P._joyMove = function(e){
    var self = this;
    e.preventDefault();
    var r = self.ui.joy.getBoundingClientRect();
    var cx = r.left + r.width/2, cy = r.top + r.height/2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    var maxR = r.width * 0.35;
    var dist = Math.hypot(dx, dy);
    var ang = Math.atan2(dy, dx);
    var rad = Math.min(dist, maxR);
    self.stick = { x:Math.cos(ang), y:Math.sin(ang), active:true };
    if(self.ui.knob) self.ui.knob.style.transform = "translate(" + (Math.cos(ang)*rad) + "px," + (Math.sin(ang)*rad) + "px)";
  };

  P._doPass = function(){
    var self = this;
    if(self.ball.owner !== self.activeP) return;
    self.ball.owner = null;
    var a = self.activeP;
    var mates = self.myTeam.filter(function(p){ return !p.keeper && p !== a; });
    var tgt = mates[0], bd = 9999;
    mates.forEach(function(m){
      var d = Math.hypot(m.x-a.x, m.y-a.y);
      if(d < bd){ bd = d; tgt = m; }
    });
    if(!tgt) tgt = { x: self.cW*0.8, y: a.y };
    var ang = Math.atan2(tgt.y-a.y, tgt.x-a.x);
    self.ball.vx = Math.cos(ang)*16;
    self.ball.vy = Math.sin(ang)*16;
    self.ball.x += Math.cos(ang)*12;
    self.ball.y += Math.sin(ang)*12;
    if(tgt && tgt.team === "blue"){
      self.myTeam.forEach(function(p){ p.ctrl = false; });
      tgt.ctrl = true;
      self.activeP = tgt;
    }
    self._spawnParts(a.x, a.y, "#ffe871", 10);
  };

  P._doShot = function(){
    var self = this;
    if(self.ball.owner !== self.activeP) return;
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

  P._spawnParts = function(x,y,col,n){
    var self = this;
    for(var i=0; i<n; i++){
      var a = Math.random()*Math.PI*2, s = 2+Math.random()*8;
      self.parts.push({ x:x, y:y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, col:col, r:2+Math.random()*3, life:1, max:1 });
    }
  };

  // =====================================================================
  //  GAME LOOP
  // =====================================================================
  P._loop = function(now){
    var self = this;
    if(!self.running) return;
    var dt = Math.min(0.05, (now - self.lastT)/1000 || 0);
    self.lastT = now;

    // Adaptar canvas al tamaño real
    if(self.canvasEl){
      var aw = Math.max(320, self.canvasEl.clientWidth || 960);
      var ah = Math.max(240, self.canvasEl.clientHeight || 540);
      if(self.cW !== aw || self.cH !== ah){
        self.cW = aw; self.cH = ah;
        self.canvasEl.width = aw; self.canvasEl.height = ah;
      }
    }

    if(self.started && !self.over){ self._physics(dt); }
    self._fx(dt);
    self._render();
    self._updUi();
    self.raf = requestAnimationFrame(function(t){ self._loop(t); });
  };

  P._physics = function(dt){
    var self = this;
    self.timeLeft = Math.max(0, self.timeLeft - dt);
    if(self.timeLeft <= 0 && !self.over){ self._endMatch(); return; }

    var mp = self.activeP;
    if(mp && self.ball.owner !== mp){
      var mx=0, my=0;
      if(self.stick.active){ mx += self.stick.x; my += self.stick.y; }
      if(self.keys["w"]||self.keys["arrowup"]) my -= 1;
      if(self.keys["s"]||self.keys["arrowdown"]) my += 1;
      if(self.keys["a"]||self.keys["arrowleft"]) mx -= 1;
      if(self.keys["d"]||self.keys["arrowright"]) mx += 1;
      if(mx!==0 || my!==0){
        var ang = Math.atan2(my, mx);
        mp.x += Math.cos(ang)*mp.spd;
        mp.y += Math.sin(ang)*mp.spd;
      }
      mp.x = Math.max(20, Math.min(self.cW-20, mp.x));
      mp.y = Math.max(20, Math.min(self.cH-20, mp.y));
    }

    self.myTeam.forEach(function(p){
      if(!p.ctrl && !p.keeper){
        var tx = self.ball.x < self.cW*0.5 ? self.cW*0.45 : self.cW*0.8;
        p.x += (tx-p.x)*dt*1.5;
        p.x = Math.max(20, Math.min(self.cW-20, p.x));
      }
    });

    var b = self.ball;
    self.riTeam.forEach(function(r){
      if(!r.keeper){
        var ang = Math.atan2(b.y-r.y, b.x-r.x);
        var d = Math.hypot(b.x-r.x, b.y-r.y);
        if(d > 15){ r.x += Math.cos(ang)*r.spd; r.y += Math.sin(ang)*r.spd; }
        r.x = Math.max(20, Math.min(self.cW-20, r.x));
        if(d < 20 && b.owner !== r){
          b.owner = r;
          if(r.x < self.cW*0.35 || Math.random() < 0.08){
            b.owner = null;
            var ty = self.cH*0.5 + (Math.random()-0.5)*self.cH*0.25;
            var sa = Math.atan2(ty-r.y, 0-r.x);
            b.vx = Math.cos(sa)*16; b.vy = Math.sin(sa)*16;
            self.audio.kick();
          }
        }
      }
    });

    var mk = self.myTeam.find(function(k){return k.keeper;});
    if(mk){ var gc=self.cH*0.5; mk.y += (Math.max(gc-80,Math.min(gc+80,b.y))-mk.y)*dt*4; }
    var rk = self.riTeam.find(function(k){return k.keeper;});
    if(rk){ var gc2=self.cH*0.5; rk.y += (Math.max(gc2-80,Math.min(gc2+80,b.y))-rk.y)*dt*4; }

    if(b.owner){
      b.x = b.owner.x + (b.owner.team==="blue"?14:-14);
      b.y = b.owner.y + 10;
      b.vx = 0; b.vy = 0;
    } else {
      b.x += b.vx; b.y += b.vy;
      b.vy += b.curve;
      b.vx *= 0.985; b.vy *= 0.985; b.curve *= 0.95;
      if(b.y < 20){ b.y=20; b.vy*=-1; self.audio.post(); }
      if(b.y > self.cH-20){ b.y=self.cH-20; b.vy*=-1; self.audio.post(); }
      var gt = self.cH*0.5-80, gb = self.cH*0.5+80;
      if(b.x < 30){
        if(b.y >= gt && b.y <= gb){ self.riG++; self._goal("red", "\u00A1GOL DE "+self.opp.n.toUpperCase()+"!"); }
        else { b.x=30; b.vx*=-1; self.audio.post(); }
      }
      if(b.x > self.cW-30){
        if(b.y >= gt && b.y <= gb){ self.myG++; self.pts+=10; self._goal("blue", "\u00A1GOLAZO DE "+self.myNftName.toUpperCase()+"!"); }
        else { b.x=self.cW-30; b.vx*=-1; self.audio.post(); }
      }
      self.myTeam.concat(self.riTeam).forEach(function(p){
        if(!b.owner && Math.hypot(b.x-p.x, b.y-p.y) < 22){
          b.owner = p;
          if(p.team==="blue" && !p.keeper){
            self.myTeam.forEach(function(pp){pp.ctrl=false;});
            p.ctrl = true;
            self.activeP = p;
          }
        }
      });
    }

    if(self.charging) self.shotCharge = Math.min(1.0, self.shotCharge + dt*1.5);
  };

  P._goal = function(team, txt){
    var self = this;
    self.audio.goal();
    self.shake = 20;
    self.msgText = txt;
    self.msgTimer = 2.5;
    self._spawnParts(team==="blue"?self.cW-30:30, self.cH*0.5, team==="blue"?"#3fbfff":"#ff4545", 50);
    var b = self.ball;
    setTimeout(function(){
      b.x = self.cW/2; b.y = self.cH/2; b.vx=0; b.vy=0; b.owner=null; b.curve=0;
      if(self.myTeam[0]){ self.myTeam[0].x = self.cW*0.4; self.myTeam[0].y = self.cH*0.5; }
      if(self.riTeam[0]){ self.riTeam[0].x = self.cW*0.6; self.riTeam[0].y = self.cH*0.5; }
    }, 2000);
  };

  P._endMatch = function(){
    var self = this;
    self.over = true; self.started = false;
    self.audio.whistle();

    var win = self.myG > self.riG;
    var draw = self.myG === self.riG;
    var res = win ? "Victoria" : draw ? "Empate" : "Derrota";
    var sc = self.myG + " - " + self.riG;

    var gems = win ? (self.opp.g||25) : draw ? 5 : 0;
    var pts = win ? (self.opp.p||150) : draw ? 30 : 0;
    if(self.isRecreational) gems = 0;

    var headline, sub;
    if(self.mode === "tournament"){
      if(win || draw){
        self.tIdx++;
        if(self.tIdx >= TEAMS.length){
          gems += 500; pts += 5000;
          headline = "\uD83C\uDFC6 \u00a1CAMPE\u00d3N MUNDIAL!";
          sub = "Derrotaste a todos. +" + gems + " GEMAS";
          self._showEnd(headline, sub, sc);
          self._emit(res, sc, gems, pts, true);
          return;
        }
        var next = TEAMS[self.tIdx];
        self.opp = next;
        headline = "\u00a1" + res + "! Ronda " + (self.tIdx+1) + "/15";
        sub = "Siguiente: " + next.n + " (" + next.t + ")";
      } else {
        headline = "\uD83D\uDCA5 ELIMINADO";
        sub = "Ca\u00edste ante " + self.opp.n + ". Rondas: " + self.tIdx + "/15";
        self._showEnd(headline, sub, sc);
        self._emit("Derrota", sc, 0, 10, true);
        return;
      }
    } else {
      headline = "\u26BD " + res + " en el " + (self.mode==="pvp"?"Estadio":"Cancha");
      sub = "Marcador: " + sc + " \u2192 \uD83D\uDC8E +" + gems + " Gemas";
    }

    self._showEnd(headline, sub, sc);
    self._emit(res, sc, gems, pts, true);
  };

  P._showEnd = function(h, s, sc){
    var self = this;
    if(self.ui.endH) self.ui.endH.textContent = h;
    if(self.ui.endS) self.ui.endS.textContent = s;
    if(self.ui.endSc) self.ui.endSc.textContent = sc;
    self.endPanelEl.style.display = "flex";
    self.wasPlayed = false;
  };

  P._emit = function(res, sc, gems, pts, fin){
    var self = this;
    var d = {
      mode: self.mode, result: res, score: sc, gemsDelta: gems,
      pointsDelta: pts, points: pts, wasPlayed: true,
      consumedPlayerId: self.selectedPlayerId,
      tournament: self.mode==="tournament" ? {
        round: self.tIdx, champion: fin && res==="Victoria",
        eliminated: fin && res==="Derrota", highestTier: self.opp.t, finalScore: pts
      } : null
    };
    try{
      if(typeof self.onMatchEndCb === "function") self.onMatchEndCb(d);
      window.dispatchEvent(new CustomEvent("futmundi:gameplay_match_ended", { detail: d }));
      if(gems > 0 && typeof BetDB !== "undefined" && BetDB.addGems) BetDB.addGems(gems);
    }catch(e){}
  };

  P._fx = function(dt){
    var self = this;
    self.shake = Math.max(0, self.shake - dt*20);
    self.msgTimer = Math.max(0, self.msgTimer - dt);
    self.parts.forEach(function(p){ p.x += p.vx; p.y += p.vy; p.life -= dt; });
    self.parts = self.parts.filter(function(p){ return p.life > 0; });
  };

  P._render = function(){
    var self = this;
    var ctx = self.ctx;
    ctx.save();
    ctx.clearRect(0, 0, self.cW, self.cH);
    if(self.shake > 0) ctx.translate((Math.random()-0.5)*self.shake, (Math.random()-0.5)*self.shake);

    // Pasto
    var sw = 60;
    for(var x=0; x<self.cW; x+=sw){
      ctx.fillStyle = (x/sw)%2===0 ? "#185a2a" : "#1e6b32";
      ctx.fillRect(x, 0, sw, self.cH);
    }

    // Líneas
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = "#fff";
    ctx.strokeStyle = "rgba(255,255,255,0.88)"; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, self.cW-20, self.cH-20);
    var mx = self.cW*0.5, my = self.cH*0.5;
    ctx.beginPath(); ctx.moveTo(mx,10); ctx.lineTo(mx,self.cH-10); ctx.stroke();
    ctx.beginPath(); ctx.arc(mx,my,70,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(mx,my,8,0,Math.PI*2); ctx.fill();
    var gt = my-80;
    ctx.strokeRect(10, gt-20, 140, 200);
    ctx.strokeRect(10, gt+10, 60, 160);
    ctx.beginPath(); ctx.arc(150, my, 50, -Math.PI*0.35, Math.PI*0.35); ctx.stroke();
    ctx.strokeRect(self.cW-150, gt-20, 140, 200);
    ctx.strokeRect(self.cW-70, gt+10, 60, 160);
    ctx.beginPath(); ctx.arc(self.cW-150, my, 50, Math.PI*0.65, Math.PI*1.35); ctx.stroke();
    ctx.restore();

    // Porterías
    function net(gx, gy, left){
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

    // Jugadores
    var ents = self.myTeam.concat(self.riTeam).sort(function(a,b){ return a.y-b.y; });
    ents.forEach(function(pl){
      var hb = self.ball.owner === pl;
      var mc = pl === self.activeP;
      ctx.save();
      ctx.translate(pl.x, pl.y);
      if(hb){
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = pl.team==="blue"?"#39ff88":"#ffe871";
        ctx.strokeStyle = pl.team==="blue"?"#39ff88":"#ffe871"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 16, 22, 11, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      } else if(mc){
        ctx.save();
        ctx.globalAlpha = 0.85; ctx.strokeStyle = "#ffe871"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, 16, 18, 9, 0, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.ellipse(0, 16, 14, 7, 0, 0, Math.PI*2); ctx.fill();
      }
      var st = (pl.vx!==0||pl.vy!==0) ? Math.sin(performance.now()/80)*6 : 0;
      ctx.fillStyle = pl.keeper ? "#222" : "#f1c27d";
      ctx.beginPath(); ctx.arc(-6, 12+st, 4, 0, Math.PI*2); ctx.arc(6, 12-st, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#000"; ctx.fillRect(-8, 16+st, 6, 5); ctx.fillRect(4, 16-st, 6, 5);
      ctx.fillStyle = pl.col;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(-12, -10, 24, 20, 6); else ctx.rect(-12, -10, 24, 20);
      ctx.fill();
      ctx.fillStyle = pl.keeper ? "#0a4a72" : "#fff";
      ctx.fillRect(-14, -8, 5, 10); ctx.fillRect(9, -8, 5, 10);
      ctx.fillStyle = "#f1c27d"; ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = pl.keeper ? "#ff4545" : "#3a230b"; ctx.beginPath(); ctx.arc(0, -14, 8.5, Math.PI*0.8, Math.PI*2.2); ctx.fill();
      ctx.fillStyle = pl.team==="blue" ? "#000" : "#fff";
      ctx.font = "bold 10px 'Oswald',sans-serif"; ctx.textAlign = "center";
      ctx.fillText((pl.name||"").slice(0,3).toUpperCase(), 0, 2);
      ctx.restore();
    });

    // Balón
    var b = self.ball;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(2, 6, 10, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = b.owner ? 20 : 10;
    ctx.shadowColor = b.owner ? (b.owner.team==="blue"?"#3fbfff":"#ff4545") : "#fff";
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(-8, -6, 5, 5); ctx.fillRect(3, -6, 5, 5); ctx.fillRect(-4, 7, 8, 4);
    ctx.restore();

    self.parts.forEach(function(p){
      ctx.save(); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
    });

    if(self.msgTimer > 0){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(0, self.cH/2-40, self.cW, 80);
      ctx.font = "950 2.8rem 'Oswald',system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowBlur = 15; ctx.shadowColor = "#ffe871"; ctx.fillStyle = "#ffe871";
      ctx.fillText(self.msgText, self.cW/2, self.cH/2);
      ctx.restore();
    }

    ctx.restore();
  };

  P._updUi = function(){
    var self = this;
    if(self.ui.myG) self.ui.myG.textContent = self.myG;
    if(self.ui.riG) self.ui.riG.textContent = self.riG;
    if(self.ui.pts) self.ui.pts.textContent = self.pts + " PTS";
    if(self.ui.time){
      var m = Math.floor(self.timeLeft/60), s = Math.floor(self.timeLeft%60);
      self.ui.time.textContent = m + ":" + String(s).padStart(2,"0");
    }
  };

  P.destroyMatch = function(){
    var self = this;
    self.running = false;
    cancelAnimationFrame(self.raf);
    window.removeEventListener("keydown", self._onKeyDown);
    window.removeEventListener("keyup", self._onKeyUp);
    var ov = document.getElementById("fm-pes-gameboy-overlay");
    if(ov) ov.hidden = true;
    document.body.classList.remove("fm-pes-game-active");
    try{ if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); }catch(e){}
  };

  window.PurePesGameboyApp = FutmundiPesGameApp;
  window.FutmundiPesGameApp = FutmundiPesGameApp;
})();
