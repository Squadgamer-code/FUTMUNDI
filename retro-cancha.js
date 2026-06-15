var RetroCancha = (function () {
  "use strict";
  const x = new Map(),
    C = new Map();
  function q(o) {
    for (const [t, e] of Object.entries(o || {})) x.has(t) || x.set(t, e.value);
    return {
      get(t) {
        return x.has(t) ? x.get(t) : void 0;
      },
      set(t, e) {
        x.set(t, e);
        const s = C.get(t);
        s && s.forEach((a) => a(e));
      },
      subscribe(t, e) {
        return (
          C.has(t) || C.set(t, new Set()),
          C.get(t).add(e),
          () => {
            var s;
            return (s = C.get(t)) == null ? void 0 : s.delete(e);
          }
        );
      },
    };
  }
  async function z(o) {
    return new Promise((t, e) => {
      const s = new Image();
      ((s.crossOrigin = "anonymous"),
        (s.onload = () => t(s)),
        (s.onerror = (a) => e(new Error(`Failed to load image: ${o}`))),
        (s.src = o));
    });
  }
  function U(o) {
    const t = new Map();
    let e = null;
    const s = async () =>
      e ||
      ((e = (async () => {
        for (const [a, i] of Object.entries(o || {}))
          if (typeof i == "string" && !t.has(a))
            try {
              const n = await z(i);
              t.set(a, { image: n, url: i });
            } catch (n) {
              console.warn("[sdk-stub] Asset failed to load:", a, i, n);
            }
      })()),
      e);
    return {
      get(a) {
        const i = t.get(a);
        return i ? i.url : (o && o[a]) || "";
      },
      getImage(a) {
        const i = t.get(a);
        return i ? i.image : null;
      },
      preload: s,
      ready: s,
    };
  }
  function H() {
    let o = null;
    return {
      context: null,
      getContext() {
        if (!o)
          try {
            const t = window.AudioContext || window.webkitAudioContext;
            t && (o = new t());
          } catch (t) {
            console.warn("[sdk-stub] No AudioContext available:", t);
          }
        return {
          context: o,
          async unlock() {
            if (o && o.state === "suspended")
              try {
                await o.resume();
              } catch {}
          },
        };
      },
    };
  }
  function j(o) {
    const t = "retroCancha03:save:" + o;
    return {
      async load() {
        try {
          const e = localStorage.getItem(t);
          return e ? JSON.parse(e) : null;
        } catch {
          return null;
        }
      },
      async save(e) {
        try {
          localStorage.setItem(t, JSON.stringify(e));
        } catch {}
        return !0;
      },
    };
  }
  function V() {
    return {
      isSupported() {
        return typeof navigator < "u" && "vibrate" in navigator;
      },
      vibrate(o) {
        try {
          navigator != null && navigator.vibrate && navigator.vibrate(o);
        } catch {}
      },
    };
  }
  function Y() {
    return {
      async submit(o) {
        console.info("[sdk-stub] Leaderboard score (local only):", o);
        try {
          const t = "retroCancha03:leaderboard",
            e = JSON.parse(localStorage.getItem(t) || "[]");
          (e.push({ score: o, at: Date.now() }),
            e.sort((s, a) => a.score - s.score),
            localStorage.setItem(t, JSON.stringify(e.slice(0, 20))));
        } catch {}
        return !0;
      },
    };
  }
  const R = {
      async ready() {
        return !0;
      },
      tweaks: { init: q },
      assets: { register: U },
      audio: H(),
      gameState: j(1),
      device: { haptics: V() },
      leaderboard: Y(),
    },
    y = 68,
    d = 105,
    v = 22,
    S = 46,
    I = 1,
    D = {
      STADIUM_BACKDROP: "generated-assets/stadium_backdrop.png",
      GRASS_TEXTURE: "generated-assets/grass_texture.png",
      PLAYER_ATLAS: "generated-assets/player_atlas.png",
      PLAYER_ATLAS_FRAMES: "generated-assets/player_atlas-frames.json",
      GOAL_NET: "generated-assets/goal_net.png",
    },
    G = {
      matchLength: 90,
      gameSpeed: 1,
      aiAggression: 1,
      shotAssist: 0.55,
      effectsIntensity: 1,
    },
    T = [
      {
        name: "Curdo FC",
        tier: "Bronce",
        aiAggression: 0.85,
        matchLength: 70,
        color: "#8e8e8e",
        reward: 120,
      },
      {
        name: "River Pinto",
        tier: "Bronce",
        aiAggression: 0.95,
        matchLength: 75,
        color: "#e04545",
        reward: 140,
      },
      {
        name: "Boca Juniors",
        tier: "Bronce",
        aiAggression: 1.05,
        matchLength: 80,
        color: "#1e63d6",
        reward: 160,
      },
      {
        name: "Atlas Tijuana",
        tier: "Bronce",
        aiAggression: 1.15,
        matchLength: 85,
        color: "#c3423f",
        reward: 180,
      },
      {
        name: "Real Mandril",
        tier: "Bronce",
        aiAggression: 1.25,
        matchLength: 90,
        color: "#f5f5f5",
        reward: 200,
      },
      {
        name: "Atleti Nuccia",
        tier: "Plata",
        aiAggression: 1.35,
        matchLength: 95,
        color: "#9c4137",
        reward: 260,
      },
      {
        name: "Bayern München",
        tier: "Plata",
        aiAggression: 1.45,
        matchLength: 100,
        color: "#c20e1a",
        reward: 320,
      },
      {
        name: "Paris SG",
        tier: "Plata",
        aiAggression: 1.55,
        matchLength: 105,
        color: "#004170",
        reward: 380,
      },
      {
        name: "Liverpool FC",
        tier: "Plata",
        aiAggression: 1.65,
        matchLength: 110,
        color: "#c8102e",
        reward: 440,
      },
      {
        name: "Man City",
        tier: "Plata",
        aiAggression: 1.75,
        matchLength: 115,
        color: "#6cabdd",
        reward: 500,
      },
      {
        name: "Juventus",
        tier: "Oro",
        aiAggression: 1.85,
        matchLength: 120,
        color: "#000000",
        reward: 600,
      },
      {
        name: "FC Barcelona",
        tier: "Oro",
        aiAggression: 1.95,
        matchLength: 125,
        color: "#a50044",
        reward: 700,
      },
      {
        name: "Real Madrid",
        tier: "Oro",
        aiAggression: 2.05,
        matchLength: 130,
        color: "#fcbf00",
        reward: 800,
      },
      {
        name: "Inter de Miami",
        tier: "Leyenda",
        aiAggression: 2.2,
        matchLength: 135,
        color: "#ff6f61",
        reward: 1e3,
      },
      {
        name: "Man United",
        tier: "Leyenda",
        aiAggression: 2.4,
        matchLength: 150,
        color: "#da291c",
        reward: 2500,
      },
    ];
  function K({
    mount: o,
    sdk: t,
    tweaks: e,
    assets: s,
    mode: a = "pve",
    onMatchEnd: i,
  }) {
    let n = () => {};
    return {
      start() {
        const r = new J({ mount: o, sdk: t, tweaks: e, assets: s, mode: a });
        ((r.onMatchEnd = i || null), (n = () => r.destroy()), r.mount());
      },
      destroy() {
        (n(), (n = () => {}));
      },
    };
  }
  
  // --- GESTORES DE HISTORIAL PERSONAL Y TABLA DE POSICIONES ---
  const RetrocHistoryManager = {
    getKey() { return "retroCancha03:tournamentHistory"; },
    getHistory() {
      try {
        return JSON.parse(localStorage.getItem(this.getKey()) || "[]");
      } catch {
        return [];
      }
    },
    saveEntry(entry) {
      try {
        const hist = this.getHistory();
        hist.unshift({
          id: Date.now(),
          date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"}),
          timestamp: Date.now(),
          ...entry
        });
        const trimmed = hist.slice(0, 50);
        localStorage.setItem(this.getKey(), JSON.stringify(trimmed));
        return trimmed;
      } catch (e) {
        console.warn("[HistoryManager] Error:", e);
        return [];
      }
    },
    getStats() {
      const hist = this.getHistory();
      const totalPlayed = hist.length;
      const championships = hist.filter(h => h.champion).length;
      let bestScore = 0;
      hist.forEach(h => {
        if (h.finalScore && h.finalScore > bestScore) bestScore = h.finalScore;
      });
      const winRate = totalPlayed > 0 ? Math.round((championships / totalPlayed) * 100) : 0;
      return { totalPlayed, championships, bestScore, winRate };
    }
  };

  const RetrocLeaderboardManager = {
    getKey() { return "retroCancha03:leaderboard"; },
    getLocalLeaderboard() {
      try {
        return JSON.parse(localStorage.getItem(this.getKey()) || "[]");
      } catch {
        return [];
      }
    },
    saveLocalScore(score, details) {
      try {
        const list = this.getLocalLeaderboard();
        const playerName = details && details.player ? details.player : (window.STATE && window.STATE.tonWallet ? window.STATE.tonWallet.slice(0,6) + "..." + window.STATE.tonWallet.slice(-4) : "Jugador Local");
        const activeNft = details && details.nft ? details.nft : "Boca Exclusivo #8";
        
        const existing = list.find(x => x.player === playerName);
        if (existing) {
          if (score > existing.score) {
            existing.score = score;
            existing.at = Date.now();
            existing.date = new Date().toLocaleDateString();
            existing.rounds = details && details.rounds ? details.rounds : existing.rounds;
            existing.nft = activeNft;
          }
        } else {
          list.push({
            score: score,
            at: Date.now(),
            date: new Date().toLocaleDateString(),
            player: playerName,
            rounds: details && details.rounds ? details.rounds : "15/15",
            nft: activeNft
          });
        }
        
        list.sort((a,b) => b.score - a.score);
        const trimmed = list.slice(0, 100);
        localStorage.setItem(this.getKey(), JSON.stringify(trimmed));
      } catch {}
    }
  };

  function showRetrocModal(title, contentHTML) {
    let overlay = document.getElementById("retroc-universal-modal");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "retroc-universal-modal";
      overlay.className = "retroc-modal-overlay";
      document.body.appendChild(overlay);
    }
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="retroc-modal-box">
        <div class="retroc-modal-header">
          <h2 class="retroc-modal-title">${title}</h2>
          <button class="retroc-modal-close" type="button" id="retroc-modal-close-btn">✕ CERRAR</button>
        </div>
        <div class="retroc-modal-body">
          ${contentHTML}
        </div>
      </div>
    `;
    const closeBtn = overlay.querySelector("#retroc-modal-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.hidden = true;
      });
    }
    return overlay;
  }

  function openHistoryModal(onReplayCallback) {
    const stats = RetrocHistoryManager.getStats();
    const history = RetrocHistoryManager.getHistory();

    let listHTML = "";
    if (history.length === 0) {
      listHTML = `
        <div class="retroc-empty-state">
          <span>🎮</span>
          No has jugado ningún torneo todavía.<br>¡Entrá a la cancha, superá a los rivales y construí tu leyenda!
        </div>
      `;
    } else {
      listHTML = `
        <div class="retroc-history-list">
          ${history.map((h, index) => `
            <div class="retroc-history-item ${h.champion ? "champion" : ""}">
              <div class="retroc-history-item-info">
                <div class="retroc-history-item-title">
                  ${h.champion ? "🏆 ¡CAMPEÓN DEL MUNDO!" : `💥 Eliminado en R${h.round}`}
                </div>
                <div class="retroc-history-item-meta">
                  <span class="retroc-history-item-badge tier-${h.highestTier ? h.highestTier.toLowerCase() : "bronce"}">
                    Tier ${h.highestTier || "Ninguno"}
                  </span>
                  <span>Score: <strong>${h.finalScore || h.basePoints || 0} PTS</strong></span>
                  <span>Ronda: ${h.round}/15</span>
                  <span>${h.date}</span>
                </div>
              </div>
              ${index === 0 ? `
                <button class="retroc-replay-btn" type="button" data-replay-btn>
                  🔄 Revancha
                </button>
              ` : ""}
            </div>
          `).join("")}
        </div>
      `;
    }

    const contentHTML = `
      <div class="retroc-stats-grid">
        <div class="retroc-stat-card">
          <span>Mejor Score</span>
          <strong>${stats.bestScore}</strong>
        </div>
        <div class="retroc-stat-card">
          <span>Torneos</span>
          <strong>${stats.totalPlayed}</strong>
        </div>
        <div class="retroc-stat-card">
          <span>Títulos</span>
          <strong>${stats.championships}</strong>
        </div>
      </div>
      <h3 style="margin: 10px 0 0; color: rgba(255,255,255,0.6); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
        Historial Personal de Torneos
      </h3>
      ${listHTML}
    `;

    const overlay = showRetrocModal("📜 Historial de Torneos", contentHTML);

    overlay.querySelectorAll("[data-replay-btn]").forEach(btn => {
      btn.addEventListener("click", () => {
        overlay.hidden = true;
        if (typeof onReplayCallback === "function") {
          onReplayCallback();
        } else if (window.RetroCancha && window.RetroCancha.start) {
          const mountEl = document.getElementById("fm-game-mount") || document.getElementById("app");
          if (mountEl) {
            window.RetroCancha.start({ mount: mountEl, mode: "tournament" });
          }
        } else {
          window.location.reload();
        }
      });
    });
  }

  function openLeaderboardModal() {
    const list = RetrocLeaderboardManager.getLocalLeaderboard();
    const myWallet = window.STATE && window.STATE.tonWallet ? window.STATE.tonWallet : "Jugador Local";

    let tableHTML = "";
    if (list.length === 0) {
      tableHTML = `
        <div class="retroc-empty-state">
          <span>🏆</span>
          La tabla de posiciones está vacía.<br>¡Jugá un partido o torneo para liderar el ranking!
        </div>
      `;
    } else {
      tableHTML = `
        <div style="overflow-x: auto;">
          <table class="retroc-leaderboard-table" style="font-size: 0.85rem; min-width: 500px;">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Billetera (Player)</th>
                <th>NFT Activo</th>
                <th>Puntaje</th>
                <th>Recompensa Otorgada</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((item, i) => {
                const pos = i + 1;
                let gift = "🎟️ Pase Entreno";
                let giftClass = "ticket";
                if(pos === 1) { gift = "🥇 1 Exclusivo + Gemas"; giftClass = "nft"; }
                else if(pos === 2) { gift = "🥈 2 NFTs + Gemas"; giftClass = "nft"; }
                else if(pos === 3) { gift = "🥉 20% Gemas Pozo"; giftClass = "gems"; }
                else if(pos <= 10) { gift = "👟 NFT Zapatillas Elite"; giftClass = "boots"; }
                else if(pos <= 30) { gift = "🎽 NFT Uniforme Retro"; giftClass = "kits"; }
                else if(pos <= 60) { gift = "👨‍ NFT Entrenador"; giftClass = "coach"; }

                return `
                  <tr class="${item.player.includes(myWallet.slice(0,6)) || item.player === "Jugador Local" ? "current-user" : ""}">
                    <td style="font-weight: 950; font-size: 1rem;">#${pos}</td>
                    <td style="font-family: monospace;">${item.player}</td>
                    <td><strong style="color: #42aaff;">${item.nft || "Boca Exclusivo #8"}</strong></td>
                    <td style="font-weight: 950; color: #39ff88; font-size: 1rem;">${item.score} PTS</td>
                    <td><span class="retroc-reward-tag ${giftClass}" style="font-size:0.75rem; padding: 2px 6px;">${gift}</span></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    const rankInfo = window.STATE && window.STATE.tournamentRank ? `
      <div style="background: rgba(57, 255, 136, 0.15); border: 1px solid #39ff88; padding: 12px 16px; border-radius: 10px; margin-bottom: 14px; color: #39ff88; font-weight: bold; display: flex; justify-content: space-between;">
        <span>🏆 Rango Mundial Futmundi: <strong>#${window.STATE.tournamentRank}</strong></span>
        <span>Mejor: <strong>${window.STATE.tournamentBest} PTS</strong></span>
      </div>
    ` : "";

    const megaInfo = RetrocPrizePoolManager.getPlayersCount() > 250 ? `
      <div class="retroc-mega-alert" style="margin-bottom: 12px;">
        🚀 ¡TORNEO CON >250 INSCRITOS! RECOMPENSAS NFTS ACTIVAS HASTA EL TOP 100 🎁
      </div>
    ` : "";

    const contentHTML = `
      ${rankInfo}
      ${megaInfo}
      <h3 style="margin: 0 0 10px; color: rgba(255,255,255,0.6); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
        Leaderboard Top 100 (Global / Local)
      </h3>
      ${tableHTML}
    `;

    showRetrocModal("🏆 Leaderboard Oficial Top 100", contentHTML);
  }
  const RetrocPrizePoolManager = {
    getKey() { return "retroCancha03:activePlayers"; },
    getPlayersCount() {
      try {
        const val = localStorage.getItem(this.getKey());
        return val !== null ? parseInt(val, 10) : 30; // 30 por defecto
      } catch {
        return 30;
      }
    },
    setPlayersCount(count) {
      try {
        localStorage.setItem(this.getKey(), count);
      } catch {}
    },
    addSimulatedPlayer() {
      const curr = this.getPlayersCount() + 1;
      this.setPlayersCount(curr);
      return curr;
    },
    getCalculations() {
      const players = this.getPlayersCount();
      const costPerPlayer = 10; // $10 USD
      const grossUSD = players * costPerPlayer;
      const poolPercentage = 0.30; // 30%
      const netPoolUSD = Math.round(grossUSD * poolPercentage);
      const gemsPerUSD = 10; // 1 USD = 10 Gemas
      const totalGems = netPoolUSD * gemsPerUSD;
      
      // Distribucion
      const p1Gems = Math.round(totalGems * 0.50);
      const p2Gems = Math.round(totalGems * 0.30);
      const p3Gems = Math.round(totalGems * 0.20);
      
      return { players, costPerPlayer, grossUSD, poolPercentage, netPoolUSD, totalGems, p1Gems, p2Gems, p3Gems };
    }
  };

  function openPrizePoolModal() {
    const calc = RetrocPrizePoolManager.getCalculations();
    
    const html = `
      <div class="retroc-prize-formula-box">
        <span class="retroc-formula-title">📐 Formula de Bolsa de Premios (En Vivo)</span>
        <div class="retroc-formula-calc">
          <div class="retroc-formula-step">
            <small>Inscritos</small>
            <strong id="form-players">${calc.players} NFTs</strong>
          </div>
          <div class="retroc-formula-operator">×</div>
          <div class="retroc-formula-step">
            <small>Aporte</small>
            <strong>$10</strong>
          </div>
          <div class="retroc-formula-operator">=</div>
          <div class="retroc-formula-step">
            <small>Total Bruto</small>
            <strong id="form-gross">${calc.grossUSD}</strong>
          </div>
          <div class="retroc-formula-operator">→</div>
          <div class="retroc-formula-step">
            <small>Pozo (30%)</small>
            <strong class="result" id="form-gems">${calc.totalGems} Gemas</strong>
          </div>
        </div>
      </div>
      
      <h3 style="margin: 0 0 10px; color: rgba(255,255,255,0.6); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
        Reparticion Oficial de Premios
      </h3>
      <div class="retroc-prizes-list">
        <div class="retroc-prize-card gold">
          <div class="retroc-prize-rank">1º</div>
          <div class="retroc-prize-details">
            <div class="retroc-prize-title">🏆 Campeón del Torneo</div>
            <div class="retroc-prize-rewards">
              <span class="retroc-reward-tag nft">💎 1 NFT Exclusivo (1er Puesto)</span>
              <span class="retroc-reward-tag gems" id="p1-gems-tag">💎 ${calc.p1Gems} Gemas (50%)</span>
            </div>
          </div>
        </div>
        
        <div class="retroc-prize-card silver">
          <div class="retroc-prize-rank">2º</div>
          <div class="retroc-prize-details">
            <div class="retroc-prize-title">🥈 Subcampeón</div>
            <div class="retroc-prize-rewards">
              <span class="retroc-reward-tag nft">💎 2 NFTs Secundarios</span>
              <span class="retroc-reward-tag gems" id="p2-gems-tag">💎 ${calc.p2Gems} Gemas (30%)</span>
            </div>
          </div>
        </div>
        
        <div class="retroc-prize-card bronze">
          <div class="retroc-prize-rank">3º</div>
          <div class="retroc-prize-details">
            <div class="retroc-prize-title">🥉 Tercer Puesto</div>
            <div class="retroc-prize-rewards">
              <span class="retroc-reward-tag gems" id="p3-gems-tag">💎 ${calc.p3Gems} Gemas (20%)</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="retroc-sim-action">
        <button class="retroc-sim-btn" type="button" id="sim-new-player-btn">
          👥 Simular Nuevo Inscrito (+1)
        </button>
      </div>
    `;
    
    const overlay = showRetrocModal("💎 Bolsa de Premios Dinámica", html);
    
    const simBtn = overlay.querySelector("#sim-new-player-btn");
    if (simBtn) {
      simBtn.addEventListener("click", () => {
        RetrocPrizePoolManager.addSimulatedPlayer();
        const nextCalc = RetrocPrizePoolManager.getCalculations();
        
        const fPlayers = overlay.querySelector("#form-players");
        if(fPlayers) fPlayers.textContent = `${nextCalc.players} NFTs`;
        const fGross = overlay.querySelector("#form-gross");
        if(fGross) fGross.textContent = `${nextCalc.grossUSD}`;
        const fGems = overlay.querySelector("#form-gems");
        if(fGems) fGems.textContent = `${nextCalc.totalGems} Gemas`;
        
        const p1Tag = overlay.querySelector("#p1-gems-tag");
        if(p1Tag) p1Tag.textContent = `💎 ${nextCalc.p1Gems} Gemas (50%)`;
        const p2Tag = overlay.querySelector("#p2-gems-tag");
        if(p2Tag) p2Tag.textContent = `💎 ${nextCalc.p2Gems} Gemas (30%)`;
        const p3Tag = overlay.querySelector("#p3-gems-tag");
        if(p3Tag) p3Tag.textContent = `💎 ${nextCalc.p3Gems} Gemas (20%)`;
        
        updatePrizeBanner();
      });
    }
  }

  function updatePrizeBanner() {
    const bannerGems = document.querySelector("[data-prize-gems]");
    const bannerMeta = document.querySelector("[data-prize-meta]");
    if (bannerGems && bannerMeta) {
      const calc = RetrocPrizePoolManager.getCalculations();
      bannerGems.textContent = `${calc.totalGems} GEMAS`;
      bannerMeta.textContent = `${calc.players} Inscritos · ${calc.netPoolUSD} USD (30% Pozo)`;
    }
  }

  class J {
    constructor({ mount: t, sdk: e, tweaks: s, assets: a, mode: i }) {
      ((this.mountNode = t),
        (this.sdk = e),
        (this.tweaks = s),
        (this.assets = a),
        (this.mode = i),
        (this.onMatchEnd = null),
        (this.config = { ...G }),
        (this.unsubscribers = []),
        (this.images = {}),
        (this.frames = new Map()),
        (this.assetsReady = !1),
        (this.assetError = ""),
        (this.started = !1),
        (this.ended = !1),
        (this.submitted = !1),
        (this.running = !1),
        (this.lastTime = 0),
        (this.raf = 0),
        (this.dpr = 1),
        (this.size = { w: 1, h: 1 }),
        (this.layout = null),
        (this.grassPattern = null),
        (this.audioHandle = null),
        (this.audioContext = null),
        (this.bestPoints = 0),
        (this.pointerStickId = null),
        (this.stickVector = { x: 0, y: 0, active: !1 }),
        (this.keys = new Set()),
        (this.p2Keys = new Set()),
        (this.shotDown = !1),
        (this.p2ShotDown = !1),
        (this.shotCharge = 0),
        (this.p2ShotCharge = 0),
        (this.shake = 0),
        (this.flash = null),
        (this.particles = []),
        (this.message = { text: "", time: 0 }),
        (this.goalPause = 0),
        (this.nextKickoffTeam = "blue"),
        (this.tournament = {
          round: 0,
          wins: 0,
          results: [],
          champion: !1,
          eliminated: !1,
          currentOpponent: null,
        }),
        (this.state = this.createInitialState()));
    }
    startTournament() {
      ((this.tournament.round = 0),
        (this.tournament.wins = 0),
        (this.tournament.results = []),
        (this.tournament.champion = !1),
        (this.tournament.eliminated = !1),
        (this.tournament.currentOpponent = T[0]),
        (this.tournament.tierBonus = 0),
        this.applyTournamentOpponent());
    }
    applyTournamentOpponent() {
      const t = this.tournament.currentOpponent;
      t &&
        ((this.config.aiAggression = t.aiAggression),
        (this.config.matchLength = t.matchLength));
    }
    advanceTournament(t) {
      const e = this.tournament.currentOpponent,
        s = (e == null ? void 0 : e.reward) || 0;
      if (
        (this.tournament.results.push({
          round: this.tournament.round + 1,
          opponent: e.name,
          tier: e.tier,
          won: t,
          score: `${this.state.blueGoals}-${this.state.redGoals}`,
          reward: t ? s : 0,
        }),
        !t)
      ) {
        ((this.tournament.eliminated = !0),
          (this.tournament.highestTier = this._highestTierCompleted()),
          (this.tournament.multiplier = this._tierMultiplier(
            this.tournament.highestTier,
          )),
          (this.tournament.finalScore = Math.round(
            (this.state.points || 0) * this.tournament.multiplier,
          )));
        return;
      }
      ((this.state.points += s), (this.tournament.wins += 1));
      const a = this._checkTierCompletion(this.tournament.round + 1);
      if (a) {
        const n = this._tierBonusAmount(a);
        ((this.state.points += n),
          (this.tournament.tierBonus = (this.tournament.tierBonus || 0) + n));
      }
      const i = this.tournament.round + 1;
      if (i >= T.length) {
        this.tournament.champion = !0;
        const n = 5e3;
        ((this.state.points += n),
          (this.tournament.championBonus = n),
          (this.tournament.highestTier = "Leyenda"),
          (this.tournament.multiplier = this._tierMultiplier("Leyenda")),
          (this.tournament.finalScore = Math.round(
            (this.state.points || 0) * this.tournament.multiplier,
          )));
        return;
      }
      ((this.tournament.round = i),
        (this.tournament.currentOpponent = T[i]),
        this.applyTournamentOpponent());
    }
    _highestTierCompleted() {
      const t = this.tournament.wins || 0;
      return t >= 15
        ? "Leyenda"
        : t >= 13
          ? "Oro"
          : t >= 10
            ? "Plata"
            : t >= 5
              ? "Bronce"
              : "Ninguno";
    }
    _tierMultiplier(t) {
      return t === "Leyenda"
        ? 3
        : t === "Oro"
          ? 2
          : t === "Plata"
            ? 1.5
            : t === "Bronce"
              ? 1
              : 0.5;
    }
    _checkTierCompletion(t) {
      return t === 5
        ? "Bronce"
        : t === 10
          ? "Plata"
          : t === 13
            ? "Oro"
            : t === 15
              ? "Leyenda"
              : null;
    }
    _tierBonusAmount(t) {
      return t === "Bronce"
        ? 1e3
        : t === "Plata"
          ? 2500
          : t === "Oro"
            ? 5e3
            : t === "Leyenda"
              ? 1e4
              : 0;
    }
    mount() {
      ((this.root = document.createElement("section")),
        (this.root.className = "soccer-root"),
        this.mode === "pvp" && this.root.classList.add("mode-pvp"),
        this.mode === "tournament" &&
          this.root.classList.add("mode-tournament"),
        (this.root.innerHTML = `
      <div class="soccer-stage">
        <canvas class="game-surface" aria-label="Retro Cancha 03"></canvas>
        <div class="hud" aria-live="polite">
          <div class="hud-badge hud-blue"><span>${this.mode === "pvp" ? "P1" : "BLUE"}</span><strong data-blue>0</strong></div>
          <div class="hud-badge hud-time"><span>TIME</span><strong data-time>1:30</strong></div>
          <div class="hud-badge hud-red"><span>${this.mode === "pvp" ? "P2" : "RED"}</span><strong data-red>0</strong></div>
        </div>
        <div class="hud-extra-buttons">
          ${this.mode === "tournament" ? `<button class="hud-action-btn" type="button" data-bracket-btn title="Tabla de Posiciones del Torneo">🏆 Bracket</button>` : ""}
          <button class="hud-action-btn" type="button" data-prize-btn title="Bolsa de Premios en Gemas">💎 Premios</button>
          <button class="hud-action-btn" type="button" data-leaderboard-btn title="Leaderboard Mundial">🏆 Rank</button>
          <button class="hud-action-btn" type="button" data-history-btn title="Historial Personal">📜 Hist</button>
        </div>
        <div class="points-badge"><span>PTS</span><strong data-points>0</strong><small data-best>BEST 0</small></div>
        <div class="touch-controls" aria-hidden="false">
          <div class="stick-zone" data-stick><div class="stick-arrow"></div><div class="stick-knob" data-stick-knob></div></div>
          <div class="action-cluster">
            <button class="action-btn pass-btn" type="button" data-pass>PASS</button>
            <button class="action-btn shot-btn" type="button" data-shot><span>SHOT</span><i data-shot-fill></i></button>
          </div>
        </div>
        <div class="overlay-extra-cluster" data-overlay-cluster hidden>
          <div class="overlay-extra-grid">
            <button class="overlay-action-btn primary" type="button" data-overlay-next hidden>⚽ Siguiente Partido ➡️</button>
            <button class="overlay-action-btn" type="button" data-overlay-replay>🔄 Revancha</button>
            <button class="overlay-action-btn" type="button" data-overlay-history>📜 Ver Historial</button>
            <button class="overlay-action-btn" type="button" data-overlay-leaderboard style="grid-column: span 2;">🏆 Tabla de Posiciones</button>
          </div>
        </div>
        <button class="start-overlay" type="button" data-overlay>
          <span class="overlay-kicker" data-overlay-kicker>Cargando cancha...</span>
          <strong data-overlay-title>Retro Cancha 03</strong>
          <span data-overlay-copy>Preparando jugadores</span>
        </button>
      </div>
    `),
        (this.stage = this.root.querySelector(".soccer-stage")),
        (this.canvas = this.root.querySelector("canvas")),
        (this.ctx = this.canvas.getContext("2d", {
          alpha: !1,
          desynchronized: !0,
        })),
        (this.hud = {
          blue: this.root.querySelector("[data-blue]"),
          red: this.root.querySelector("[data-red]"),
          time: this.root.querySelector("[data-time]"),
          points: this.root.querySelector("[data-points]"),
          best: this.root.querySelector("[data-best]"),
          overlay: this.root.querySelector("[data-overlay]"),
          overlayKicker: this.root.querySelector("[data-overlay-kicker]"),
          overlayTitle: this.root.querySelector("[data-overlay-title]"),
          overlayCopy: this.root.querySelector("[data-overlay-copy]"),
          stick: this.root.querySelector("[data-stick]"),
          stickKnob: this.root.querySelector("[data-stick-knob]"),
          pass: this.root.querySelector("[data-pass]"),
          shot: this.root.querySelector("[data-shot]"),
          shotFill: this.root.querySelector("[data-shot-fill]"),
          bracketBtn: this.root.querySelector("[data-bracket-btn]"),
          leaderboardBtn: this.root.querySelector("[data-leaderboard-btn]"),
          historyBtn: this.root.querySelector("[data-history-btn]"),
          overlayCluster: this.root.querySelector("[data-overlay-cluster]"),
          overlayNext: this.root.querySelector("[data-overlay-next]"),
          overlayReplay: this.root.querySelector("[data-overlay-replay]"),
          overlayHistory: this.root.querySelector("[data-overlay-history]"),
          overlayLeaderboard: this.root.querySelector("[data-overlay-leaderboard]"),
          prizeBtn: this.root.querySelector("[data-prize-btn]"),
        }),
        this.mountNode.replaceChildren(this.root),
        this.installTweaks(),
        this.installInput(),
        this.loadBestScore(),
        this.mode === "tournament" && this.startTournament(),
        this.preloadAssets(),
        (this.resizeObserver = new ResizeObserver(() => this.resize())),
        this.resizeObserver.observe(this.stage),
        this.resize(),
        (this.running = !0),
        (this.lastTime = performance.now()),
        (this.raf = requestAnimationFrame((t) => this.tick(t))));
    }
    destroy() {
      var t, e, s;
      ((this.running = !1),
        cancelAnimationFrame(this.raf),
        (t = this.resizeObserver) == null || t.disconnect(),
        this.unsubscribers.forEach((a) => (a == null ? void 0 : a())),
        (s = (e = this.audioHandle) == null ? void 0 : e.dispose) == null ||
          s.call(e),
        window.removeEventListener("keydown", this.onKeyDown),
        window.removeEventListener("keyup", this.onKeyUp),
        this.mountNode.replaceChildren());
    }
    installTweaks() {
      var t, e, s, a;
      for (const i of Object.keys(G)) {
        const n =
          (e = (t = this.tweaks) == null ? void 0 : t.get) == null
            ? void 0
            : e.call(t, i);
        typeof n == "number" && Number.isFinite(n) && (this.config[i] = n);
        const r =
          (a = (s = this.tweaks) == null ? void 0 : s.subscribe) == null
            ? void 0
            : a.call(s, i, (h) => {
                typeof h == "number" &&
                  Number.isFinite(h) &&
                  (this.config[i] = h);
              });
        r && this.unsubscribers.push(r);
      }
    }
    installInput() {
      (this.hud.overlay.addEventListener("click", async () => {
        var i;
        if (
          !(!this.assetsReady || this.assetError) &&
          (await this.unlockAudio(),
          this.ended && this.handleOverlayClick(),
          !this.started)
        ) {
          ((this.started = !0),
            (this.ended = !1),
            (this.hud.overlay.hidden = !0));
          const n =
            this.mode === "pvp"
              ? "¡A jugar!"
              : this.mode === "tournament"
                ? `Rival: ${((i = this.tournament.currentOpponent) == null ? void 0 : i.name) || "?"}`
                : "¡A jugar!";
          this.flashMessage(n, 1.1);
        }
      }),
        this.hud.stick.addEventListener("pointerdown", (i) => {
          ((this.pointerStickId = i.pointerId),
            this.hud.stick.setPointerCapture(i.pointerId),
            this.updateStick(i));
        }),
        this.hud.stick.addEventListener("pointermove", (i) => {
          i.pointerId === this.pointerStickId && this.updateStick(i);
        }));
      const t = (i) => {
        i.pointerId === this.pointerStickId &&
          ((this.pointerStickId = null),
          (this.stickVector = { x: 0, y: 0, active: !1 }),
          (this.hud.stickKnob.style.transform = "translate(-50%, -50%)"));
      };
      (this.hud.stick.addEventListener("pointerup", t),
        this.hud.stick.addEventListener("pointercancel", t),
        this.hud.pass.addEventListener("pointerdown", (i) => {
          (i.preventDefault(), this.passOrSwitch("blue"));
        }),
        this.hud.shot.addEventListener("pointerdown", (i) => {
          (i.preventDefault(), this.startShotCharge("blue"));
        }));
      const e = (i) => {
        (i.preventDefault(), this.releaseShot("blue"));
      };
      (this.hud.shot.addEventListener("pointerup", e),
        this.hud.shot.addEventListener("pointercancel", e),
        this.hud.shot.addEventListener("pointerleave", e));

      if (this.hud.bracketBtn) {
        this.hud.bracketBtn.addEventListener("click", (e) => { e.stopPropagation(); this.openBracketModal(); });
      }
      if (this.hud.prizeBtn) {
        this.hud.prizeBtn.addEventListener("click", (e) => { e.stopPropagation(); openPrizePoolModal(); });
      }
      if (this.hud.leaderboardBtn) {
        this.hud.leaderboardBtn.addEventListener("click", (e) => { e.stopPropagation(); openLeaderboardModal(); });
      }
      if (this.hud.historyBtn) {
        this.hud.historyBtn.addEventListener("click", (e) => { e.stopPropagation(); openHistoryModal(() => { this.resetMatch(!1); ((this.started = !0), (this.ended = !1), (this.hud.overlay.hidden = !0)); if(this.hud.overlayCluster) this.hud.overlayCluster.hidden = !0; }); });
      }
      const s = ["w", "a", "s", "d"],
        a = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      ((this.onKeyDown = (i) => {
        const n = i.key,
          r = n.toLowerCase();
        if (
          ((s.includes(r) || a.includes(n)) &&
            (i.preventDefault(), this.keys.add(r)),
          n === " " &&
            !this.shotDown &&
            (i.preventDefault(), this.startShotCharge("blue")),
          r === "k" && (i.preventDefault(), this.passOrSwitch("blue")),
          n === "Enter" &&
            (!this.started || this.ended) &&
            this.hud.overlay.click(),
          this.mode === "pvp")
        ) {
          const h = n.toLowerCase(),
            l = {
              i: "p2-up",
              k: "p2-down",
              j: "p2-left",
              l: "p2-right",
              numpad8: "p2-up",
              numpad2: "p2-down",
              numpad4: "p2-left",
              numpad6: "p2-right",
            };
          ((l[h] || l[n]) &&
            (i.preventDefault(), this.p2Keys.add(l[h] || l[n])),
            (n === "Enter" || h === "m") &&
              !this.p2ShotDown &&
              (i.preventDefault(), this.startShotCharge("red")),
            h === "h" && (i.preventDefault(), this.passOrSwitch("red")));
        }
      }),
        (this.onKeyUp = (i) => {
          const n = i.key.toLowerCase();
          if (
            (this.keys.delete(n),
            i.key === " " && (i.preventDefault(), this.releaseShot("blue")),
            this.mode === "pvp")
          ) {
            const r = {
                i: "p2-up",
                k: "p2-down",
                j: "p2-left",
                l: "p2-right",
                numpad8: "p2-up",
                numpad2: "p2-down",
                numpad4: "p2-left",
                numpad6: "p2-right",
              },
              h = r[n] || r[i.key];
            (h && this.p2Keys.delete(h),
              (i.key === "Enter" || n === "m") && this.releaseShot("red"));
          }
        }),
        window.addEventListener("keydown", this.onKeyDown),
        window.addEventListener("keyup", this.onKeyUp));
    }
    async preloadAssets() {
      try {
        const t = (h) => {
            var u, b, p, w;
            const l =
              (b = (u = this.assets) == null ? void 0 : u.getImage) == null
                ? void 0
                : b.call(u, h);
            if (l) return l;
            const c =
              ((w = (p = this.assets) == null ? void 0 : p.get) == null
                ? void 0
                : w.call(p, h)) || D[h];
            return X(c);
          },
          e = async (h) => {
            var u, b;
            const l =
                ((b = (u = this.assets) == null ? void 0 : u.get) == null
                  ? void 0
                  : b.call(u, h)) || D[h],
              c = await fetch(l);
            if (!c.ok) throw new Error(`Failed to load ${h}: ${c.status}`);
            return c.json();
          },
          [s, a, i, n, r] = await Promise.all([
            t("STADIUM_BACKDROP"),
            t("GRASS_TEXTURE"),
            t("PLAYER_ATLAS"),
            t("GOAL_NET"),
            e("PLAYER_ATLAS_FRAMES"),
          ]);
        ((this.images = { backdrop: s, grass: a, atlas: i, goal: n }),
          (this.frames = new Map(r.frames.map((h) => [h.name, h]))),
          (this.assetsReady = !0),
          (this.grassPattern = this.ctx.createPattern(a, "repeat")),
          this.resetMatch(!1),
          this.updateOverlayReady());
      } catch (err) {
        console.warn("[RetroCancha] Error cargando imagenes externas, generando lienzos Auto-Fallback en RAM para arranque 100% garantizado:", err);
        
        // 1. Fondo Estadio
        const canvS = document.createElement("canvas");
        canvS.width = 1920; canvS.height = 1080;
        const ctxS = canvS.getContext("2d");
        const grad = ctxS.createRadialGradient(960, 540, 100, 960, 540, 1000);
        grad.addColorStop(0, "#16281b"); grad.addColorStop(1, "#050b07");
        ctxS.fillStyle = grad; ctxS.fillRect(0, 0, 1920, 1080);
        
        // 2. Pasto
        const canvA = document.createElement("canvas");
        canvA.width = 256; canvA.height = 256;
        const ctxA = canvA.getContext("2d");
        ctxA.fillStyle = "#1e732d"; ctxA.fillRect(0, 0, 256, 256);
        ctxA.fillStyle = "#186025";
        for(let j=0; j<60; j++) ctxA.fillRect(Math.random()*256, Math.random()*256, 4, 8);

        // 3. Red Arco Gigante de Neon
        const canvN = document.createElement("canvas");
        canvN.width = 256; canvN.height = 128;
        const ctxN = canvN.getContext("2d");
        ctxN.fillStyle = "rgba(255, 255, 255, 0.28)"; ctxN.fillRect(10, 10, 236, 110);
        ctxN.strokeStyle = "#ffe871"; ctxN.lineWidth = 8;
        ctxN.beginPath(); ctxN.moveTo(10, 120); ctxN.lineTo(10, 10); ctxN.lineTo(246, 10); ctxN.lineTo(246, 120); ctxN.stroke();
        ctxN.strokeStyle = "#ffffff"; ctxN.lineWidth = 4;
        ctxN.beginPath(); ctxN.moveTo(10, 120); ctxN.lineTo(10, 10); ctxN.lineTo(246, 10); ctxN.lineTo(246, 120); ctxN.stroke();

        // 4. Atlas Sprites
        const canvI = document.createElement("canvas");
        canvI.width = 1024; canvI.height = 512;
        const ctxI = canvI.getContext("2d");
        ctxI.clearRect(0, 0, 1024, 512);
        
        function drawFallbackPlayer(ctx, x, y, col, isKeeper) {
          ctx.save(); ctx.translate(x, y);
          ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(16, 28, 10, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = col; ctx.fillRect(6, 10, 20, 16);
          ctx.fillStyle = isKeeper ? "#000" : "#fff"; ctx.fillRect(2, 10, 4, 8); ctx.fillRect(26, 10, 4, 8);
          ctx.fillStyle = "#f1c27d"; ctx.beginPath(); ctx.arc(16, 8, 7, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = isKeeper ? "#ff4545" : "#f1c27d"; ctx.beginPath(); ctx.arc(3, 18, 3, 0, Math.PI*2); ctx.arc(29, 18, 3, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
        drawFallbackPlayer(ctxI, 0, 0, "#1e63d6", false); 
        drawFallbackPlayer(ctxI, 64, 0, "#2a75f3", false); 
        drawFallbackPlayer(ctxI, 128, 0, "#e04545", false); 
        drawFallbackPlayer(ctxI, 192, 0, "#f5a04a", true); 
        drawFallbackPlayer(ctxI, 256, 0, "#48c774", true); 
        
        // Ball gigante y brillante
        ctxI.save(); ctxI.translate(320, 0); 
        ctxI.shadowBlur = 12; ctxI.shadowColor = "#ffffff";
        ctxI.fillStyle = "#ffffff"; ctxI.beginPath(); ctxI.arc(16, 16, 14, 0, Math.PI*2); ctxI.fill(); 
        ctxI.shadowBlur = 0;
        ctxI.fillStyle = "#000000"; ctxI.beginPath(); ctxI.arc(16, 16, 5, 0, Math.PI*2); ctxI.fill(); 
        ctxI.fillRect(7, 10, 4, 5); ctxI.fillRect(21, 10, 4, 5); ctxI.fillRect(12, 23, 8, 4);
        ctxI.restore();

        // Spark
        ctxI.save(); ctxI.translate(384, 0); ctxI.fillStyle = "#ffe871"; ctxI.beginPath(); ctxI.arc(16, 16, 8, 0, Math.PI*2); ctxI.fill(); ctxI.restore();

        const fakeFrames = [
          { name: "blue_attacker", source: { x: 0, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 28 } },
          { name: "blue_teammate", source: { x: 64, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 28 } },
          { name: "red_defender", source: { x: 128, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 28 } },
          { name: "red_keeper", source: { x: 192, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 28 } },
          { name: "blue_keeper", source: { x: 256, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 28 } },
          { name: "soccer_ball", source: { x: 320, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 16 } },
          { name: "boot_spark", source: { x: 384, y: 0, w: 32, h: 32 }, anchor: { x: 16, y: 16 } }
        ];

        this.images = { backdrop: canvS, grass: canvA, atlas: canvI, goal: canvN };
        this.frames = new Map(fakeFrames.map(h => [h.name, h]));
        this.assetsReady = true;
        this.grassPattern = this.ctx.createPattern(canvA, "repeat");
        
        // Desbloqueamos e iniciamos de forma garantizada
        this.resetMatch(!1);
        this.updateOverlayReady();
      }
    }
    async loadBestScore() {
      var t, e, s;
      try {
        const a = await ((s =
          (e = (t = this.sdk) == null ? void 0 : t.gameState) == null
            ? void 0
            : e.load) == null
          ? void 0
          : s.call(e));
        ((a == null ? void 0 : a.version) === I &&
          Number.isFinite(a.bestPoints) &&
          (this.bestPoints = Math.max(0, a.bestPoints)),
          this.updateHud());
      } catch {
        this.bestPoints = 0;
      }
    }
    updateOverlayReady() {
      if (this.started) return;
      let t = "Mini partido 1vAI",
        e = "TOCA PARA JUGAR",
        s = "Joystick para moverte · PASS · SHOT";
      if (this.mode === "pvp")
        ((t = "Local 2 jugadores"),
          (e = "TOCA PARA JUGAR"),
          (s = "P1: WASD + Space · P2: IJKL + Enter"));
      else if (this.mode === "tournament") {
        t = `Torneo · Ronda ${this.tournament.round + 1}/4`;
        const a = this.tournament.currentOpponent;
        ((e = `vs ${(a == null ? void 0 : a.name) || "?"}`),
          (s = "Gana 4 partidos seguidos para ser campeón"));
      }
      ((this.hud.overlayKicker.textContent = t),
        (this.hud.overlayTitle.textContent = e),
        (this.hud.overlayCopy.textContent = s));
    }
    resize() {
      const t = this.stage.getBoundingClientRect(),
        e = Math.max(1, t.width),
        s = Math.max(1, t.height);
      ((this.dpr = Math.min(2, window.devicePixelRatio || 1)),
        (this.size = { w: e, h: s }),
        (this.canvas.width = Math.round(e * this.dpr)),
        (this.canvas.height = Math.round(s * this.dpr)),
        (this.canvas.style.width = `${e}px`),
        (this.canvas.style.height = `${s}px`),
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0),
        (this.layout = this.computeLayout(e, s)),
        this.images.grass &&
          (this.grassPattern = this.ctx.createPattern(
            this.images.grass,
            "repeat",
          )));
    }
    computeLayout(t, e) {
      const padX = Math.max(16, t * 0.08);
      const padY = Math.max(16, e * 0.12);
      const fieldW = t - padX * 2;
      const fieldH = e - padY * 2;
      return {
        cx: t / 2,
        cy: e / 2,
        left: padX,
        top: padY,
        fieldW: fieldW,
        fieldH: fieldH,
        meterX: fieldW / d,
        meterY: fieldH / y
      };
    }
    worldToScreen(t, e) {
      const a = this.layout;
      return {
        x: a.left + (e / d) * a.fieldW,
        y: a.top + (t / y) * a.fieldH,
        scale: (a.meterX + a.meterY) * 0.52,
        t: e / d
      };
    }
    screenShake() {
      if (this.shake <= 0) return { x: 0, y: 0 };
      const t = this.shake * this.config.effectsIntensity;
      return { x: (Math.random() - 0.5) * t, y: (Math.random() - 0.5) * t };
    }
    tick(t) {
      if (!this.running) return;
      const e = Math.min(0.05, (t - this.lastTime) / 1e3 || 0);
      this.lastTime = t;
      const s = e * this.config.gameSpeed;
      (this.assetsReady && this.started && !this.ended
        ? this.update(s, e)
        : this.assetsReady && !this.started && this.updateAttract(e),
        this.updateEffects(e),
        this.render(),
        this.updateHud(),
        (this.raf = requestAnimationFrame((a) => this.tick(a))));
    }
    createInitialState() {
      return {
        timeLeft: this.config.matchLength,
        blueGoals: 0,
        redGoals: 0,
        points: 0,
        activeBlue: 0,
        possessionCooldown: 0,
        lastBlueTouch: null,
        ball: { x: 34, y: 76, vx: 0, vy: 0, radius: 1.2, owner: null },
        blue: [],
        red: [],
      };
    }
    resetMatch(t = !0) {
      ((this.state = this.createInitialState()),
        (this.state.timeLeft = this.config.matchLength),
        (this.submitted = !1),
        (this.started = !t && this.started),
        (this.ended = !1),
        (this.goalPause = 0),
        this.setupKickoff("blue"),
        t &&
          ((this.started = !1),
          (this.hud.overlay.hidden = !1),
          this.updateOverlayReady()));
    }
    setupKickoff(t = "blue") {
      ((this.state.blue = [
        g("blue", "blue_attacker", 34, 76, 34, 30, 2.3),
        g("blue", "blue_teammate", 21, 83, 31, 29, 2.25),
      ]),
        this.mode === "pvp"
          ? (this.state.red = [
              g("red", "red_defender", 32, 50, 32, 30, 2.3, !1, !0),
              g("red", "red_defender", 18, 38, 30, 22, 2.25),
              g("red", "red_defender", 50, 38, 30, 22, 2.25),
              g("red", "red_keeper", 34, 7.5, 24, 22, 2.6, !0),
            ])
          : (this.state.red = [
              g("red", "red_defender", 25, 55, 30, 26, 2.25),
              g("red", "red_defender", 43, 58, 30, 26, 2.25),
              g("red", "red_defender", 34, 42, 31, 27, 2.25),
              g("red", "red_keeper", 34, 7.5, 24, 22, 2.6, !0),
            ]),
        (this.state.activeBlue = 0));
      const e = t === "red" ? this.state.red[0] : this.state.blue[0];
      ((e.dir = t === "red" ? { x: 0, y: 1 } : { x: 0, y: -1 }),
        (this.state.ball = {
          x: e.x,
          y: e.y - 2,
          vx: 0,
          vy: 0,
          radius: 1.2,
          owner: e,
        }),
        (this.state.lastBlueTouch = t === "blue" ? e : null),
        (this.state.possessionCooldown = 0.25));
    }
    updateAttract(t) {
      const e = performance.now() / 1e3;
      ((this.state.blue[0].x = 34 + Math.sin(e * 1.4) * 1.1),
        (this.state.blue[0].y = 76 + Math.cos(e * 1.1) * 0.7),
        (this.state.blue[0].dir = { x: 0.2, y: -1 }),
        (this.state.ball.owner = this.state.blue[0]),
        this.updateOwnedBall(),
        this.particles.forEach((s) => (s.life -= t)),
        (this.particles = this.particles.filter((s) => s.life > 0)));
    }
    update(t, e) {
      const s = this.state;
      if (((s.timeLeft = Math.max(0, s.timeLeft - e)), s.timeLeft <= 0)) {
        this.finishMatch();
        return;
      }
      if (this.goalPause > 0) {
        ((this.goalPause -= e),
          this.goalPause <= 0 && this.setupKickoff(this.nextKickoffTeam));
        return;
      }
      ((s.possessionCooldown = Math.max(0, s.possessionCooldown - t)),
        this.shotDown && (this.shotCharge = m(this.shotCharge + e * 1.4, 0, 1)),
        this.p2ShotDown &&
          (this.p2ShotCharge = m(this.p2ShotCharge + e * 1.4, 0, 1)),
        this.hud.shotFill &&
          (this.hud.shotFill.style.transform = `scaleY(${this.shotCharge})`),
        this.updatePlayerControl(t),
        this.updateBlueSupport(t),
        this.mode === "pvp"
          ? (this.updateRedPlayerControl(t), this.updateRedDefendersAI(t, 0.7))
          : this.updateRedAI(t),
        this.updateBall(t),
        this.handleTackles(),
        this.handleGoalChecks());
    }
    updatePlayerControl(t) {
      const e = this.state,
        s = e.blue[e.activeBlue],
        a = this.getP1MoveVector(),
        i = s.speed * 1.7 * (e.ball.owner === s ? 0.92 : 1);
      (P(s, a.x * i, a.y * i, t),
        (a.x || a.y) && (s.dir = f(a.x, a.y)),
        B(s, 3, y - 3, 14, d - 8));
    }
    updateRedPlayerControl(t) {
      const e = this.state,
        s = e.red.find((n) => n.p2Controlled);
      if (!s) return;
      const a = this.getP2MoveVector(),
        i = s.speed * 1.7 * (e.ball.owner === s ? 0.92 : 1);
      (P(s, a.x * i, a.y * i, t),
        (a.x || a.y) && (s.dir = f(a.x, a.y)),
        B(s, 3, y - 3, 8, d - 8));
    }
    updateBlueSupport(t) {
      var r;
      const e = this.state,
        s = e.blue[e.activeBlue],
        a = e.blue[1 - e.activeBlue];
      let i;
      ((r = e.ball.owner) == null ? void 0 : r.team) === "red" || !e.ball.owner
        ? (i = { x: e.ball.x + (a.x < e.ball.x ? -4 : 4), y: e.ball.y + 8 })
        : e.ball.owner === s
          ? (i = { x: s.x + (s.x < y / 2 ? 16 : -16), y: s.y - 18 })
          : (i = { x: 34, y: 68 });
      const n = f(i.x - a.x, i.y - a.y);
      (P(a, n.x * a.aiSpeed, n.y * a.aiSpeed, t),
        Math.abs(n.x) + Math.abs(n.y) > 0.01 && (a.dir = n),
        B(a, 3, y - 3, 12, d - 8));
    }
    updateRedAI(t) {
      this.updateRedDefendersAI(t, 1);
    }
    updateRedDefendersAI(t, e) {
      var b;
      const s = this.state,
        a = 1 + (1 - s.timeLeft / Math.max(1, this.config.matchLength)) * 0.35,
        i = this.config.aiAggression * a * e,
        n = s.ball.owner || s.ball,
        r = new Set(s.red.filter((p) => p.p2Controlled).map((p) => p));
      s.red
        .filter((p) => !p.keeper && !r.has(p))
        .sort((p, w) => M(p, n) - M(w, n))
        .forEach((p, w) => {
          var W;
          let L;
          ((W = s.ball.owner) == null ? void 0 : W.team) === "red" &&
          !s.ball.owner.p2Controlled
            ? (L =
                w === 0
                  ? { x: 34, y: d + 8 }
                  : {
                      x: s.ball.owner.x + (w === 1 ? -12 : 12),
                      y: s.ball.owner.y + 8,
                    })
            : w === 0
              ? (L = { x: n.x, y: n.y + 1.5 })
              : (L = {
                  x: m(n.x + (w === 1 ? -13 : 13), 9, 59),
                  y: m(n.y - 7 - w * 4, 18, 76),
                });
          const E = f(L.x - p.x, L.y - p.y);
          (P(p, E.x * p.aiSpeed * i, E.y * p.aiSpeed * i, t),
            Math.abs(E.x) + Math.abs(E.y) > 0.01 && (p.dir = E),
            B(p, 3, y - 3, 8, d - 7));
        });
      const l = s.red.find((p) => p.keeper),
        c = m(s.ball.x, v + 2, S - 2),
        u = f(c - l.x, 7.5 - l.y);
      (P(l, u.x * l.aiSpeed * 1.25, u.y * l.aiSpeed, t),
        (l.x = m(l.x, v - 1, S + 1)),
        (l.y = m(l.y, 5.8, 10.5)),
        (l.dir = { x: 0, y: 1 }),
        ((b = s.ball.owner) == null ? void 0 : b.team) === "red" &&
          !s.ball.owner.p2Controlled &&
          s.ball.owner.y > 88 &&
          Math.abs(s.ball.owner.x - 34) < 18 &&
          this.redShoot(s.ball.owner));
    }
    updateBall(t) {
      const e = this.state.ball;
      if (e.owner) {
        this.updateOwnedBall();
        return;
      }
      ((e.x += e.vx * t), (e.y += e.vy * t));
      const s = Math.pow(0.33, t);
      ((e.vx *= s), (e.vy *= s));
      const a = Math.hypot(e.vx, e.vy);
      (a < 2 && ((e.vx = 0), (e.vy = 0)),
        (e.x < 2 || e.x > y - 2) &&
          ((e.x = m(e.x, 2, y - 2)),
          (e.vx *= -0.55),
          this.spawnKickDust(e.x, e.y, 3)),
        e.y < 0.8 &&
          (e.x < v || e.x > S) &&
          ((e.y = 0.8), (e.vy *= -0.5), this.spawnKickDust(e.x, e.y, 3)),
        e.y > d - 0.8 &&
          (e.x < v || e.x > S) &&
          ((e.y = d - 0.8), (e.vy *= -0.5), this.spawnKickDust(e.x, e.y, 3)),
        this.tryCollectLooseBall(a),
        this.tryKeeperSave(a));
    }
    updateOwnedBall() {
      const t = this.state.ball,
        e = t.owner;
      e &&
        ((t.x = e.x + e.dir.x * 2.2),
        (t.y = e.y + e.dir.y * 2.2),
        (t.vx = e.vx),
        (t.vy = e.vy));
    }
    tryCollectLooseBall(t) {
      if (this.state.possessionCooldown > 0) return;
      const e = [...this.state.blue, ...this.state.red];
      let s = null,
        a = 1 / 0;
      for (const i of e) {
        const n = M(i, this.state.ball),
          r = i.keeper ? 3.6 : t > 48 ? 2.2 : 3.2;
        n < r && n < a && ((s = i), (a = n));
      }
      s && this.claimBall(s);
    }
    tryKeeperSave(t) {
      const e = this.state.red.find((s) => s.keeper);
      !e ||
        this.state.ball.owner ||
        (this.state.ball.y < 11 &&
          M(e, this.state.ball) < (t > 70 ? 2.4 : 3.5) &&
          (this.claimBall(e),
          this.flashMessage("¡Atajada!", 0.9),
          (this.shake = Math.max(this.shake, 3)),
          this.playBlip(120, 0.07, "square", 0.035)));
    }
    handleTackles() {
      const t = this.state.ball.owner;
      if (!(!t || this.state.possessionCooldown > 0))
        if (t.team === "blue") {
          const e = this.state.red.find(
            (s) => !s.keeper && M(s, t) < (s.radius + t.radius) * 0.75,
          );
          e &&
            (this.claimBall(e),
            (this.state.points = Math.max(0, this.state.points - 20)),
            this.flashMessage("Robo rojo", 0.8),
            this.spawnKickDust(t.x, t.y, 8),
            this.vibrate(20));
        } else {
          const e = this.state.blue.find(
            (s) => M(s, t) < (s.radius + t.radius) * 0.75,
          );
          e &&
            (this.claimBall(e),
            (this.state.activeBlue = this.state.blue.indexOf(e)),
            (this.state.points += this.mode === "pvp" ? 15 : 25),
            this.flashMessage("¡Recuperada!", 0.8),
            this.spawnKickDust(t.x, t.y, 8),
            this.vibrate(20));
        }
    }
    handleGoalChecks() {
      const t = this.state.ball;
      t.y <= 0.3 && t.x >= v && t.x <= S
        ? this.scoreGoal("blue")
        : t.y >= d - 0.3 && t.x >= v && t.x <= S && this.scoreGoal("red");
    }
    scoreGoal(t) {
      this.goalPause > 0 ||
        (t === "blue"
          ? ((this.state.blueGoals += 1),
            (this.state.points += 1e3 + Math.round(this.state.timeLeft * 5)),
            this.flashMessage("¡GOOOL!", 1.5, "blue"),
            this.playGoalSound(),
            this.vibrate([35, 40, 60]))
          : ((this.state.redGoals += 1),
            this.flashMessage("Gol rojo", 1.2, "red"),
            this.playBlip(90, 0.18, "sawtooth", 0.045),
            this.vibrate(50)),
        (this.nextKickoffTeam = t === "blue" ? "red" : "blue"),
        this.spawnGoalBurst(t),
        (this.shake = Math.max(this.shake, 10)),
        (this.goalPause = 1.4),
        (this.state.ball.owner = null),
        (this.state.ball.vx = 0),
        (this.state.ball.vy = 0));
    }
    claimBall(t) {
      ((this.state.ball.owner = t),
        (this.state.possessionCooldown = 0.18),
        t.team === "blue" &&
          ((this.state.activeBlue = this.state.blue.indexOf(t)),
          (this.state.lastBlueTouch = t)));
    }
    passOrSwitch(t) {
      if (!this.started || this.ended || this.goalPause > 0) return;
      const e = this.state.ball.owner;
      if (e)
        if (e.team === t) {
          if (t === "blue") {
            const s = this.state.blue.find((n) => n !== e) || e,
              a = { x: s.x + s.dir.x * 4, y: s.y + s.dir.y * 4 },
              i = f(a.x - e.x, a.y - e.y);
            ((this.state.ball.owner = null),
              (this.state.ball.x = e.x + i.x * 2.4),
              (this.state.ball.y = e.y + i.y * 2.4),
              (this.state.ball.vx = i.x * 60),
              (this.state.ball.vy = i.y * 60),
              (this.state.possessionCooldown = 0.08),
              (e.dir = i),
              (this.state.points += 12),
              this.spawnKickDust(e.x, e.y, 6),
              this.playBlip(420, 0.06, "triangle", 0.045));
          } else if (t === "red" && this.mode === "pvp") {
            const s = f(34 - e.x, d + 5 - e.y);
            ((this.state.ball.owner = null),
              (this.state.ball.x = e.x + s.x * 2.4),
              (this.state.ball.y = e.y + s.y * 2.4),
              (this.state.ball.vx = s.x * 55),
              (this.state.ball.vy = s.y * 55),
              (this.state.possessionCooldown = 0.1),
              (e.dir = s),
              this.playBlip(380, 0.06, "triangle", 0.04),
              this.flashMessage("¡Pase!", 0.5));
          }
        } else
          t === "blue" &&
            e.team === "red" &&
            ((this.state.activeBlue = 1 - this.state.activeBlue),
            this.flashMessage("Cambio", 0.45));
    }
    startShotCharge(t) {
      !this.started ||
        this.ended ||
        this.goalPause > 0 ||
        (t === "blue"
          ? ((this.shotDown = !0),
            (this.shotCharge = Math.max(this.shotCharge, 0.18)))
          : t === "red" &&
            this.mode === "pvp" &&
            ((this.p2ShotDown = !0),
            (this.p2ShotCharge = Math.max(this.p2ShotCharge, 0.18))));
    }
    releaseShot(t) {
      if (t === "blue") {
        if (!this.shotDown) return;
        this.shotDown = !1;
        const e = this.state.ball.owner;
        if (!e || e.team !== "blue" || this.ended || this.goalPause > 0) {
          ((this.shotCharge = 0),
            this.hud.shotFill &&
              (this.hud.shotFill.style.transform = "scaleY(0)"));
          return;
        }
        const s = this.getP1MoveVector(),
          a = f(34 - e.x, -5 - e.y),
          i = s.x || s.y ? f(s.x, s.y) : a,
          n = this.config.shotAssist,
          r = f(A(i.x, a.x, n), A(i.y, a.y, n)),
          h = 74 + this.shotCharge * 68;
        ((this.state.ball.owner = null),
          (this.state.ball.x = e.x + r.x * 2.5),
          (this.state.ball.y = e.y + r.y * 2.5),
          (this.state.ball.vx = r.x * h),
          (this.state.ball.vy = r.y * h),
          (this.state.possessionCooldown = 0.18),
          (e.dir = r),
          (this.state.points += Math.round(20 + this.shotCharge * 25)),
          this.spawnKickDust(e.x, e.y, 10 + Math.round(this.shotCharge * 8)),
          (this.shake = Math.max(this.shake, 3 + this.shotCharge * 3)),
          this.playBlip(190 + this.shotCharge * 220, 0.08, "square", 0.055),
          this.vibrate(18),
          (this.shotCharge = 0),
          this.hud.shotFill &&
            (this.hud.shotFill.style.transform = "scaleY(0)"));
      } else if (t === "red" && this.mode === "pvp") {
        if (!this.p2ShotDown) return;
        this.p2ShotDown = !1;
        const e = this.state.ball.owner;
        if (
          !e ||
          e.team !== "red" ||
          !e.p2Controlled ||
          this.ended ||
          this.goalPause > 0
        ) {
          this.p2ShotCharge = 0;
          return;
        }
        const s = this.getP2MoveVector(),
          a = f(34 - e.x, d + 8 - e.y),
          i = s.x || s.y ? f(s.x, s.y) : a,
          n = f(A(i.x, a.x, 0.4), A(i.y, a.y, 0.4)),
          r = 70 + this.p2ShotCharge * 65;
        ((this.state.ball.owner = null),
          (this.state.ball.x = e.x + n.x * 2.5),
          (this.state.ball.y = e.y + n.y * 2.5),
          (this.state.ball.vx = n.x * r),
          (this.state.ball.vy = n.y * r),
          (this.state.possessionCooldown = 0.18),
          (e.dir = n),
          this.spawnKickDust(e.x, e.y, 10 + Math.round(this.p2ShotCharge * 8)),
          (this.shake = Math.max(this.shake, 3 + this.p2ShotCharge * 3)),
          this.playBlip(220 + this.p2ShotCharge * 200, 0.08, "square", 0.05),
          (this.p2ShotCharge = 0));
      }
    }
    redShoot(t) {
      const e = f(34 - t.x, d + 5 - t.y);
      ((this.state.ball.owner = null),
        (this.state.ball.x = t.x + e.x * 2.5),
        (this.state.ball.y = t.y + e.y * 2.5),
        (this.state.ball.vx = e.x * 72),
        (this.state.ball.vy = e.y * 72),
        (this.state.possessionCooldown = 0.2),
        (t.dir = e),
        this.spawnKickDust(t.x, t.y, 8));
    }
    openBracketModal() {
      const T_local = [ ...this.tournament.results ];
      const currRound = this.tournament.round;
      let html = `
        <div style="background: rgba(255, 232, 113, 0.15); border: 2px solid #ffe871; padding: 12px 16px; border-radius: 10px; margin-bottom: 14px; color: #ffe871; font-weight: 900; display: flex; justify-content: space-between; font-size: 1.05rem;">
          <span>Ronda Actual: <strong>${currRound + 1} / 15</strong></span>
          <span>Tier Asegurado: <strong>${this.tournament.highestTier || this._highestTierCompleted()}</strong></span>
        </div>
        <h3 style="margin: 0 0 10px; color: rgba(255,255,255,0.6); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
          Progreso y Rival Actual
        </h3>
        <div class="retroc-bracket-container">
          <div class="retroc-bracket-round current">
            <div class="retroc-bracket-round-name">
              <span>⚽</span>
              <strong>${this.tournament.currentOpponent ? this.tournament.currentOpponent.name : "Torneo Completado"}</strong>
            </div>
            <div class="retroc-bracket-round-status">
              🔥 Partido Actual
            </div>
          </div>
        </div>
      `;
      showRetrocModal("🏆 Bracket del Torneo", html);
    }
    showNormalResult(s, a) {
      if (this.hud.overlayCluster) {
        this.hud.overlayCluster.hidden = !1;
        if(this.hud.overlayNext) this.hud.overlayNext.hidden = !0;
      }
    }
    finishMatch() {
      if (this.ended) return;
      ((this.ended = !0), (this.started = !1), (this.hud.overlay.hidden = !1));
      const t = this.state.blueGoals > this.state.redGoals,
        e = this.state.blueGoals === this.state.redGoals,
        s = t ? "Victoria" : e ? "Empate" : "Derrota",
        a = `${this.state.blueGoals}-${this.state.redGoals}`;
      let i = `${this.state.points} PTS`,
        n = "Toca para revancha";
      if (this.mode === "tournament") {
        (e ? this.advanceTournament(!0) : this.advanceTournament(t),
          this.persistAndSubmit(),
          this.showTournamentResult(s, a),
          this._emitMatchEnd(s, a));
        return;
      }
      ((this.hud.overlayKicker.textContent = `${s} ${a}`),
        (this.hud.overlayTitle.textContent = i),
        (this.hud.overlayCopy.textContent = n),
        this.persistAndSubmit(),
        this.showNormalResult(s, a),
        this._emitMatchEnd(s, a));
    }
    _emitMatchEnd(t, e) {
      var i;
      const s = this.tournament || {};
      
      const NOTIFY_EVERY_N_ROUNDS = 3;
      const rReached = (s.round || 0) + (t === "Victoria" || t === "Empate" ? 0 : 1);
      const isNotifyRound = (rReached > 0 && rReached % NOTIFY_EVERY_N_ROUNDS === 0) || !!s.champion || !!s.eliminated;

      const tempTier = this._highestTierCompleted();
      const tempMult = this._tierMultiplier(tempTier);
      const tempScore = Math.round((this.state.points || 0) * tempMult);

      if (this.mode === "tournament" && isNotifyRound && !s.champion && !s.eliminated) {
        this.flashMessage(`💾 Checkpoint R${rReached} guardado en nube`, 1.6);
      }

      const a = {
        mode: this.mode,
        result: t,
        score: e,
        points: this.state.points,
        finalScore: s.finalScore || tempScore || this.state.points || 0,
        blueGoals: this.state.blueGoals,
        redGoals: this.state.redGoals,
        tournament:
          this.mode === "tournament"
            ? {
                round: s.round || 0,
                wins: s.wins || 0,
                champion: !!s.champion,
                eliminated: !!s.eliminated,
                notifyBackend: isNotifyRound,
                checkpointRound: rReached,
                highestTier: s.highestTier || tempTier,
                multiplier: s.multiplier || tempMult,
                finalScore: s.finalScore || tempScore,
                basePoints: this.state.points || 0,
              }
            : null,
      };
      try {
        typeof this.onMatchEnd == "function" && this.onMatchEnd(a);
        const n =
          ((i = this.root) == null ? void 0 : i.parentElement) ||
          this.mountNode;
        (n == null ||
          n.dispatchEvent(
            new CustomEvent("retroc:matchend", { detail: a, bubbles: !0 }),
          ),
          window.dispatchEvent(
            new CustomEvent("retroc:matchend", { detail: a }),
          ));
      } catch (n) {
        console.error("[RetroCancha] emit error", n);
      }
    }
    showTournamentResult(t, e) {
      const s = this.tournament.currentOpponent,
        a = t === "Victoria" || t === "Empate",
        i = T.length,
        n = this.tournament.round + 1,
        r = [
          a
            ? this.tournament.champion
              ? "🏆 ¡CAMPEÓN MUNDIAL DE FUTMUNDI!"
              : `Victoria vs ${s == null ? void 0 : s.name} (Ronda ${this.tournament.wins}/${i})`
            : `Eliminado en Ronda ${this.tournament.wins + 1} por ${s == null ? void 0 : s.name}`,
        ];
      let h;
      if (this.tournament.champion) {
        const l = this.state.points || 0,
          c = this.tournament.multiplier || 3,
          u = this.tournament.finalScore || Math.round(l * c);
        h = `15/15 LEYENDA · ${l} × ${c} = ${u} PTS`;
      } else if (this.tournament.eliminated) {
        const l = this.tournament.highestTier || "Ninguno",
          c = this.tournament.multiplier || 0.5,
          u = this.state.points || 0,
          b = this.tournament.finalScore || Math.round(u * c);
        h = `${this.tournament.wins}/${i} victorias · Tier ${l} × ${c} = ${b} PTS`;
      } else if (a) {
        const l = (s == null ? void 0 : s.reward) || 0,
          c = T[n];
        h = `+${l} PTS · Ronda ${n + 1}/${i} → vs ${(c == null ? void 0 : c.name) || "—"}`;
      } else h = `Lograste ${this.tournament.wins}/${i} victorias`;
      
      if (this.tournament.champion || this.tournament.eliminated) {
        RetrocHistoryManager.saveEntry({
          mode: "tournament",
          round: this.tournament.wins + (this.tournament.champion ? 0 : 1),
          champion: !!this.tournament.champion,
          highestTier: this.tournament.highestTier || this._highestTierCompleted(),
          finalScore: this.tournament.finalScore || Math.round((this.state.points || 0) * (this.tournament.multiplier || 0.5)),
          basePoints: this.state.points || 0,
          opponent: s ? s.name : "Todos"
        });
        RetrocLeaderboardManager.saveLocalScore(this.tournament.finalScore || Math.round((this.state.points || 0) * (this.tournament.multiplier || 0.5)), {
          rounds: `${this.tournament.wins}/15`
        });
      }

      ((this.hud.overlayKicker.textContent = r[0]),
        (this.hud.overlayTitle.textContent = h),
        (this.hud.overlayCopy.textContent =
          a && !this.tournament.champion
            ? "Toca la cancha para siguiente partido"
            : "Toca la cancha para volver al menú"));
            
      if (this.hud.overlayCluster) {
        this.hud.overlayCluster.hidden = !1;
        if (a && !this.tournament.champion) {
          if (this.hud.overlayNext) {
            this.hud.overlayNext.hidden = !1;
            this.hud.overlayNext.textContent = `⚽ Siguiente Ronda (R${n + 1}) ➡️`;
          }
        } else {
          if (this.hud.overlayNext) this.hud.overlayNext.hidden = !0;
        }
      }
    }
    handleOverlayClick() {
      if (this.mode === "tournament") {
        if (this.tournament.champion || this.tournament.eliminated) {
          window.location.reload();
          return;
        }
        (this.resetMatch(!1),
          (this.started = !1),
          (this.ended = !1),
          (this.hud.overlay.hidden = !1),
          this.updateOverlayReady());
        return;
      }
      this.resetMatch();
    }
    async persistAndSubmit() {
      var e, s, a, i, n, r;
      if (this.submitted) return;
      this.submitted = !0;
      const t = Math.max(0, Math.round(this.state.points));
      if (t > this.bestPoints) {
        this.bestPoints = t;
        try {
          await ((a =
            (s = (e = this.sdk) == null ? void 0 : e.gameState) == null
              ? void 0
              : s.save) == null
            ? void 0
            : a.call(s, { version: I, bestPoints: this.bestPoints }));
        } catch {}
      }
      if (Number.isFinite(t))
        try {
          await ((r =
            (n = (i = this.sdk) == null ? void 0 : i.leaderboard) == null
              ? void 0
              : n.submit) == null
            ? void 0
            : r.call(n, t));
        } catch {}
    }
    getP1MoveVector() {
      let t = 0, e = 0;
      if (this.stickVector.active) {
        t += this.stickVector.y; // Y tactil mueve en X de mundo (ancho de cancha)
        e += this.stickVector.x; // X tactil mueve en Y de mundo (largo de cancha)
      }
      if (this.keys.has("arrowleft") || this.keys.has("a")) e -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) e += 1;
      if (this.keys.has("arrowup") || this.keys.has("w")) t -= 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) t += 1;
      return f(t, e);
    }
    getP2MoveVector() {
      let t = 0, e = 0;
      if (this.p2Keys.has("p2-left")) e -= 1;
      if (this.p2Keys.has("p2-right")) e += 1;
      if (this.p2Keys.has("p2-up")) t -= 1;
      if (this.p2Keys.has("p2-down")) t += 1;
      return f(t, e);
    }
    updateStick(t) {
      t.preventDefault();
      const e = this.hud.stick.getBoundingClientRect(),
        s = e.left + e.width / 2,
        a = e.top + e.height / 2,
        i = t.clientX - s,
        n = t.clientY - a,
        r = e.width * 0.32,
        h = Math.min(1, Math.hypot(i, n) / r),
        l = f(i, n);
      ((this.stickVector = { x: l.x, y: l.y, active: !0 }),
        (this.hud.stickKnob.style.transform = `translate(calc(-50% + ${l.x * r * h}px), calc(-50% + ${l.y * r * h}px))`));
    }
    updateEffects(t) {
      var e;
      ((this.shake = Math.max(0, this.shake - t * 18)),
        (this.message.time = Math.max(0, this.message.time - t)),
        this.flash && (this.flash.life -= t),
        ((e = this.flash) == null ? void 0 : e.life) <= 0 &&
          (this.flash = null),
        this.particles.forEach((s) => {
          ((s.x += s.vx * t),
            (s.y += s.vy * t),
            (s.life -= t),
            (s.spin += s.spinSpeed * t));
        }),
        (this.particles = this.particles.filter((s) => s.life > 0)));
    }
    render() {
      const t = this.ctx,
        { w: e, h: s } = this.size;
      if (
        (t.save(),
        t.setTransform(this.dpr, 0, 0, this.dpr, 0, 0),
        (t.fillStyle = "#101820"),
        t.fillRect(0, 0, e, s),
        !this.assetsReady)
      ) {
        ((t.fillStyle = "#101820"), t.fillRect(0, 0, e, s), t.restore());
        return;
      }
      const a = this.screenShake();
      (t.translate(a.x, a.y),
        this.drawBackdrop(t),
        this.drawField(t),
        this.drawWorldObjects(t),
        this.drawParticles(t),
        this.drawMessage(t),
        this.flash && this.drawFlash(t),
        this.mode === "tournament" &&
          this.tournament.currentOpponent &&
          this.started &&
          this.drawTournamentBadge(t),
        t.restore());
    }
    drawTournamentBadge(t) {
      var l;
      if (!this.tournament.currentOpponent) return;
      const e = this.tournament.currentOpponent,
        s = T.length,
        a = this.size.w - 12,
        i = ((l = this.layout) == null ? void 0 : l.top) || 60;
      (t.save(),
        (t.font = "800 13px ui-sans-serif, system-ui"),
        (t.textAlign = "right"),
        (t.textBaseline = "top"),
        (t.fillStyle = "rgba(8, 12, 20, 0.78)"));
      const n = e.tier ? ` · ${e.tier}` : "",
        r = `R${this.tournament.round + 1}/${s} vs ${e.name}${n}`,
        h = t.measureText(r).width;
      ($(t, a - h - 14, i - 4, h + 12, 22, 6),
        t.fill(),
        (t.fillStyle = "#ffe871"),
        t.fillText(r, a - 6, i + 2),
        t.restore());
    }
    drawBackdrop(t) {
      Z(t, this.images.backdrop, 0, 0, this.size.w, this.size.h);
      const e = t.createLinearGradient(0, 0, 0, this.size.h);
      (e.addColorStop(0, "rgba(8, 13, 26, 0.05)"),
        e.addColorStop(0.6, "rgba(7, 26, 18, 0.2)"),
        e.addColorStop(1, "rgba(5, 12, 8, 0.65)"),
        (t.fillStyle = e),
        t.fillRect(0, 0, this.size.w, this.size.h));
    }
    drawField(t) {
      const e = this.layout,
        s = this.worldToScreen(0, 0),
        a = this.worldToScreen(y, 0),
        i = this.worldToScreen(y, d),
        n = this.worldToScreen(0, d);
      (t.save(),
        t.beginPath(),
        t.moveTo(s.x, s.y),
        t.lineTo(a.x, a.y),
        t.lineTo(i.x, i.y),
        t.lineTo(n.x, n.y),
        t.closePath(),
        t.clip(),
        this.grassPattern &&
          ((t.globalAlpha = 0.98),
          (t.fillStyle = this.grassPattern),
          t.translate(e.cx - e.bottomW / 2, e.top),
          t.scale(0.32, 0.32),
          t.fillRect(-2200, -2200, 7e3, 8e3),
          t.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)));
      for (let r = 0; r < 8; r += 1) {
        const h = (r / 8) * d,
          l = this.worldToScreen(0, h),
          c = this.worldToScreen(y, h + d / 8);
        ((t.fillStyle =
          r % 2 ? "rgba(30, 115, 45, 0.18)" : "rgba(130, 185, 65, 0.12)"),
          t.beginPath(),
          t.moveTo(l.x, l.y),
          t.lineTo(this.worldToScreen(y, h).x, this.worldToScreen(y, h).y),
          t.lineTo(c.x, c.y),
          t.lineTo(
            this.worldToScreen(0, h + d / 8).x,
            this.worldToScreen(0, h + d / 8).y,
          ),
          t.closePath(),
          t.fill());
      }
      (t.restore(),
        t.save(),
        (t.strokeStyle = "rgba(246, 255, 232, 0.92)"),
        (t.lineWidth = m(e.fieldH / 280, 1.7, 3.2)),
        (t.lineJoin = "round"),
        this.strokeWorldPath(t, [
          [0, 0],
          [y, 0],
          [y, d],
          [0, d],
          [0, 0],
        ]),
        this.strokeWorldPath(t, [
          [0, d / 2],
          [y, d / 2],
        ]),
        this.strokeWorldRect(t, 14, 0, 40, 18),
        this.strokeWorldRect(t, 23, 0, 22, 8),
        this.strokeWorldRect(t, 14, d - 18, 40, 18),
        this.strokeWorldRect(t, 23, d - 8, 22, 8),
        this.strokeWorldCircle(t, 34, d / 2, 10, 36),
        this.strokeWorldCircle(t, 34, 12, 0.9, 12),
        this.strokeWorldCircle(t, 34, d - 12, 0.9, 12),
        t.restore(),
        this.drawGoalSprite(t, !0),
        this.drawBottomGoal(t));
    }
    strokeWorldRect(t, e, s, a, i) {
      this.strokeWorldPath(t, [
        [e, s],
        [e + a, s],
        [e + a, s + i],
        [e, s + i],
        [e, s],
      ]);
    }
    strokeWorldPath(t, e) {
      (t.beginPath(),
        e.forEach(([s, a], i) => {
          const n = this.worldToScreen(s, a);
          i === 0 ? t.moveTo(n.x, n.y) : t.lineTo(n.x, n.y);
        }),
        t.stroke());
    }
    strokeWorldCircle(t, e, s, a, i) {
      t.beginPath();
      for (let n = 0; n <= i; n += 1) {
        const r = (Math.PI * 2 * n) / i,
          h = this.worldToScreen(e + Math.cos(r) * a, s + Math.sin(r) * a);
        n === 0 ? t.moveTo(h.x, h.y) : t.lineTo(h.x, h.y);
      }
      t.stroke();
    }
    drawGoalSprite(t) {
      const topP = this.worldToScreen(v - 2.5, 1.8);
      const botP = this.worldToScreen(S + 2.5, 1.8);
      const goalH = Math.abs(botP.y - topP.y);
      const goalW = goalH * 0.6;
      t.save(); t.globalAlpha = 0.96;
      t.drawImage(this.images.goal, topP.x - goalW, topP.y, goalW, goalH);
      t.restore();
    }
    drawBottomGoal(t) {
      const topP = this.worldToScreen(v - 2.5, d - 1.8);
      const botP = this.worldToScreen(S + 2.5, d - 1.8);
      const goalH = Math.abs(botP.y - topP.y);
      const goalW = goalH * 0.6;
      t.save(); t.globalAlpha = 0.96;
      t.save(); t.translate(topP.x + goalW, topP.y + goalH); t.rotate(Math.PI);
      t.drawImage(this.images.goal, 0, 0, goalW, goalH);
      t.restore(); t.restore();
    }
    drawWorldObjects(t) {
      const e = [
        ...this.state.red,
        ...this.state.blue,
        { type: "ball", y: this.state.ball.y },
      ].sort((s, a) => s.y - a.y);
      for (const s of e)
        s.type === "ball" ? this.drawBall(t) : this.drawPlayer(t, s);
    }
    drawPlayer(t, e) {
      const s = this.worldToScreen(e.x, e.y);
      let a = false;
      this.mode === "pvp"
        ? (a = true)
        : (a = e.team === "blue" && this.state.blue[this.state.activeBlue] === e);
      
      const hasBall = this.state.ball.owner === e;

      t.save();
      t.globalAlpha = 0.45;
      t.fillStyle = a ? "#ffffff" : "#07110b";
      t.beginPath();
      t.ellipse(s.x, s.y + 6, 6 * s.scale, 3 * s.scale, 0, 0, Math.PI * 2);
      t.fill();

      // Ring brillante de posession bajo el futbolista que posee la pelota
      if (hasBall) {
        t.save();
        t.shadowBlur = 15; t.shadowColor = e.team === "blue" ? "#39ff88" : "#ffe871";
        t.strokeStyle = e.team === "blue" ? "#39ff88" : "#ffe871"; t.lineWidth = 3.5;
        t.beginPath();
        t.ellipse(s.x, s.y + 3, 9 * s.scale, 4.5 * s.scale, 0, 0, Math.PI * 2);
        t.stroke();
        t.restore();
      } else if (a) {
        t.globalAlpha = 0.95;
        t.strokeStyle = "#ffe871"; t.lineWidth = 2;
        t.beginPath();
        t.ellipse(s.x, s.y + 4, 7 * s.scale, 3.5 * s.scale, 0, 0, Math.PI * 2);
        t.stroke();
      }
      t.restore();

      this.drawAtlas(
        t,
        e.frame,
        s.x,
        s.y + Math.sin(performance.now() / 110 + e.x) * 0.7,
        13.5 * s.scale,
        Math.atan2(e.dir.y, e.dir.x) // Angulo True Landscape apaisado
      );
    }
    drawBall(t) {
      const bObj = this.state.ball;
      const owner = bObj.owner;

      let bx = bObj.x;
      let by = bObj.y;
      if (owner) {
        bx = owner.x + (owner.dir ? owner.dir.x * 1.5 : 0);
        by = owner.y + (owner.dir ? owner.dir.y * 1.5 : 2);
      }

      const e = this.worldToScreen(bx, by);

      t.save();
      t.fillStyle = "rgba(0,0,0,0.4)";
      t.beginPath();
      t.ellipse(e.x + 2, e.y + 4, 3.5 * e.scale, 1.8 * e.scale, 0, 0, Math.PI * 2);
      t.fill();
      t.restore();

      const isMoving = Math.hypot(bObj.vx || 0, bObj.vy || 0) > 5;
      const angle = isMoving ? (bObj.x + bObj.y) * 0.4 : 0;

      if (!owner) {
        t.save();
        t.shadowBlur = 12; t.shadowColor = "#ffffff";
        this.drawAtlas(t, "soccer_ball", e.x, e.y - 1.8 * e.scale, 7.5 * e.scale, angle);
        t.restore();
      } else {
        t.save();
        t.shadowBlur = 18; t.shadowColor = owner.team === "blue" ? "#3fbfff" : "#ff4545";
        this.drawAtlas(t, "soccer_ball", e.x, e.y - 1.5 * e.scale, 7.2 * e.scale, angle);
        t.restore();
      }
    }
    drawAtlas(t, e, s, a, i, n = 0) {
      const r = this.frames.get(e);
      if (!r) return;
      const h = r.source,
        l = r.content || h,
        c = r.anchor
          ? { x: r.anchor.x - h.x, y: r.anchor.y - h.y }
          : { x: h.w / 2, y: h.h * 0.85 },
        u = i / h.h;
      (t.save(),
        t.translate(s, a),
        t.rotate(n),
        (t.imageSmoothingEnabled = !0),
        t.drawImage(
          this.images.atlas,
          l.x,
          l.y,
          l.w,
          l.h,
          -c.x * u + (l.x - h.x) * u,
          -c.y * u + (l.y - h.y) * u,
          l.w * u,
          l.h * u,
        ),
        t.restore());
    }
    drawParticles(t) {
      for (const e of this.particles) {
        const s = m(e.life / e.maxLife, 0, 1);
        e.kind === "spark"
          ? (t.save(),
            (t.globalAlpha = s),
            this.drawAtlas(t, "boot_spark", e.x, e.y, e.size * s, e.spin),
            t.restore())
          : (t.save(),
            (t.globalAlpha = s),
            (t.fillStyle = e.color),
            t.beginPath(),
            t.arc(e.x, e.y, e.size * s, 0, Math.PI * 2),
            t.fill(),
            t.restore());
      }
    }
    drawMessage(t) {
      if (this.message.time <= 0) return;
      const e = m(this.message.time, 0, 1);
      (t.save(),
        (t.globalAlpha = e),
        (t.font = `800 ${m(this.size.w * 0.07, 22, 36)}px ui-sans-serif, system-ui`),
        (t.textAlign = "center"),
        (t.textBaseline = "middle"));
      const s = t.measureText(this.message.text).width,
        a = this.size.w / 2,
        i = this.layout.top + this.layout.fieldH * 0.38;
      ((t.fillStyle = "rgba(8, 12, 20, 0.62)"),
        $(t, a - s / 2 - 22, i - 28, s + 44, 56, 12),
        t.fill(),
        (t.fillStyle = "#f9fbdf"),
        t.fillText(this.message.text, a, i + 1),
        t.restore());
    }
    drawFlash(t) {
      const e = m(this.flash.life / this.flash.maxLife, 0, 1) * 0.24;
      (t.save(),
        (t.fillStyle =
          this.flash.team === "blue"
            ? `rgba(66, 170, 255, ${e})`
            : `rgba(255, 69, 69, ${e})`),
        t.fillRect(0, 0, this.size.w, this.size.h),
        t.restore());
    }
    spawnKickDust(t, e, s) {
      const a = this.worldToScreen(t, e),
        i = this.config.effectsIntensity;
      for (let n = 0; n < s * i; n += 1) {
        const r = Math.random() * Math.PI * 2,
          h = 24 + Math.random() * 56;
        this.particles.push({
          kind: Math.random() > 0.35 ? "spark" : "dot",
          x: a.x,
          y: a.y,
          vx: Math.cos(r) * h,
          vy: Math.sin(r) * h - 12,
          life: 0.35 + Math.random() * 0.22,
          maxLife: 0.55,
          size: 8 + Math.random() * 12,
          spin: Math.random() * Math.PI,
          spinSpeed: -4 + Math.random() * 8,
          color: Math.random() > 0.45 ? "#f7df83" : "#d7f1ff",
        });
      }
    }
    spawnGoalBurst(t) {
      const e = t === "blue" ? 2 : d - 2;
      for (let s = 0; s < 36 * this.config.effectsIntensity; s += 1) {
        const a = A(v, S, Math.random());
        this.spawnKickDust(a, e, 1);
      }
    }
    flashMessage(t, e, s = null) {
      ((this.message = { text: t, time: e }),
        s && (this.flash = { team: s, life: 0.55, maxLife: 0.55 }));
    }
    updateHud() {
      this.hud &&
        ((this.hud.blue.textContent = String(this.state.blueGoals)),
        (this.hud.red.textContent = String(this.state.redGoals)),
        (this.hud.time.textContent = Q(this.state.timeLeft)),
        (this.hud.points.textContent = String(
          Math.max(0, Math.round(this.state.points)),
        )),
        (this.hud.best.textContent = `BEST ${Math.max(this.bestPoints, this.state.points) | 0}`));
    }
    async unlockAudio() {
      var t, e, s, a;
      try {
        (!this.audioHandle &&
          (e = (t = this.sdk) == null ? void 0 : t.audio) != null &&
          e.getContext &&
          ((this.audioHandle = await this.sdk.audio.getContext()),
          (this.audioContext = this.audioHandle.context)),
          await ((a = (s = this.audioHandle) == null ? void 0 : s.unlock) ==
          null
            ? void 0
            : a.call(s)));
      } catch {
        this.audioContext = null;
      }
    }
    playBlip(t = 240, e = 0.08, s = "sine", a = 0.04) {
      const i = this.audioContext;
      if (!i) return;
      const n = i.createOscillator(),
        r = i.createGain();
      ((n.type = s),
        (n.frequency.value = t),
        r.gain.setValueAtTime(a, i.currentTime),
        r.gain.exponentialRampToValueAtTime(0.001, i.currentTime + e),
        n.connect(r).connect(i.destination),
        n.start(),
        n.stop(i.currentTime + e));
    }
    playGoalSound() {
      (this.playBlip(330, 0.08, "square", 0.045),
        setTimeout(() => this.playBlip(494, 0.1, "triangle", 0.05), 90),
        setTimeout(() => this.playBlip(660, 0.14, "triangle", 0.055), 180));
    }
    vibrate(t) {
      var e, s, a;
      try {
        const i =
          (s = (e = this.sdk) == null ? void 0 : e.device) == null
            ? void 0
            : s.haptics;
        (a = i == null ? void 0 : i.isSupported) != null &&
          a.call(i) &&
          i.vibrate(t);
      } catch {}
    }
  }
  function g(o, t, e, s, a, i, n, r = !1, h = !1) {
    return {
      team: o,
      frame: t,
      x: e,
      y: s,
      vx: 0,
      vy: 0,
      speed: a,
      aiSpeed: i,
      radius: n,
      keeper: r,
      p2Controlled: h,
      dir: o === "red" ? { x: 0, y: 1 } : { x: 0, y: -1 },
    };
  }
  function P(o, t, e, s) {
    ((o.vx = t), (o.vy = e), (o.x += t * s), (o.y += e * s));
  }
  function B(o, t, e, s, a) {
    ((o.x = m(o.x, t, e)), (o.y = m(o.y, s, a)));
  }
  function X(o) {
    return new Promise((t, e) => {
      const s = new Image();
      ((s.decoding = "async"),
        (s.onload = () => t(s)),
        (s.onerror = () => e(new Error(`Failed to load ${o}`))),
        (s.src = o));
    });
  }
  function f(o, t) {
    const e = Math.hypot(o, t);
    return e < 0.001 ? { x: 0, y: 0 } : { x: o / e, y: t / e };
  }
  function M(o, t) {
    return Math.hypot(o.x - t.x, o.y - t.y);
  }
  function m(o, t, e) {
    return Math.max(t, Math.min(e, o));
  }
  function A(o, t, e) {
    return o + (t - o) * e;
  }
  function Q(o) {
    const t = Math.max(0, Math.ceil(o)),
      e = Math.floor(t / 60),
      s = t % 60;
    return `${e}:${String(s).padStart(2, "0")}`;
  }
  function Z(o, t, e, s, a, i) {
    const n = Math.max(a / t.width, i / t.height),
      r = a / n,
      h = i / n,
      l = (t.width - r) / 2,
      c = (t.height - h) / 2;
    o.drawImage(t, l, c, r, h, e, s, a, i);
  }
  function $(o, t, e, s, a, i) {
    const n = Math.min(i, s / 2, a / 2);
    (o.beginPath(),
      o.moveTo(t + n, e),
      o.arcTo(t + s, e, t + s, e + a, n),
      o.arcTo(t + s, e + a, t, e + a, n),
      o.arcTo(t, e + a, t, e, n),
      o.arcTo(t, e, t + s, e, n),
      o.closePath());
  }
  const tt = {
      matchLength: {
        type: "number",
        value: 90,
        min: 45,
        max: 180,
        step: 5,
        name: "Match Length",
        description: "Seconds in one mini match.",
        group: "gameplay",
        index: 1,
      },
      gameSpeed: {
        type: "number",
        value: 1,
        min: 0.75,
        max: 1.35,
        step: 0.05,
        name: "Game Speed",
        description: "Overall pace of players and the ball.",
        group: "gameplay",
        index: 2,
      },
      aiAggression: {
        type: "number",
        value: 1,
        min: 0.6,
        max: 1.6,
        step: 0.05,
        name: "AI Aggression",
        description: "How quickly defenders press and tackle.",
        group: "gameplay",
        index: 3,
      },
      shotAssist: {
        type: "number",
        value: 0.55,
        min: 0,
        max: 1,
        step: 0.05,
        name: "Shot Assist",
        description: "How much shots bend toward the goal mouth.",
        group: "gameplay",
        index: 4,
      },
      effectsIntensity: {
        type: "number",
        value: 1,
        min: 0,
        max: 1.5,
        step: 0.1,
        name: "Effects Intensity",
        description: "Particles, shake, and impact feedback strength.",
        group: "visual",
        index: 5,
      },
    },
    O = {
      STADIUM_BACKDROP: "generated-assets/stadium_backdrop.png",
      GRASS_TEXTURE: "generated-assets/grass_texture.png",
      PLAYER_ATLAS: "generated-assets/player_atlas.png",
      PLAYER_ATLAS_FRAMES: "generated-assets/player_atlas-frames.json",
      GOAL_NET: "generated-assets/goal_net.png",
    };
  document.querySelector("#app");
  let k = null;
  async function N() {
    await R.ready();
    const o = R.tweaks.init(tt);
    let t;
    return (
      O &&
        Object.keys(O).length > 0 &&
        ((t = await R.assets.register(O)),
        t && typeof t.preload == "function" && (await t.preload())),
      { sdk: R, tweaks: o, assets: t }
    );
  }
  const et =
      new URL(window.location.href).searchParams.get("standalone") !== "0",
    _ = document.getElementById("app");
  et &&
    _ &&
    !document.getElementById("fm-game-mount") &&
    N().then(({ sdk: o, tweaks: t, assets: e }) => {
      Promise.resolve()
        .then(() => at)
        .then(({ createMenu: s }) => {
          const a = s({
            mount: _,
            onSelect: (i) => {
              a.hide();
              const n = K({ mount: _, sdk: o, tweaks: t, assets: e, mode: i });
              (n.start(), (k = n));
            },
          });
          a.show();
        });
    });
  const F = {
    async start(o = {}) {
      const { sdk: t, tweaks: e, assets: s } = await N(),
        a =
          typeof o.mount == "string"
            ? document.getElementById(o.mount)
            : o.mount;
      if (!a)
        return (
          console.error("[RetroCancha] mount element not found:", o.mount),
          null
        );
      (k && (k.destroy(), (k = null)), (a.innerHTML = ""));
      const i = o.mode || "pve",
        n = K({ mount: a, sdk: t, tweaks: e, assets: s, mode: i });
      if (typeof o.onMatchEnd == "function") {
        const r = n.start;
        n.start = () => {
          (r(),
            a.addEventListener("retroc:matchend", (h) => {
              try {
                o.onMatchEnd(h.detail);
              } catch (l) {
                console.error(l);
              }
            }));
        };
      }
      return (n.start(), (k = n), n);
    },
    stop() {
      k && (k.destroy(), (k = null));
    },
    modes: ["pve", "pvp", "tournament"],
  };
  typeof window < "u" && (window.RetroCancha = F);
  function st({ mount: o, onSelect: t }) {
    let e;
    function s() {
      e ||
        ((e = document.createElement("section")),
        (e.className = "soccer-root menu-root"),
        (e.innerHTML = `
      <div class="menu-stage">
        <div class="menu-frame">
          <div class="menu-kicker">⚽ RETRO CANCHA 03 ⚽</div>
          <h1 class="menu-title">FUTMUNDI</h1>
          <p class="menu-subtitle">Mini partido · Top-down arcade</p>

          <div class="menu-buttons">
            <button class="menu-btn" data-mode="pve">
              <span class="menu-btn-tag">1P</span>
              <span class="menu-btn-title">VS CPU</span>
              <span class="menu-btn-desc">Enfrentá a la IA</span>
            </button>
            <button class="menu-btn" data-mode="pvp">
              <span class="menu-btn-tag">2P</span>
              <span class="menu-btn-title">VS AMIGO</span>
              <span class="menu-btn-desc">Local, mismo teclado</span>
            </button>
            <button class="menu-btn" data-mode="tournament">
              <span class="menu-btn-tag">🏆</span>
              <span class="menu-btn-title">TORNEO</span>
              <span class="menu-btn-desc">15 rivales, 1 campeón</span>
            </button>
          </div>

          <div class="menu-extra-actions">
            <button class="menu-extra-btn" id="menu-hist-btn" type="button">📜 Mis Torneos</button>
            <button class="menu-extra-btn" id="menu-rank-btn" type="button">🏆 Ranking</button>
          </div>

          <div class="menu-prize-banner" id="prize-pool-banner">
            <div class="prize-banner-info">
              <span>💎 BOLSA DE PREMIOS EN VIVO</span>
              <strong data-prize-gems>900 GEMAS</strong>
              <small data-prize-meta>30 Inscritos · $90 USD (30% Pozo)</small>
            </div>
            <button class="prize-banner-btn" type="button" id="open-prize-modal-btn">Ver Repartición 🎁</button>
          </div>

          <div class="menu-controls">
            <p class="menu-controls-title">Controles</p>
            <div class="menu-controls-grid">
              <div class="menu-ctrl-col">
                <strong>Modo 1P / Torneo</strong>
                <span>🕹️ Joystick / WASD / Flechas</span>
                <span>🥅 SHOT: mantener y soltar</span>
                <span>➡️ PASS: toque rápido</span>
              </div>
              <div class="menu-ctrl-col">
                <strong>Modo 2P</strong>
                <span><b>P1:</b> WASD + Space</span>
                <span><b>P2:</b> Flechas + Enter</span>
                <span>Cada uno controla su equipo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `),
        o.replaceChildren(e),
        e.querySelectorAll(".menu-btn").forEach((i) => {
          i.addEventListener("click", () => {
            const n = i.dataset.mode;
            typeof t == "function" && t(n);
          });
        }),
        e.querySelector("#menu-hist-btn")?.addEventListener("click", () => openHistoryModal(() => { a(); t("tournament"); })),
        e.querySelector("#menu-rank-btn")?.addEventListener("click", () => openLeaderboardModal()),
        e.querySelector("#open-prize-modal-btn")?.addEventListener("click", () => openPrizePoolModal()),
        updatePrizeBanner());
    }
    function a() {
      e && (e.remove(), (e = null));
    }
    return { show: s, hide: a };
  }
  const at = Object.freeze(
    Object.defineProperty(
      { __proto__: null, createMenu: st },
      Symbol.toStringTag,
      { value: "Module" },
    ),
  );
  return F;
})();
