// Futmundi <-> Videojuego PES Advance & RetroCancha Web3 Integration Layer
// Dev Senior Tech Lead: Zero Sentimentalismo, Soluciones Algorítmicas Letales al 10,000%
// Resuelve de raíz cualquieratasco de DOM o Vercel en la arena visual de juego.

(function () {
  if (window.__fm_game_integration_installed) return;
  window.__fm_game_integration_installed = true;

  // 1. Estilos Inalterables Universal y Mapeo Apaisado Consola
  const styleCont = document.createElement("style");
  styleCont.textContent = `
    #fm-game-overlay, #fm-pes-gameboy-overlay {
      position:fixed;inset:0;z-index:9999999999999;
      background:#08100b;
      display:flex;flex-direction:column;
      justify-content:center;
      align-items:center;
      animation:pesGameIn .2s ease;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #fm-game-overlay[hidden], #fm-pes-gameboy-overlay[hidden] {
      display:none!important;
    }
    
    /* 1 Solo Boto de Cierre Rey Global en la Cancha */
    #fm-game-close { display: none !important; }
    .pes-game-close-btn { display: none !important; }
    
    .fm-pes-universal-close-action-btn {
      position:absolute;top:12px;right:14px;
      z-index:1000000000;
      background:rgba(0,0,0,.92);
      color:#ffe871;border:2px solid #39ff88;
      border-radius:999px;padding:10px 20px;
      font:900 13px "Oswald",system-ui,sans-serif;
      letter-spacing:.12em;text-transform:uppercase;
      cursor:pointer;
      box-shadow:0 6px 20px rgba(0,0,0,.9),0 0 20px rgba(57,255,136,.3);
      transition:all .15s ease;
      pointer-events:auto;
    }
    .fm-pes-universal-close-action-btn:hover {
      background:#39ff88;color:#0b1319;border-color:#fff;
      transform:scale(1.05);
      box-shadow:0 8px 25px rgba(57,255,136,.6);
    }
    .fm-pes-universal-close-action-btn:active {
      transform:scale(.95);
    }
    
    #fm-game-mount, #pes-gameboy-mount-target {
      position:absolute;inset:0;overflow:hidden;
      background:#08100b;
      display:flex;
      justify-content:center;
      align-items:center;
      width:100vw;
      height:100vh;
    }

    @keyframes pesGameIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
    
    /* Ocultar UI de Futmundi al abrir la arena */
    body.fm-game-open .tabbar, body.fm-pes-game-active .tabbar {display:none!important}
    body.fm-game-open .header, body.fm-pes-game-active .header {display:none!important}
    body.fm-game-open .chips, body.fm-pes-game-active .chips {display:none!important}
    body.fm-game-open main, body.fm-pes-game-active main {display:none!important}
    
    /* True Landscape Nativo en iOS / Android Telegram Mini App */
    @media screen and (orientation: portrait) {
      #fm-game-overlay, #fm-pes-gameboy-overlay {
        width: 100vh !important;
        height: 100vw !important;
        transform: rotate(90deg) !important;
        transform-origin: top left !important;
        position: fixed !important;
        top: 0 !important;
        left: 100vw !important;
        overflow: hidden !important;
      }
    }
  `;
  if (document.head) document.head.appendChild(styleCont);

  // 2. Base Oficial de Tasa Ecosistémica (NFT Produccion)
  const NFT_PRODUCTION_OFFICIAL = {
    "Neymar": { roiDays: 50, dailyGems: 3.2, perWin: 1.0, profitDays: 50 },
    "James Rodríguez": { roiDays: 40, dailyGems: 8.0, perWin: 2.0, profitDays: 17 },
    "Alexis Sánchez": { roiDays: 36, dailyGems: 17.0, perWin: 4.25, profitDays: 17 },
    "Harry Kane": { roiDays: 34, dailyGems: 28.0, perWin: 7.0, profitDays: 17 },
    "Pedri": { roiDays: 33, dailyGems: 39.0, perWin: 9.75, profitDays: 17 },
    "Vinicius Jr": { roiDays: 31, dailyGems: 52.0, perWin: 13.0, profitDays: 21 },
    "Rodri": { roiDays: 27.55, dailyGems: 70.0, perWin: 17.5, profitDays: 15 },
    "Mbappé": { roiDays: 27, dailyGems: 77.0, perWin: 19.25, profitDays: 15 },
    "Haaland": { roiDays: 25, dailyGems: 89.0, perWin: 22.25, profitDays: 12 },
    "Lamine Yamal": { roiDays: 21, dailyGems: 190.0, perWin: 47.5, profitDays: 10 },
    "Bellingham": { roiDays: 21, dailyGems: 244.0, perWin: 61.0, profitDays: 10 },
    "Lionel Messi": { roiDays: 21, dailyGems: 304.0, perWin: 76.0, profitDays: 10 },
    "Cristiano R.": { roiDays: 15, dailyGems: 1067.0, perWin: 266.75, profitDays: 10 }
  };
  window.NFT_PRODUCTION_OFFICIAL = NFT_PRODUCTION_OFFICIAL;

  // 3. Inyección Universal Físico de Contenedor de Rescate
  const universalOverlayEl = document.createElement("div");
  universalOverlayEl.id = "fm-pes-gameboy-overlay";
  universalOverlayEl.hidden = true;
  universalOverlayEl.innerHTML = `
    <button class="fm-pes-universal-close-action-btn" type="button" id="pes-universal-close-btn">✕ VOLVER A FUTMUNDI</button>
    <div id="pes-gameboy-mount-target" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"></div>
  `;
  document.body.appendChild(universalOverlayEl);

  const mountTargetDiv = document.getElementById("pes-gameboy-mount-target");
  const closeActionBtn = document.getElementById("pes-universal-close-btn");

  function destroyArenaGameplay() {
    if (window.__current_pes_app && typeof window.__current_pes_app.destroyMatch === "function") {
      try { window.__current_pes_app.destroyMatch(); } catch {}
    }
    universalOverlayEl.hidden = true;
    document.body.classList.remove("fm-game-open");
    document.body.classList.remove("fm-pes-game-active");
    if (mountTargetDiv) mountTargetDiv.innerHTML = "";
    try {
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch {}
  }

  function helperSafeJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
  }

  // --- SOLUCIÓN ARQUITECTÓNICA LETAL: LANZADOR UNIVERSAL INTELIGENTE DE ENCUENTROS ---
  function openTruePesGame(modeStr) {
    // 1. Atrapamos Billetera
    if (!window.STATE || !window.STATE.tonWallet) {
      alert("⚠️ ACCESO DENEGADO: Por favor, conecta tu Billetera de TON en la parte superior antes de entrar a disputar partidos en la blockchain.");
      return;
    }

    // 2. Atrapamos Futbolista NFT Blindado (Busca en window.getSelectedPlayer, o en STATE.inventory, o en localStorage)
    let pObj = null;
    if (typeof window.getSelectedPlayer === "function") {
      try { pObj = window.getSelectedPlayer(); } catch {}
    }
    if (!pObj && window.STATE && window.STATE.inventory && Array.isArray(window.STATE.inventory.players)) {
      pObj = window.STATE.inventory.players[0] || null;
    }
    if (!pObj) {
      const invLocal = helperSafeJSON("fm_inventory", { players: [] });
      pObj = invLocal && Array.isArray(invLocal.players) ? invLocal.players[0] : null;
    }
    
    if (!pObj) {
      alert("⚠️ ACCESO RESTRINGIDO: No posees un Futbolista NFT activo en tu inventario. Sin un NFT no puede acceder nadie a jugar. Ve a la pestaña 'Futbolista' o 'Market' y reclama tu Astro Gratis Inicial (Neymar) antes de entrar al campo.");
      return;
    }

    if (!window.FutmundiPesGameApp && typeof PurePesGameboyApp === "undefined") {
      alert("⚠️ El motor gráfico 2D del juego se está terminando de cargar. Por favor, toca el botón de jugar en un segundo o recarga la página.");
      return;
    }

    const PesGameClass = window.FutmundiPesGameApp || window.PurePesGameboyApp || PurePesGameboyApp;

    // 3. BARRERA DE ENERGÍA VISUAL MODALIDAD RECREATIVA
    let isRecreational = false;
    if (pObj.stamina <= 0) {
      isRecreational = true;
      console.info("[UniversalTrueLauncher] El NFT agoto balones. Desplayando Modo Recreativo Visual (Premio estrictamente 0).");
      if (typeof toast === "function") {
        toast("⚠️ Tu NFT agotó sus balones por hoy. Entrando a MODO RECREATIVO (Podrás jugar y divertirte mas NO generará Gemas de ganancia Web3 hasta las 00:00 UTC).", false);
      }
    } else {
      console.info("[UniversalTrueLauncher] Acceso Competitivo Autorizado (" + pObj.name + "). Consumiendo 1 balón...");
      pObj.stamina -= 1;
      pObj.durability = Math.max(0, +(pObj.durability - 0.8).toFixed(1));
      if (typeof window.saveInventory === "function") window.saveInventory();
      if (typeof window.renderFutbolistaInventory === "function") window.renderFutbolistaInventory();
      if (typeof toast === "function") {
        toast(`⚽ ¡NFT AUTORIZADO (${pObj.name})! Consumido 1 Balón (Quedan ${pObj.stamina}/4 balones).`, true);
      }
    }

    // Ocultamos modales
    const fmModalEl = document.getElementById("fm-modal");
    if (fmModalEl) fmModalEl.classList.remove("open");

    // Mostramos la arena con extrema agresividad visual en RAM
    universalOverlayEl.hidden = false;
    document.body.classList.add("fm-game-open");
    document.body.classList.add("fm-pes-game-active");
    
    if (mountTargetDiv) {
      mountTargetDiv.innerHTML = "";
      mountTargetDiv.style.display = "flex";
      mountTargetDiv.style.justifyContent = "center";
      mountTargetDiv.style.alignItems = "center";
    }

    // Apaisamos horizontal en iOS y Telegram nativo
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch {}

    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
      window.__current_pes_app = new PesGameClass(mountTargetDiv, modeStr, {
        isRecreationalMode: isRecreational,
        onMatchEnd: handleArenaMatchFinished
      });
    }, 50);
  }

  window.__FM_UNIVERSAL_OPEN_GAME = openTruePesGame;
  window.openGame = openTruePesGame;

  // 4. LÓGICA LETAL DE LIQUIDACIÓN DE GANANCIAS EN VIVO Y DIRECTO
  function handleArenaMatchFinished(detailObj) {
    console.log("[Futmundi True Patcher Integration] Match Finished:", detailObj);

    if (detailObj.mode === "tournament") {
      executeTournamentResolution(detailObj);
    } else {
      executeAmistosoPvPResolution(detailObj);
    }
  }

  function executeAmistosoPvPResolution(detail) {
    const isRec = detail.isRecreational;
    const res = detail.result; // Victoria, Empate, Derrota
    const mode = detail.mode; // pve, pvp
    const ptsGana = mode === "pvp" ? 30 : 15;
    
    let activeNftName = "Neymar";
    try {
      const p = typeof window.getSelectedPlayer === "function" ? window.getSelectedPlayer() : null;
      if (p) activeNftName = p.name;
    } catch {}

    const prodMeta = NFT_PRODUCTION_OFFICIAL[activeNftName] || NFT_PRODUCTION_OFFICIAL["Neymar"];
    let gemsWon = res === "Victoria" ? prodMeta.perWin : res === "Empate" ? +(prodMeta.perWin * 0.25).toFixed(2) : 0;

    if (isRec) gemsWon = 0; // Inquebrantable

    // ABONAMOS DIRECTO Y A FUEGO EN EL SALDO LOCAL
    if (gemsWon > 0 && window.STATE) {
      window.STATE.balanceGems = +(Number(window.STATE.balanceGems || 0) + gemsWon).toFixed(2);
      localStorage.setItem("fm_balance_gems", window.STATE.balanceGems);
    }
    if (window.STATE) {
      window.STATE.points = Math.max(0, Number(window.STATE.points || 0) + ptsGana);
      localStorage.setItem("fm_ranking_points", window.STATE.points);
    }
    if (typeof window.updateHeaderStats === "function") window.updateHeaderStats();

    const emoji = res === "Victoria" ? "🏆" : res === "Empate" ? "🤝" : "😔";
    if (typeof toast === "function") {
      if (isRec) {
        toast(`⚽ Encuentro finalizado en Modo Recreativo (${res}). Ganaste +${ptsGana} PTS (0 Gemas - Sin Balones).`, true);
      } else {
        toast(`${emoji} ¡${res}! +${gemsWon} 💎 agregadas a tu balance · +${ptsGana} PTS sumados.`, res !== "Derrota");
      }
    }

    try {
      fetch(window.STATE?.adminApiBase + "/api/matches/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: window.STATE?.tonWallet, mode: mode, gemsDelta: gemsWon, pointsDelta: ptsGana, nft: activeNftName })
      }).catch(()=>{});
    } catch {}
  }

  async function executeTournamentResolution(detail) {
    if (!window.STATE || !window.STATE.tonWallet) return;
    const t = detail.tournament || {};
    try {
      const data = await window.backendJSON("/api/tournament/submit", {
        address: window.STATE.tonWallet,
        basePoints: t.basePoints || detail.points || 0,
        finalScore: t.finalScore || 0,
        highestTier: t.highestTier || "Ninguno",
        champion: !!t.champion,
        wins: t.wins || 0,
        rounds: 15,
        result: detail.result,
        score: detail.score,
      });
      if (data && data.ranking) {
        window.STATE.tournamentBest = data.ranking.best || t.finalScore;
        if (typeof window.updateHeaderStats === "function") window.updateHeaderStats();
        if (typeof toast === "function") toast(`🏆 Posición #${data.ranking.position} mundial · Score: ${data.ranking.best}`, true);
      }
    } catch {}
  }

  if (closeActionBtn) closeActionBtn.onclick = destroyArenaGameplay;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !universalOverlayEl.hidden) destroyArenaGameplay();
  });

  // Escáner de delegación global incondicional
  document.addEventListener("click", (e) => {
    const btnEl = e.target.closest && e.target.closest("[data-play-local]");
    if (!btnEl) return;
    e.preventDefault(); e.stopPropagation();
    const mode = btnEl.dataset.playLocal;
    if (mode) openTruePesGame(mode);
  }, true);

  // --- AUTO-PARCHE DE DOM CERO ERRORES ---
  function enforceContinuousDomFix() {
    // Fulmina al obsoleto #fm-game-overlay si anduviera por el DOM
    const oldOverlay = document.getElementById("fm-game-overlay");
    if (oldOverlay && oldOverlay !== universalOverlayEl) oldOverlay.remove();

    // Reenlazamos botones fotográficos de Cancha y Estadio
    document.querySelectorAll(".actions .btn-play").forEach(btn => {
      const mode = btn.dataset.playLocal;
      if (mode && !btn.dataset.trueWiredSenior) {
        btn.dataset.trueWiredSenior = "1";
        btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openTruePesGame(mode); };
      }
    });

    // Modales clasicos de seleccion
    const innerModalEl = document.getElementById("fm-modal-inner");
    if (innerModalEl) {
      const titleEl = innerModalEl.querySelector(".modal-title");
      if (titleEl) {
        const txt = titleEl.textContent || "";
        if (txt.includes("Torneo")) {
          let btnRegEl = innerModalEl.querySelector("#t-register");
          if(btnRegEl && !btnRegEl.dataset.pesTournWired) {
            btnRegEl.dataset.pesTournWired = "1";
            btnRegEl.onclick = (e) => { e.stopPropagation(); setTimeout(() => openTruePesGame("tournament"), 1000); };
          }
        } else if (txt.includes("Estadio")) {
          let ctaEl = innerModalEl.querySelector(".m-cta");
          if(ctaEl && !ctaEl.dataset.pesCtaWired) {
            ctaEl.dataset.pesCtaWired = "1";
            ctaEl.textContent = "⚽ ENTRAR FÍSICAMENTE A JUGAR EN EL ESTADIO Pro (PvP)";
            ctaEl.onclick = (e) => { e.stopPropagation(); openTruePesGame("pvp"); };
          }
        } else if (txt.includes("Cancha")) {
          let ctaEl = innerModalEl.querySelector(".m-cta");
          if(ctaEl && !ctaEl.dataset.pesCtaWired) {
            ctaEl.dataset.pesCtaWired = "1";
            ctaEl.textContent = "⚽ ENTRAR FÍSICAMENTE A DISPUTAR PARTIDO EN CANCHA Local vs CPU (PvE)";
            ctaEl.onclick = (e) => { e.stopPropagation(); openTruePesGame("pve"); };
          }
        }
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enforceContinuousDomFix);
  else enforceContinuousDomFix();
  setInterval(enforceContinuousDomFix, 800);

})();
