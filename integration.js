// Futmundi <-> Futmundi PES Gameboy Advance integration layer.
// Extermina por completo la vieja dependencia obsoleta de RetroCancha
// Inicia de forma garantizada y sin un solo error nuestra Nueva Suite de PES apaisada.

(function () {
  if (window.__fm_game_integration_installed) return;
  window.__fm_game_integration_installed = true;

  // 1. Inject CSS for the overlay and Universal DOM Auto-Patcher
  const style = document.createElement("style");
  style.textContent = `
    #fm-game-overlay, #fm-pes-gameboy-overlay {
      position:fixed;inset:0;z-index:999999999;
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
    .fm-pes-close-action-btn {
      position:absolute;top:12px;right:14px;
      z-index:1000000;
      background:rgba(0,0,0,.88);
      color:#ffe871;border:2px solid #ff4545;
      border-radius:999px;padding:8px 16px;
      font:900 12px "Oswald",system-ui,sans-serif;
      letter-spacing:.1em;text-transform:uppercase;
      cursor:pointer;
      box-shadow:0 4px 15px rgba(0,0,0,.8),0 0 15px rgba(255,69,69,.3);
      transition:all .15s ease;
      pointer-events:auto;
    }
    .fm-pes-close-action-btn:hover {
      background:#ff4545;color:#fff;
      transform:scale(1.05);
      box-shadow:0 6px 20px rgba(255,69,69,.6);
    }
    .fm-pes-close-action-btn:active {
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
    /* Ocultar UI de Futmundi al abrir minijuego */
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
  document.head.appendChild(style);

  // 2. Create Universal Overlay Container
  const overlay = document.createElement("div");
  overlay.id = "fm-pes-gameboy-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button class="fm-pes-close-action-btn" type="button" id="pes-universal-close-btn">✕ VOLVER A FUTMUNDI PLATAFORMA</button>
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

  // --- MEGA LANZADOR DEL NUEVO JUEGO DE PES ---
  function openTruePesGame(modeStr) {
    if (!window.STATE || !window.STATE.tonWallet) {
      alert("⚠️ PUERTA BLINDADA WEB3: Tu Billetera de TON no está conectada. Por favor, conecta tu Billetera en la parte superior antes de entrar a disputar partidos en la blockchain.");
      return;
    }
    if (typeof window.getSelectedPlayer === "function" && !window.getSelectedPlayer()) {
      alert("⚠️ ACCESO RESTRINGIDO: No posees un Futbolista NFT activo en tu inventario. Ve a la pestaña 'Futbolista' o 'Market' y reclama tu NFT Gratis Inicial (Neymar) antes de jugar.");
      return;
    }

    if (!window.FutmundiPesGameApp) {
      alert("⚠️ El módulo del nuevo videojuego PES no cargó adecuadamente. Por favor, recarga tu pestaña en Vercel o Telegram.");
      return;
    }

    console.info("[UniversalTrueLauncher] Acceso Web3 Asegurado. Lanzando Nueva Suite PES en modo:", modeStr);

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

    // Nacimiento del Super Juego de Consola Clasica de Pro Evolucion
    window.__current_pes_app = new window.FutmundiPesGameApp(mountEl, modeStr, {
      onMatchEnd: handleMatchEnd
    });
  }

  // Ojo: secuestramos y reemplazamos a fuego el lanzador global para sepultar al viejo RetroCancha
  window.__FM_UNIVERSAL_OPEN_GAME = openTruePesGame;
  window.openGame = openTruePesGame;

  function handleMatchEnd(detail) {
    console.log("[Futmundi Play Integration] Partido Completado con Éxito:", detail);

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

  // Delegación Universal de clics nativa
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
    // 1. Ocultar los días en Neymar gratis
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

    // 2. Erradicar de forma implacable el viejo y feo recuadro RetroCancha
    const oldOverlay = document.getElementById("fm-game-overlay");
    if (oldOverlay && oldOverlay !== overlay) {
      oldOverlay.remove(); // FULMINADO PARA SIEMPRE
    }

    // 3. Reenlazamos a fuego los botones fotográficos de Cancha y Estadio
    document.querySelectorAll(".actions .btn-play").forEach(btn => {
      const mode = btn.dataset.playLocal;
      if (mode && !btn.dataset.pesWired) {
        btn.dataset.pesWired = "1";
        btn.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          openTruePesGame(mode);
        };
      }
    });

    // 4. Parche de modales informativos de selección
    const modalInner = document.getElementById("fm-modal-inner");
    if (modalInner) {
      const titleEl = modalInner.querySelector(".modal-title");
      if (titleEl) {
        const titleTxt = titleEl.textContent || "";
        
        if (titleTxt.includes("Torneo")) {
          let btnReg = modalInner.querySelector("#t-register");
          if(btnReg && !btnReg.dataset.pesTournWired) {
            btnReg.dataset.pesTournWired = "1";
            btnReg.onclick = (e) => {
              e.stopPropagation();
              setTimeout(() => openTruePesGame("tournament"), 1000);
            };
          }
        } else if (titleTxt.includes("Estadio")) {
          let cta = modalInner.querySelector(".m-cta");
          if(cta && !cta.dataset.pesCtaWired) {
            cta.dataset.pesCtaWired = "1";
            cta.textContent = "⚽ ENTRAR A JUGAR EN EL ESTADIO (PvP FÍSICO)";
            cta.onclick = (e) => {
              e.stopPropagation();
              openTruePesGame("pvp");
            };
          }
        } else if (titleTxt.includes("Cancha")) {
          let cta = modalInner.querySelector(".m-cta");
          if(cta && !cta.dataset.pesCtaWired) {
            cta.dataset.pesCtaWired = "1";
            cta.textContent = "⚽ ENTRAR A DISPUTAR PARTIDO EN CANCHA (PvE FÍSICO)";
            cta.onclick = (e) => {
              e.stopPropagation();
              openTruePesGame("pve");
            };
          }
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enforceUniversalPatcher);
  } else {
    enforceUniversalPatcher();
  }
  setInterval(enforceUniversalPatcher, 1000);
})();
