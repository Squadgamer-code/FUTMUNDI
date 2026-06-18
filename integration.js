// Futmundi <-> Futmundi PES Premium Blockchain integration layer.
// v4: Acceso sin fricción, modo recreativo PvE sin wallet, auto-claim Neymar,
//     renderer optimizado y robustez ante fallos de TON Connect.

(function () {
  if (window.__fm_game_integration_installed) return;
  window.__fm_game_integration_installed = true;

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

  function consumePlayerStamina(playerId) {
    if (!window.STATE || !window.STATE.inventory) return;
    const player = window.STATE.inventory.players.find(p => p.id === playerId);
    if (!player) return;
    if (player.stamina <= 0) return;
    player.stamina = Math.max(0, player.stamina - 1);
    player.durability = Math.max(0, +(player.durability - 0.5).toFixed(1));
    if (typeof window.saveInventory === "function") window.saveInventory();
    if (typeof window.renderFutbolistaInventory === "function") window.renderFutbolistaInventory();
    if (typeof toast === "function") {
      toast(`⚽ Balón consumido: ${player.name} (Quedan ${player.stamina}/${player.maxStamina})`, true);
    }
  }

  function hasPlayerNft() {
    return !!(typeof window.getSelectedPlayer === "function" && window.getSelectedPlayer());
  }

  function tryAutoClaimNeymar() {
    if (!window.addInventoryItem) return false;
    try {
      const result = window.addInventoryItem('Neymar');
      return !!(result && result.ok);
    } catch (e) {
      console.warn('[Integration] Auto-claim Neymar failed:', e);
      return false;
    }
  }

  function openMarketModal() {
    if (typeof window.openModal === "function") window.openModal('market');
  }

  function openTruePesGame(modeStr) {
    const isPve = modeStr === 'pve' || modeStr === 'cancha';
    const isCompetitive = modeStr === 'pvp' || modeStr === 'estadio' || modeStr === 'tournament';
    const hasWallet = !!(window.STATE && window.STATE.tonWallet);

    // 1. NFT es obligatorio para cualquier modo. Si no lo hay, intentamos regalar Neymar gratis.
    if (!hasPlayerNft()) {
      if (tryAutoClaimNeymar() && hasPlayerNft()) {
        if (typeof toast === "function") toast('🎁 Reclamamos Neymar gratis para tu primera partida. ¡A jugar!', true);
      } else {
        alert("⚠️ Necesitas un Futbolista NFT para jugar.\n\n1. Toca la pestaña 'Market' (abajo).\n2. Toca 'Reclamar GRATIS' en Neymar.\n3. Vuelve aquí y toca Jugar.");
        openMarketModal();
        return;
      }
    }

    // 2. Modos competitivos / torneo requieren wallet Web3 sí o sí.
    if (!hasWallet && isCompetitive) {
      alert("⚠️ El Estadio PvP y el Torneo requieren tu wallet TON conectada para registrar gemas y recompensas en blockchain.\n\nConecta tu wallet en la barra superior (botón TON Connect).");
      return;
    }

    const PesGameClass = window.FutmundiPesGameApp || window.PurePesGameboyApp;
    if (!PesGameClass) {
      alert("⚠️ El motor del juego está terminando de cargar. Por favor, intenta de nuevo en unos segundos.");
      return;
    }

    console.info(`[UniversalLauncher] Abriendo arena modo: ${modeStr} (wallet=${hasWallet}, recreativo=${!hasWallet && isPve})`);

    const fmModal = document.getElementById("fm-modal");
    if (fmModal) fmModal.classList.remove("open");

    overlay.removeAttribute('hidden');
    overlay.style.display = 'flex';
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

    try {
      window.__current_pes_app = new PesGameClass(mountEl, modeStr, {
        onMatchEnd: handleMatchEnd,
        onConsumeStamina: consumePlayerStamina,
        isRecreationalMode: !hasWallet && isPve
      });
    } catch (err) {
      console.error('[UniversalLauncher] Error al crear el juego:', err);
      alert('⚠️ No se pudo iniciar el juego: ' + (err.message || 'Error desconocido'));
      destroyPesGame();
      return;
    }
  }

  window.__FM_UNIVERSAL_OPEN_GAME = openTruePesGame;
  window.openGame = openTruePesGame;

  function mapMatchResultToCode(detail) {
    const r = String((detail && detail.result) || '').toLowerCase();
    if (r.includes('victoria') || r.includes('victory') || r.includes('win') || r.includes('vitória')) return 'win';
    if (r.includes('empate') || r.includes('draw') || r.includes('tabla')) return 'draw';
    return 'loss';
  }

  function handleMatchEnd(detail) {
    console.log("[Futmundi Integration] Partido terminado:", detail);

    if (detail.wasPlayed && detail.consumedPlayerId) {
      consumePlayerStamina(detail.consumedPlayerId);
    }

    // Si fue recreativo (sin wallet) no tocamos backend ni economía.
    if (!window.STATE || !window.STATE.tonWallet) {
      if (typeof toast === "function") {
        toast("🏟️ Partido de práctica finalizado. Conecta tu wallet para ganar gemas reales.", true);
      }
      return;
    }

    if (detail.mode === "tournament") {
      submitTournamentResult(detail);
    } else if (typeof playMatchBackend === "function") {
      const fmMode = detail.mode === "pve" ? "cancha" : "estadio";
      try { playMatchBackend(fmMode, detail.resultCode || mapMatchResultToCode(detail)); } catch (e) { console.warn(e); }
    }

    if (typeof toast === "function") {
      const emoji = detail.result === "Victoria" ? "🏆" : detail.result === "Empate" ? "🤝" : "😔";
      if (detail.mode === "tournament") {
        const t = detail.tournament || {};
        if (t.champion) toast(`🏆 ¡CAMPEÓN! Score: ${t.finalScore}`, true);
        else if (t.eliminated) toast(`😔 Eliminado · ${t.wins}/15 victorias`, false);
        else toast(`${emoji} ${detail.result} · ${detail.points} PTS`, detail.result !== "Derrota");
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

  // Parche de interfaz (one-shot, sin bucle infinito)
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
