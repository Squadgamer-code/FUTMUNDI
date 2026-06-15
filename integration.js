// Futmundi <-> Retro Cancha 03 integration layer.
// Listens for [data-play-local] clicks anywhere in the document,
// opens the game in a fullscreen overlay, and reports match results
// to Futmundi's existing playMatchBackend() function.

(function () {
  if (window.__fm_game_integration_installed) return;
  window.__fm_game_integration_installed = true;

  // 1. Inject CSS for the overlay and close button.
  const style = document.createElement("style");
  style.textContent = `
    #fm-game-overlay{
      position:fixed;inset:0;z-index:99999999;
      background:radial-gradient(ellipse at center, #07120b 0%, #010302 100%);
      display:flex;flex-direction:column;
      animation:fmGameIn .25s ease;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #fm-game-overlay[hidden]{display:none!important}
    #fm-game-overlay #fm-game-close{
      position:absolute;top:calc(env(safe-area-inset-top, 8px) + 8px);right:12px;
      z-index:1000000;
      background:rgba(0,0,0,.85);
      color:#ffe871;border:2px solid #39ff88;
      border-radius:999px;padding:10px 18px;
      font:800 13px "Oswald",system-ui,sans-serif;
      letter-spacing:.15em;text-transform:uppercase;
      cursor:pointer;
      box-shadow:0 6px 20px rgba(0,0,0,.8),0 0 20px rgba(57,255,136,.3);
      transition:transform .15s ease, box-shadow .15s ease;
      pointer-events: auto;
    }
    #fm-game-overlay #fm-game-close:hover{
      transform:translateY(-2px);
      box-shadow:0 8px 25px rgba(0,0,0,.9),0 0 30px rgba(232,195,74,.6);
      border-color:#ffe871;color:#ffe871;
    }
    #fm-game-overlay #fm-game-close:active{
      transform:translateY(1px);
    }
    #fm-game-overlay #fm-game-mount{
      position:absolute;inset:0;overflow:hidden;
      background:#000;
      display:grid;
      place-items:center;
    }
    @keyframes fmGameIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
    /* When the game is open, hide Futmundi UI */
    body.fm-game-open .tabbar{display:none!important}
    body.fm-game-open .header{display:none!important}
    body.fm-game-open .chips{display:none!important}
    body.fm-game-open main{padding:0!important; display:none!important;}
  `;
  document.head.appendChild(style);

  // 2. Create the overlay container.
  const overlay = document.createElement("div");
  overlay.id = "fm-game-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button id="fm-game-close" type="button" aria-label="Volver a FUTMUNDI">✕ VOLVER A PLATAFORMA</button>
    <div id="fm-game-mount"></div>
  `;
  document.body.appendChild(overlay);

  const mountEl = document.getElementById("fm-game-mount");
  const closeBtn = document.getElementById("fm-game-close");
  let active = null;

  function closeGame() {
    if (window.RetroCancha && typeof window.RetroCancha.stop === "function") {
      try { window.RetroCancha.stop(); } catch (e) { console.warn(e); }
    }
    overlay.hidden = true;
    document.body.classList.remove("fm-game-open");
    document.body.style.overflow = "";
    if (mountEl) mountEl.innerHTML = "";
    active = null;
    try {
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    } catch {}
  }

  
  window.__FM_UNIVERSAL_OPEN_GAME = function(mode) {
    console.info("[UniversalOpenGame] Iniciando minijuego físico en modo:", mode);
    setTimeout(() => {
      const modalEl = document.getElementById("fm-modal");
      if(modalEl) modalEl.classList.remove("open");
      openGame(mode);
    }, 50);
  };

  function openGame(mode) {
    if (!window.RetroCancha || typeof window.RetroCancha.start !== "function") {
      console.error("[Futmundi] RetroCancha not loaded");
      if (typeof toast === "function") toast("Juego no disponible aún. Recarga la página.", false);
      return;
    }
    overlay.hidden = false;
    document.body.classList.add("fm-game-open");
    document.body.style.overflow = "hidden";
    if (mountEl) mountEl.innerHTML = "";
    active = mode;

    // Bloqueamos a apaisado Landscape
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch {}

    window.RetroCancha.start({
      mount: mountEl,
      mode: mode,
      onMatchEnd: handleMatchEnd,
    });
  }

  function handleMatchEnd(detail) {
    console.log("[Futmundi] match end", detail);

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
    if (!STATE.tonWallet) {
      console.info("[Futmundi] Sin wallet, no se puede registrar el score del torneo");
      return;
    }
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
      console.warn("[Futmundi] Fallback a /api/matches/play:", e.message);
      try {
        if (typeof playMatchBackend === "function") {
          await playMatchBackend("cancha");
        }
      } catch (e2) {
        console.warn("[Futmundi] No se pudo registrar el torneo:", e2.message);
      }
    }
  }

  closeBtn.addEventListener("click", closeGame);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeGame();
  });

  // --- CAPA DE DELEGACIÓN OFICIAL Y DIRECTA DE CLICS ---
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-play-local]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const mode = btn.dataset.playLocal;
    if (!mode) return;
    const modal = document.getElementById("fm-modal");
    if (modal && modal.classList.contains("open")) {
      modal.classList.remove("open");
    }
    setTimeout(() => openGame(mode), 150);
  }, true);

  // --- UNIVERSAL DOM AUTO-PATCHER PARA FUTMUNDI MINI APP ---
  function enforceFutmundiCorrections() {
    // 1. Ocultar los días en Neymar gratis
    if (typeof window.playerStatusText === "function" && !window.__fm_pst_patched) {
      window.__fm_pst_patched = true;
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

    // 2. Conectar clics directos en botones fotográficos principales
    document.querySelectorAll(".actions .btn-play").forEach(btn => {
      const mode = btn.dataset.playLocal;
      if (mode && !btn.dataset.directGameplayWired) {
        btn.dataset.directGameplayWired = "1";
        btn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          openGame(mode);
        });
      }
    });

    // 3. Modales en vivo
    const modalInner = document.getElementById("fm-modal-inner");
    if (modalInner && !window.__fm_tourn_obs_patched) {
      window.__fm_tourn_obs_patched = true;
      const observer = new MutationObserver(() => {
        const titleEl = modalInner.querySelector(".modal-title");
        if (!titleEl) return;
        const titleTxt = titleEl.textContent || "";

        if (titleTxt.includes("Torneo")) {
          let btnReg = modalInner.querySelector("#t-register");
          if (btnReg && !btnReg.dataset.tournWired) {
            btnReg.dataset.tournWired = "1";
            btnReg.addEventListener("click", () => {
              setTimeout(() => {
                const fmModal = document.getElementById("fm-modal");
                if(fmModal) fmModal.classList.remove("open");
                openGame("tournament");
              }, 1200);
            });
          }
        } else if (titleTxt.includes("Estadio")) {
          let cta = modalInner.querySelector(".m-cta");
          if (cta && !cta.dataset.gameplayWired) {
            cta.dataset.gameplayWired = "1";
            cta.textContent = "🎮 Disputar Partido en Estadio Fisico (PvP)";
            cta.onclick = (e) => {
              e.stopPropagation();
              const modal = document.getElementById("fm-modal");
              if(modal) modal.classList.remove("open");
              openGame("pvp");
            };
          }
        } else if (titleTxt.includes("Cancha")) {
          let cta = modalInner.querySelector(".m-cta");
          if (cta && !cta.dataset.gameplayWired) {
            cta.dataset.gameplayWired = "1";
            cta.textContent = "🎮 Disputar Partido Rapido vs CPU (PvE Físico)";
            cta.onclick = (e) => {
              e.stopPropagation();
              const modal = document.getElementById("fm-modal");
              if(modal) modal.classList.remove("open");
              openGame("pve");
            };
          }
        }
      });
      observer.observe(modalInner, { childList: true, subtree: true });
    }

    // 4. Forzamos Nombre NFT activo en .hud-blue
    const hudBlueEl = document.querySelector(".hud-blue span");
    if (hudBlueEl) {
      const activeNftName = (window.STATE && window.STATE.selectedPlayerName) || localStorage.getItem("fm_selected_player_name") || "NEYMAR";
      if(hudBlueEl.textContent !== activeNftName.toUpperCase()) {
        hudBlueEl.textContent = activeNftName.toUpperCase();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enforceFutmundiCorrections);
  } else {
    enforceFutmundiCorrections();
  }
  setInterval(enforceFutmundiCorrections, 1000);

})();
