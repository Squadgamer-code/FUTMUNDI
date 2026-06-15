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
      position:fixed;inset:0;z-index:99999;
      background:radial-gradient(ellipse at center, #07120b 0%, #010302 100%);
      display:flex;flex-direction:column;
      animation:fmGameIn .25s ease;
    }
    #fm-game-overlay[hidden]{display:none!important}
    #fm-game-overlay #fm-game-close{
      position:absolute;top:calc(env(safe-area-inset-top, 8px) + 8px);right:10px;
      z-index:100000;
      background:rgba(0,0,0,.78);
      color:#ffe871;border:1.5px solid rgba(57,255,136,.55);
      border-radius:999px;padding:9px 16px;
      font:600 12px "Oswald",sans-serif;
      letter-spacing:.18em;text-transform:uppercase;
      cursor:pointer;z-index:100000;
      box-shadow:0 4px 14px rgba(0,0,0,.55),0 0 18px rgba(57,255,136,.16);
      transition:transform .18s ease, box-shadow .18s ease;
    }
    #fm-game-overlay #fm-game-close:hover{
      transform:translateY(-2px);
      box-shadow:0 6px 18px rgba(0,0,0,.6),0 0 28px rgba(232,195,74,.45);
      border-color:var(--fm-gold, #f4c542);color:var(--fm-gold, #f4c542);
    }
    #fm-game-overlay #fm-game-mount{
      position:absolute;inset:0;overflow:hidden;
      background:#000;
    }
    @keyframes fmGameIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
    /* When the game is open, hide Futmundi's tabbar so it doesn't overlay */
    body.fm-game-open .tabbar{display:none!important}
    body.fm-game-open .header{display:none!important}
    body.fm-game-open .chips{display:none!important}
    body.fm-game-open main{padding:0!important}
  `;
  document.head.appendChild(style);

  // 2. Create the overlay container.
  const overlay = document.createElement("div");
  overlay.id = "fm-game-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <button id="fm-game-close" type="button" aria-label="Volver a FUTMUNDI">✕ VOLVER</button>
    <div id="fm-game-mount"></div>
  `;
  document.body.appendChild(overlay);

  const mountEl = document.getElementById("fm-game-mount");
  const closeBtn = document.getElementById("fm-game-close");
  const mainScriptEl = document.getElementById("fm-modal-script-marker") || null;
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
  }

  function openGame(mode) {
    if (!window.RetroCancha || typeof window.RetroCancha.start !== "function") {
      console.error("[Futmundi] RetroCancha not loaded");
      if (typeof toast === "function") toast("Juego no disponible aún", false);
      return;
    }
    overlay.hidden = false;
    document.body.classList.add("fm-game-open");
    document.body.style.overflow = "hidden";
    if (mountEl) mountEl.innerHTML = "";
    active = mode;
    window.RetroCancha.start({
      mount: mountEl,
      mode: mode,
      onMatchEnd: handleMatchEnd,
    });
  }

  function handleMatchEnd(detail) {
    console.log("[Futmundi] match end", detail);

    // Tournament uses a dedicated endpoint that ranks players globally.
    // PvE / PvP use the regular playMatchBackend.
    if (detail.mode === "tournament") {
      submitTournamentResult(detail);
    } else if (typeof playMatchBackend === "function") {
      const fmMode = detail.mode === "pve" ? "estadio" : "cancha";
      try { playMatchBackend(fmMode); } catch (e) { console.warn(e); }
    }

    // Show toast with the result.
    if (typeof toast === "function") {
      const emoji = detail.result === "Victoria" ? "🏆" : detail.result === "Empate" ? "🤝" : "😔";
      if (detail.mode === "tournament") {
        const t = detail.tournament || {};
        if (t.champion) {
          toast(`🏆 ¡CAMPEÓN! Score final: ${t.finalScore} (${t.basePoints} × ${t.multiplier}x) · Tier: ${t.highestTier}`, true);
        } else if (t.eliminated) {
          toast(`😔 Eliminado · ${t.wins}/15 victorias · Score: ${t.finalScore} (×${t.multiplier} tier ${t.highestTier})`, false);
        } else {
          // Inter-ronda (no debería pasar pero por si acaso)
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
      // Try the dedicated tournament endpoint first
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
        console.info("[Futmundi] Tournament submitted, rank:", data.ranking);
        if (typeof toast === "function" && data.ranking.position) {
          toast(`🏆 Posición #${data.ranking.position} en el leaderboard · Score: ${data.ranking.best}`, true);
        }
      }
      return data;
    } catch (e) {
      // Fallback: use existing match endpoint with mode=tournament
      console.warn("[Futmundi] /api/tournament/submit no existe, fallback a /api/matches/play:", e.message);
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

  // ESC closes the game.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeGame();
  });

  // Catch all clicks on [data-play-local] elements anywhere in the document.
  // Closes any open Futmundi modal first, then opens the game.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-play-local]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const mode = btn.dataset.playLocal;
    if (!mode) return;
    const modal = document.getElementById("fm-modal");
    if (modal && modal.classList.contains("open") && typeof closeModal === "function") {
      closeModal();
    }
    setTimeout(() => openGame(mode), 220);
  }, true);
})();
