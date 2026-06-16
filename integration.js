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
    
  const NFT_PRODUCTION_OFFICIAL = {
    "Neymar": { price: 0, roiDays: 50, dailyGems: 3.2, perWin: 1.0, profitDays: 50 },
    "James Rodríguez": { price: 320, roiDays: 40, dailyGems: 8.0, perWin: 2.0, profitDays: 17 },
    "Alexis Sánchez": { price: 640, roiDays: 36, dailyGems: 17.0, perWin: 4.25, profitDays: 17 },
    "Harry Kane": { price: 960, roiDays: 34, dailyGems: 28.0, perWin: 7.0, profitDays: 17 },
    "Pedri": { price: 1280, roiDays: 33, dailyGems: 39.0, perWin: 9.75, profitDays: 17 },
    "Vinicius Jr": { price: 1600, roiDays: 31, dailyGems: 52.0, perWin: 13.0, profitDays: 21 },
    "Rodri": { price: 1920, roiDays: 27.55, dailyGems: 70.0, perWin: 17.5, profitDays: 15 },
    "Mbappé": { price: 2080, roiDays: 27, dailyGems: 77.0, perWin: 19.25, profitDays: 15 },
    "Haaland": { price: 2240, roiDays: 25, dailyGems: 89.0, perWin: 22.25, profitDays: 12 },
    "Lamine Yamal": { price: 4000, roiDays: 21, dailyGems: 190.0, perWin: 47.5, profitDays: 10 },
    "Bellingham": { price: 5120, roiDays: 21, dailyGems: 244.0, perWin: 61.0, profitDays: 10 },
    "Lionel Messi": { price: 6400, roiDays: 21, dailyGems: 304.0, perWin: 76.0, profitDays: 10 },
    "Cristiano R.": { price: 16000, roiDays: 15, dailyGems: 1067.0, perWin: 266.75, profitDays: 10 }
  };
  window.NFT_PRODUCTION_OFFICIAL = NFT_PRODUCTION_OFFICIAL;

  
  window.__FM_UNIVERSAL_OPEN_GAME = function(modeStr) {
    if (!window.STATE || !window.STATE.tonWallet) {
      alert("⚠️ RESTRICCIÓN WEB3: Tu Billetera de TON no se encuentra conectada. Conecta tu Billetera en la cabecera superior para autorizar el ingreso.");
      return;
    }
    
    const pObj = typeof window.getSelectedPlayer === "function" ? window.getSelectedPlayer() : null;
    if (!pObj) {
      alert("⚠️ ACCESO DENEGADO: No posees un Futbolista NFT activo asignado. Sin un NFT no puedes acceder a la cancha. Ve a Futbolista o Market y reclama tu Futbolista Gratis Inicial (Neymar) antes de entrar.");
      return;
    }

    let isRecreational = false;
    if (pObj.stamina <= 0) {
      // ESTAMINA AGOTADA: Entra de inmediato a Modo Recreativo para pasarlo en grande mas NO generara Gemas de premio. 
      // Ningún balon se resta aqui.
      isRecreational = true;
      console.info("[Integration Patcher] Modalidad Recreativa Visual activada (El NFT no posee balones).");
      if (typeof toast === "function") {
        toast("⚠️ Tu NFT agotó sus 4 balones. Entrando a MODO RECREATIVO (Podrás disputar y ver partidos mas NO generará Gemas de premio hasta las 00:00 UTC).", false);
      }
    } else {
      console.info("[Integration Patcher] Acceso Competitivo Web3 Autorizado (" + pObj.name + ").");
    }

    // Cerramos el modal de la app si existiera
    const fmModal = document.getElementById("fm-modal");
    if (fmModal) fmModal.classList.remove("open");

    const fullOverlayDiv = document.getElementById("fm-pes-gameboy-overlay");
    const targetMountDiv = document.getElementById("pes-gameboy-mount-target");

    if (targetMountDiv && fullOverlayDiv) {
      fullOverlayDiv.hidden = false;
      document.body.classList.add("fm-pes-game-active");
      
      // Aseguramos de que el div ocupe la pantalla de par en par con True Dimension Lock nativo
      targetMountDiv.style.cssText = "position:absolute; inset:0; width:100vw; height:100vh; display:flex; justify-content:center; align-items:center; background:#08100b; z-index:99999999;";

      // Levantamos en RAM de forma gloriosa, invulnerable y Zero Lag nuestra Súper PES Gameboy True Apaisada Suite
      window.__current_pes_app = new window.FutmundiPesGameApp(targetMountDiv, modeStr, {
        isRecreationalMode: isRecreational,
        onMatchEnd: (detail) => {
          // OJO: AQUÍ es exactamente donde se le OTORGAN SUS GEMAS y SE LE DESCUENTA SU BALÓN TÁN SÓLO SI EL USUARIO COMPLETÓ SU VIDEOJUEGO DISPUTADO FÍSICAMENTE
          console.info("[Futmundi Gameplay Match Finished] Boleta recibida:", detail);
          
          if (!isRecreational && detail.result === "Victoria" && pObj && pObj.stamina > 0) {
            pObj.stamina -= 1;
            pObj.durability = Math.max(0, +(pObj.durability - 0.8).toFixed(1));
            if(typeof window.saveInventory === "function") window.saveInventory();
            if(typeof window.renderFutbolistaInventory === "function") window.renderFutbolistaInventory();
          }

          if (detail.mode === "tournament") {
            try { window.submitTournamentResult(detail); } catch {}
          } else if (typeof window.playMatchBackend === "function") {
            try { window.playMatchBackend(detail.mode === "pve" ? "cancha" : "estadio"); } catch {}
          }
        }
      });
    }
  };
  window.openGame = window.__FM_UNIVERSAL_OPEN_GAME;

})();
