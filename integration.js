// Futmundi <-> Futmundi PES Premium Blockchain integration layer.
// Extrema Ciberseguridad Web3: Consumo asíncrono de Estamina (Balones) y Reset 00:00 UTC.
// Interfaz Limpia: Oculta botones duplicados de volver dejándote 1 solo Rey Global en la cancha.

(function () {
  if (window.__fm_game_integration_installed) return;
  window.__fm_game_integration_installed = true;

  // 1. Inject CSS for Universal True Standalone Overlay and DOM Auto-Patcher
  const style = document.createElement("style");
  style.textContent = `
    #fm-game-overlay, #fm-pes-gameboy-overlay {
      position:fixed;inset:0;z-index:99999999999;
      background:radial-gradient(ellipse at center, #0d1e15 0%, #050c08 100%);
      display:flex;flex-direction:column;
      justify-content:center;
      align-items:center;
      animation:pesGameIn .25s ease;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #fm-game-overlay[hidden], #fm-pes-gameboy-overlay[hidden] {
      display:none!important;
    }
    
    /* ⚠️ REGLA DE ORO DE OPTIMIZACIÓN: 1 SOLO BOTÓN DE VOLVER A FUTMUNDI NO MAS ⚠️ */
    /* Ocultamos cualquier otro boton de volver secundario o nativo interno de RetroCancha/PES para que opere solo 1 */
    #fm-game-close { display: none !important; }
    .pes-game-close-btn { display: none !important; }
    
    /* El 1 Solo Botón Rey Universal que flota en la arena de juego */
    .fm-pes-universal-close-btn {
      position:absolute;top:12px;right:14px;
      z-index:100000000;
      background:rgba(0,0,0,.88);
      color:#ffe871;border:2px solid #39ff88;
      border-radius:999px;padding:10px 20px;
      font:900 13px "Oswald",system-ui,sans-serif;
      letter-spacing:.12em;text-transform:uppercase;
      cursor:pointer;
      box-shadow:0 6px 20px rgba(0,0,0,.9),0 0 20px rgba(57,255,136,.3);
      transition:all .15s ease;
      pointer-events:auto;
    }
    .fm-pes-universal-close-btn:hover {
      background:#39ff88;color:#0b1319;border-color:#fff;
      transform:scale(1.05);
      box-shadow:0 8px 25px rgba(57,255,136,.6);
    }
    .fm-pes-universal-close-btn:active {
      transform:scale(.95);
    }
    
    #fm-game-mount, #pes-gameboy-mount-target {
      position:absolute;inset:0;overflow:hidden;
      background:#08100b;
      display:flex;
      justify-content:center;
      align-items:center;
    }
    @keyframes pesGameIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
    
    /* Ocultar UI nativa de Futmundi al abrir la arena */
    body.fm-game-open .tabbar, body.fm-pes-game-active .tabbar {display:none!important}
    body.fm-game-open .header, body.fm-pes-game-active .header {display:none!important}
    body.fm-game-open .chips, body.fm-pes-game-active .chips {display:none!important}
    body.fm-game-open main, body.fm-pes-game-active main {display:none!important}
    
    /* Obligamos nativamente Landscape Apaisado en Telegram iOS/Android Vertical */
    @media screen and (orientation: portrait) {
      #fm-game-overlay, #fm-pes-gameboy-overlay {
        width: 100vh !important;
        height: 100vw !important;
        transform: rotate(90deg) !important;
        transform-origin: top left !important;
        position: fixed !important;
        top: 0 !important;
        left: 100vw !important;
      }
    }
  `;
  if (document.head) document.head.appendChild(style);

  // Create Universal Guaranteed Standalone Overlay Container
  const overlay = document.createElement("div");
  overlay.id = "fm-pes-gameboy-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button class="fm-pes-universal-close-btn" type="button" id="pes-universal-close-btn">✕ VOLVER A FUTMUNDI</button>
    <div id="pes-gameboy-mount-target" style="width:100%; height:100%; display:flex; justify-content:center; align-items:center;"></div>
  `;
  document.body.appendChild(overlay);

  const mountEl = document.getElementById("pes-gameboy-mount-target");
  const closeBtn = document.getElementById("pes-universal-close-btn");

  function destroyPesGame() {
    if (window.__current_pes_app && typeof window.__current_pes_app.destroyMatch === "function") {
      try { window.__current_pes_app.destroyMatch(); } catch {}
    }
    overlay.hidden = true;
    document.body.classList.remove("fm-game-open");
    document.body.classList.remove("fm-pes-game-active");
    if (mountEl) mountEl.innerHTML = "";
    try {
      if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } catch {}
  }

  // --- EL SÚPER LANZADOR CON BLOQUEO ESTRICTO WEB3 DE BALONES (ESTAMINA) ---
  function openTruePesGame(modeStr) {
    // 1. Verificamos Billetera
    if (!window.STATE || !window.STATE.tonWallet) {
      alert("⚠️ ACCESO DENEGADO: Por favor, conecta tu Billetera de TON en la barra superior antes de entrar a disputar partidos en la blockchain.");
      return;
    }

    // 2. Verificamos Futbolista NFT en el inventario
    const pObj = typeof window.getSelectedPlayer === "function" ? window.getSelectedPlayer() : null;
    if (!pObj) {
      alert("⚠️ ACCESO RESTRINGIDO: No posees un Futbolista NFT activo en tu inventario. Sin un NFT no puede acceder nadie. Ve a la pestaña 'Futbolista' o 'Market' y reclama tu Futbolista Inicial Gratis (Neymar) antes de saltar a la cancha.");
      return;
    }

    // 3. ⚠️ BARRERA BLINDADA DE CONSUMO Y ESTAMINA: Verificamos si tiene Balones de Estamina ⚠️
    if (pObj.stamina <= 0) {
      alert(`⚠️ ENERGÍA AGOTADA (0 BALONES): Tu Futbolista NFT (${pObj.name}) ya ha consumido sus 4 balones de estamina por hoy y se encuentra BLOQUEADO. Deberás esperar a la temporización de las 00:00 UTC para que recargue sus 4 balones gratis, o usar la pestaña 'Entrenamiento' para recuperar su estamina inmediatamente.`);
      return;
    }

    // 4. Si el jugador pasó, ¡le CONSUMIMOS 1 BALÓN Y DURABILIDAD EN ESTE INSTANTE ANTES DE INICIAR EL JUEGO!
    pObj.stamina -= 1;
    pObj.durability = Math.max(0, +(pObj.durability - 0.8).toFixed(1));
    
    // Sincronizamos con el almacenamiento
    if (typeof window.saveInventory === "function") window.saveInventory();
    if (typeof window.renderFutbolistaInventory === "function") window.renderFutbolistaInventory();

    console.info(`[UniversalTrueLauncher] NFT Autorizado (${pObj.name}). Consumido 1 Balón (Quedan ${pObj.stamina}/4). Entrando a la arena en modo:`, modeStr);

    if (typeof toast === "function") {
      toast(`⚽ ¡NFT EN JUEGO (${pObj.name})! Consumido 1 Balón de Estamina (Quedan ${pObj.stamina}/4).`, true);
    }

    // Ocultamos modales flotantes si existieran
    const fmModal = document.getElementById("fm-modal");
    if (fmModal) fmModal.classList.remove("open");

    overlay.hidden = false;
    document.body.classList.add("fm-game-open");
    document.body.classList.add("fm-pes-game-active");
    if (mountEl) mountEl.innerHTML = "";

    // Bloqueamos a apaisado Landscape
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch {}

    // Instanciamos físicamente y de forma inquebrantable el Súper Videojuego Apaisado Clásico
    window.__current_pes_app = new window.FutmundiPesGameApp(mountEl, modeStr, {
      onMatchEnd: handleMatchEnd
    });
  }

  window.__FM_UNIVERSAL_OPEN_GAME = openTruePesGame;
  window.openGame = openTruePesGame;

  function handleMatchEnd(detail) {
    console.log("[Futmundi Play Integration] Partido Apaisado Físico Terminado:", detail);

    if (detail.mode === "tournament") {
      submitTournamentResult(detail);
    } else if (typeof playMatchBackend === "function") {
      const fmMode = detail.mode === "pve" ? "cancha" : "estadio";
      try { playMatchBackend(fmMode); } catch (e) { console.warn(e); }
    }

    if (typeof toast === "function") {
      const emoji = detail.result === "Victoria" ? "🏆" : detail.result === "Empate" ? "🤝" : "😔";
      if (detail.mode === "tournament") {
        const t = detail.tournament || {};
        if (t.champion) {
          toast(`🏆 ¡CAMPEÓN! Score final: ${t.finalScore} (${t.basePoints} × ${t.multiplier}x) · Tier: ${t.highestTier}`, true);
        } else if (t.eliminated) {
          toast(`😔 Eliminado · ${t.wins}/15 victorias · Score: ${t.finalScore} (×${t.multiplier} tier ${t.highestTier})`, false);
        } else {
          toast(`${emoji} R${(t.round||0)+1}/15 ${detail.result} · ${detail.points} PTS`, detail.result !== "Derrota");
        }
      } else {
        toast(`${emoji} ${detail.result} ${detail.score} · ${detail.points} PTS`, detail.result !== "Derrota");
      }
    }
  }

  async function submitTournamentResult(detail) {
    if (!STATE.tonWallet) return;
    const t = detail.tournament || {};
    try {
      const data = await backendJSON("/api/tournament/submit", {
        address: STATE.tonWallet,
        basePoints: t.basePoints || detail.points || 0,
        finalScore: t.finalScore || 0,
        multiplier: t.multiplier || 0.5,
        highestTier: t.highestTier || "Ninguno",
        champion: !!t.champion,
        wins: t.wins || 0,
        rounds: 15,
        result: detail.result,
        score: detail.score,
      });
      if (data && data.ranking) {
        STATE.tournamentBest = data.ranking.best || t.finalScore;
        STATE.tournamentRank = data.ranking.position || null;
        if (typeof updateHeaderStats === "function") updateHeaderStats();
        if (typeof toast === "function" && data.ranking.position) {
          toast(`🏆 Posición #${data.ranking.position} en el leaderboard · Score: ${data.ranking.best}`, true);
        }
      }
      return data;
    } catch (e) {
      try {
        if (typeof playMatchBackend === "function") await playMatchBackend("cancha");
      } catch {}
    }
  }

  if (closeBtn) closeBtn.onclick = destroyPesGame;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) destroyPesGame();
  });

  // Delegación universal redundante
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-play-local]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const mode = btn.dataset.playLocal;
    if (!mode) return;
    setTimeout(() => openTruePesGame(mode), 80);
  }, true);

  // --- AUTO-PARCHE UNIVERSAL DE DOM INTERFAZ ---
  function enforceUniversalPatcher() {
    if (typeof window.playerStatusText === "function" && !window.__fm_pst_upgraded) {
      window.__fm_pst_upgraded = true;
      const oldPst = window.playerStatusText;
      window.playerStatusText = function(player) {
        if (player && player.name === "Neymar") {
          return { cls: "dur-ok", text: "Gratis · ⚽ " + player.stamina + "/" + player.maxStamina };
        }
        try { return oldPst(player); } catch {
          return { cls: "dur-ok", text: "Dur. 100% · ⚽ 4/4" };
        }
      };
    }

    document.querySelectorAll(".player-card small span").forEach(el => {
      if (el.textContent.includes("Gratis") && el.textContent.includes("días")) {
        el.textContent = "Gratis · ⚽ 4/4 Estamina";
        el.className = "dur-ok";
      }
    });

    // Erradicar de forma absoluta el recuadro anterior
    const oldOverlayDiv = document.getElementById("fm-game-overlay");
    if (oldOverlayDiv && oldOverlayDiv !== overlay) {
      oldOverlayDiv.remove();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enforceUniversalPatcher);
  } else {
    enforceUniversalPatcher();
  }
  setInterval(enforceUniversalPatcher, 1000);
})();
