// Futmundi <-> Futmundi PES Premium Blockchain integration layer.
// v3: Selector de NFT + consumo diferido de estamina (bug de balones fix).
// El balón SOLO se descuenta cuando el partido termina de jugarse de verdad.

(function () {
  if (window.__fm_game_integration_installed) return;
  window.__fm_game_integration_installed = true;

  // 1. CSS del overlay universal (SIN rotación forzada — era la causa #1 de
  //    que el botón "ENTRAR A JUGAR" no respondiera a los taps en móvil).
  const style = document.createElement("style");
  style.textContent = `
    #fm-pes-gameboy-overlay {
      position:fixed;inset:0;z-index:99999999999;
      background:radial-gradient(ellipse at center, #0d1e15 0%, #050c08 100%);
      display:flex;flex-direction:column;
      justify-content:center;align-items:center;
      animation:pesGameIn .25s ease;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }
    #fm-pes-gameboy-overlay[hidden] {
      display:none!important;
    }
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
      touch-action: manipulation;
    }
    .fm-pes-universal-close-btn:hover,
    .fm-pes-universal-close-btn:active {
      background:#39ff88;color:#0b1319;border-color:#fff;
      transform:scale(1.05);
    }
    #pes-gameboy-mount-target {
      position:absolute;inset:0;overflow:hidden;
      background:#08100b;
      display:flex;
      justify-content:center;
      align-items:center;
    }
    @keyframes pesGameIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
    body.fm-game-open .tabbar, body.fm-pes-game-active .tabbar {display:none!important}
    body.fm-game-open .header, body.fm-pes-game-active .header {display:none!important}
    body.fm-game-open .chips, body.fm-pes-game-active .chips {display:none!important}
    body.fm-game-open main, body.fm-pes-game-active main {display:none!important}
  `;
  if (document.head) document.head.appendChild(style);

  // 2. Crear el overlay universal
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

  // 3. FIX BUG DE BALONES: consume la estamina SOLO cuando el partido
  //    termina de jugarse de verdad. Si el usuario cierra sin jugar,
  //    no se descuenta ningún balón.
  function consumePlayerStamina(playerId) {
    if (!window.STATE || !window.STATE.inventory) return;
    const player = window.STATE.inventory.players.find(p => p.id === playerId);
    if (!player) return;
    if (player.stamina <= 0) return; // modo recreativo: no consume
    player.stamina = Math.max(0, player.stamina - 1);
    player.durability = Math.max(0, +(player.durability - 0.8).toFixed(1));
    if (typeof window.saveInventory === "function") window.saveInventory();
    if (typeof window.renderFutbolistaInventory === "function") window.renderFutbolistaInventory();
    if (typeof toast === "function") {
      toast(`⚽ Balón consumido: ${player.name} (Quedan ${player.stamina}/${player.maxStamina})`, true);
    }
  }

  // 4. EL LANZADOR — sin descuento prematuro de balones
  function openTruePesGame(modeStr) {
    if (!window.STATE || !window.STATE.tonWallet) {
      alert("⚠️ RESTRICCIÓN DE CIBERSEGURIDAD WEB3: Tu Billetera de TON no se encuentra conectada. Conecta tu Billetera en la parte superior para autorizar tu acceso.");
      return;
    }

    const pObj = typeof window.getSelectedPlayer === "function" ? window.getSelectedPlayer() : null;
    if (!pObj) {
      alert("⚠️ ACCESO DENEGADO: No tienes ningún Futbolista NFT activo en tu inventario. Ve a la pestaña Futbolista o Market y adquiere o reclama tu NFT Gratis Inicial antes de saltar a la arena.");
      return;
    }

    const PesGameClass = window.FutmundiPesGameApp || window.PurePesGameboyApp;
    if (!PesGameClass) {
      alert("⚠️ El motor del juego está terminando de cargar. Por favor, toca Jugar de nuevo en un segundo.");
      return;
    }

    // NOTA: Aquí NO se descuentan balones. El consumo es diferido.
    console.info(`[UniversalLauncher] Abriendo arena modo: ${modeStr}`);

    const fmModal = document.getElementById("fm-modal");
    if (fmModal) fmModal.classList.remove("open");

    overlay.style.display = 'flex';
    overlay.removeAttribute('hidden');
    document.body.classList.add("fm-game-open");
    document.body.classList.add("fm-pes-game-active");

    if (mountEl) {
      mountEl.innerHTML = "";
      mountEl.style.display = "flex";
    }

    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } catch {}

    requestAnimationFrame(() => {
      window.__current_pes_app = new PesGameClass(mountEl, modeStr, {
        onMatchEnd: handleMatchEnd,
        onConsumeStamina: consumePlayerStamina
      });
    });
  }
  window.__FM_UNIVERSAL_OPEN_GAME = openTruePesGame;
  window.openGame = openTruePesGame;

  // 5. Callback de fin de partido
  function handleMatchEnd(detail) {
    console.log("[Futmundi Integration] Partido terminado:", detail);

    // Consumo diferido de estamina: SOLO si el partido se jugó de verdad.
    if (detail.wasPlayed && detail.consumedPlayerId) {
      consumePlayerStamina(detail.consumedPlayerId);
    }

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
          toast(`🏆 ¡CAMPEÓN! Score: ${t.finalScore} · Tier: ${t.highestTier}`, true);
        } else if (t.eliminated) {
          toast(`😔 Eliminado · ${t.wins}/15 victorias · Score: ${t.finalScore}`, false);
        } else {
          toast(`${emoji} ${detail.result} · ${detail.points} PTS`, detail.result !== "Derrota");
        }
      } else {
        toast(`${emoji} ${detail.result} ${detail.score} · ${detail.points} PTS`, detail.result !== "Derrota");
      }
    }
  }

  async function submitTournamentResult(detail) {
    if (!window.STATE || !window.STATE.tonWallet) return;
    const t = detail.tournament || {};
    try {
      const data = await backendJSON("/api/tournament/submit", {
        address: window.STATE.tonWallet,
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
        window.STATE.tournamentBest = data.ranking.best || t.finalScore;
        window.STATE.tournamentRank = data.ranking.position || null;
        if (typeof updateHeaderStats === "function") updateHeaderStats();
        if (typeof toast === "function" && data.ranking.position) {
          toast(`🏆 Posición #${data.ranking.position} · Score: ${data.ranking.best}`, true);
        }
      }
    } catch (e) {
      try {
        if (typeof playMatchBackend === "function") await playMatchBackend("cancha");
      } catch {}
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", destroyPesGame);
    closeBtn.addEventListener("touchend", (e) => { e.preventDefault(); destroyPesGame(); });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) destroyPesGame();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-play-local]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const mode = btn.dataset.playLocal;
    if (!mode) return;
    setTimeout(() => openTruePesGame(mode), 80);
  }, true);

  // 6. Parche de interfaz (one-shot, sin bucle infinito)
  function enforceUniversalPatcher() {
    if (typeof window.playerStatusText === "function" && !window.__fm_pst_upgraded) {
      window.__fm_pst_upgraded = true;
      const oldPst = window.playerStatusText;
      window.playerStatusText = function(player) {
        if (player && player.name === "Neymar") {
          return { cls: "dur-ok", text: "Gratis · ⚡ " + player.stamina + "/" + player.maxStamina };
        }
        try { return oldPst(player); } catch {
          return { cls: "dur-ok", text: "Dur. 100% · ⚡ 4/4" };
        }
      };
    }
  }

  function runPatcher() {
    enforceUniversalPatcher();
    let tries = 0;
    const retry = setInterval(() => {
      enforceUniversalPatcher();
      if (++tries >= 4) clearInterval(retry);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runPatcher);
  } else {
    runPatcher();
  }
})();
