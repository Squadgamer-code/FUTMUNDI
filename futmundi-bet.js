/* ==========================================================================
   FUTMUNDI BET APP - VERSIÓN MINIMALISTA WEB3 CON CUOTAS EN VIVO (TIME DECAY)
   Filtros del Mundial 2026, Rendimiento Ligero y Zero Lag para Vercel
   ========================================================================== */

(function () {
  if (window.__futmundi_bet_installed) return;
  window.__futmundi_bet_installed = true;

  // --- CONFIGURACIÓN DE PAGO TON (USDT) ---
  const TonUsdtContractConfig = {
    contractAddress: "EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs", 
    jettonUsdtAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    rateGemsPerWinUSD: 10 
  };

  // --- GESTOR HÍBRIDO DB (SUPABASE REMOTO & LOCAL) ---
  const BetDB = {
    getTicketsKey() { return "futmundi_bet_tickets_minimal_v6"; },
    getBalanceKey() { return "futmundi_user_balance_gems"; },
    getApiBase() { return (window.FM_ADMIN_API_BASE || localStorage.getItem("fm_admin_api_base") || "https://futmundi-admin-backend.onrender.com").replace(/\/$/, ""); },

    getUserGems() {
      try {
        if(window.STATE && window.STATE.balanceGems != null) return window.STATE.balanceGems;
        const val = localStorage.getItem(this.getBalanceKey());
        return val !== null ? parseInt(val, 10) : 1500;
      } catch {
        return 1500;
      }
    },
    updateUserGems(newAmount) {
      try {
        if(window.STATE) window.STATE.balanceGems = newAmount;
        localStorage.setItem(this.getBalanceKey(), newAmount);
        window.dispatchEvent(new CustomEvent("futmundi:balance_updated", { detail: { gems: newAmount } }));
      } catch {}
    },
    addGems(amount) {
      const curr = this.getUserGems();
      this.updateUserGems(curr + amount);
    },

    loadTickets() {
      try {
        return JSON.parse(localStorage.getItem(this.getTicketsKey()) || "[]");
      } catch {
        return [];
      }
    },
    saveTickets(ticketsList) {
      try {
        localStorage.setItem(this.getTicketsKey(), JSON.stringify(ticketsList));
      } catch {}
    },

    createTicket(newTicket) {
      const ticketId = "TON-TICK-" + Math.floor(100000 + Math.random() * 900000);
      const ticketObj = {
        id: ticketId,
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        status: "active", 
        ...newTicket
      };

      const list = this.loadTickets();
      list.unshift(ticketObj);
      this.saveTickets(list);

      try {
        const payload = {
          wallet: (window.STATE && window.STATE.tonWallet) || "JugadorLocal",
          ticket: ticketObj
        };
        fetch(this.getApiBase() + "/api/bets/create-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch {}

      return list;
    },

    async syncMySupabaseTickets(walletAddr) {
      if (!walletAddr) return this.loadTickets();
      try {
        const res = await fetch(this.getApiBase() + "/api/bets/my-tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddr })
        });
        const data = await res.json();
        if (data && data.tickets && Array.isArray(data.tickets)) {
          const localList = this.loadTickets();
          const remoteMap = new Map(data.tickets.map(t => [t.id, t]));
          localList.forEach(t => { if (!remoteMap.has(t.id)) remoteMap.set(t.id, t); });
          const unified = Array.from(remoteMap.values()).sort((a,b) => b.createdAt - a.createdAt);
          this.saveTickets(unified);
          return unified;
        }
        return this.loadTickets();
      } catch {
        return this.loadTickets();
      }
    },

    updateTicketStatus(ticketId, newStatus, realResultStr) {
      const list = this.loadTickets();
      const tick = list.find(t => t.id === ticketId);
      if (tick) {
        tick.status = newStatus;
        if(realResultStr) tick.realResult = realResultStr;
        tick.resolvedAt = Date.now();
        this.saveTickets(list);

        try {
          fetch(this.getApiBase() + "/api/bets/update-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: ticketId, status: newStatus, realResult: realResultStr })
          }).catch(()=>{});
        } catch {}
      }
      return list;
    },

    claimTicketPrize(ticketId) {
      const list = this.loadTickets();
      const tick = list.find(t => t.id === ticketId);
      if (tick && tick.status === "won") {
        tick.status = "claimed";
        this.addGems(tick.prizeGems);
        this.saveTickets(list);

        try {
          fetch(this.getApiBase() + "/api/bets/claim-prize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticketId: ticketId, wallet: (window.STATE && window.STATE.tonWallet) || "JugadorLocal" })
          }).catch(()=>{});
        } catch {}

        return tick.prizeGems;
      }
      return 0;
    }
  };

  // --- CLIENTE API-SPORTS CON ALGORITMO TIME-DECAY EN VIVO ---
  const SportsApiProvider = {
    apiKey: "cae471625cb7232f9a54146633227bc6", 
    baseUrl: "https://v3.football.api-sports.io",

    getFallbackMatches() {
      const list = [
        {
          id: "m_world_1",
          category: "world",
          competition: "🏆 Mundial 2026 - Cuartos de Final",
          team1: { name: "Brasil", flag: "🇧🇷" },
          team2: { name: "Costa Rica", flag: "🇨🇷" },
          live: true, elapsed: 78, minuteStr: "78'", score: "1 - 0",
          baseOdds: { "1": 1.30, "X": 4.50, "2": 8.50 }
        },
        {
          id: "m_world_4",
          category: "world",
          competition: "🏆 Mundial 2026 - Octavos de Final",
          team1: { name: "Uruguay", flag: "🇺🇾" },
          team2: { name: "Colombia", flag: "🇨🇴" },
          live: true, elapsed: 84, minuteStr: "84'", score: "2 - 2",
          baseOdds: { "1": 2.60, "X": 2.10, "2": 2.80 }
        },
        {
          id: "m_world_2",
          category: "world",
          competition: "🏆 Mundial 2026 - Cuartos de Final",
          team1: { name: "Argentina", flag: "🇦🇷" },
          team2: { name: "España", flag: "🇪🇸" },
          live: false, elapsed: 0, minuteStr: "Hoy 18:00", score: "vs",
          baseOdds: { "1": 2.50, "X": 3.10, "2": 2.70 }
        },
        {
          id: "m_world_3",
          category: "world",
          competition: "🏆 Mundial 2026 - Cuartos de Final",
          team1: { name: "Alemania", flag: "🇩🇪" },
          team2: { name: "Francia", flag: "🇫🇷" },
          live: false, elapsed: 0, minuteStr: "Mañana", score: "vs",
          baseOdds: { "1": 2.75, "X": 3.20, "2": 2.45 }
        },
        {
          id: "m_world_5",
          category: "leagues",
          competition: "🌎 Copa CONCACAF - Semifinal",
          team1: { name: "México", flag: "🇲🇽" },
          team2: { name: "Estados Unidos", flag: "🇺🇸" },
          live: false, elapsed: 0, minuteStr: "Jueves", score: "vs",
          baseOdds: { "1": 2.65, "X": 3.00, "2": 2.60 }
        },
        {
          id: "m_world_6",
          category: "leagues",
          competition: "🇪🇺 Nations League - Final",
          team1: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
          team2: { name: "Italia", flag: "🇮🇹" },
          live: false, elapsed: 0, minuteStr: "Viernes", score: "vs",
          baseOdds: { "1": 2.15, "X": 3.10, "2": 3.40 }
        }
      ];

      return list.map(m => this.applyTimeDecayOdds(m));
    },

    applyTimeDecayOdds(matchItem) {
      if (!matchItem.live || matchItem.elapsed <= 60) {
        matchItem.odds = { ...matchItem.baseOdds };
        return matchItem;
      }

      // Algoritmo matemático Time-Decay para partidos pasados del minuto 60'
      const elapsed = matchItem.elapsed; // ej. 78' o 84'
      const parts = matchItem.score.split("-").map(x => parseInt(x.trim(), 10));
      const gHome = parts[0] ?? 0;
      const gAway = parts[1] ?? 0;

      let o1 = matchItem.baseOdds["1"];
      let oX = matchItem.baseOdds["X"];
      let o2 = matchItem.baseOdds["2"];

      // Cuanto más cerca del 90', la cuota del que va ganando se desploma hacia 1.01x
      const factor = (elapsed - 60) / 30; // 0.0 en el 60', 1.0 en el 90'
      
      if (gHome > gAway) {
        // Local gana
        o1 = Math.max(1.02, +(o1 - (o1 - 1.02) * factor * 1.2).toFixed(2));
        oX = +(oX + oX * factor * 3.5).toFixed(2);
        o2 = +(o2 + o2 * factor * 6.0).toFixed(2);
      } else if (gAway > gHome) {
        // Visitante gana
        o2 = Math.max(1.02, +(o2 - (o2 - 1.02) * factor * 1.2).toFixed(2));
        oX = +(oX + oX * factor * 3.5).toFixed(2);
        o1 = +(o1 + o1 * factor * 6.0).toFixed(2);
      } else {
        // Empate
        oX = Math.max(1.05, +(oX - (oX - 1.05) * factor * 0.9).toFixed(2));
        o1 = +(o1 + o1 * factor * 2.2).toFixed(2);
        o2 = +(o2 + o2 * factor * 2.2).toFixed(2);
      }

      matchItem.odds = { "1": o1, "X": oX, "2": o2 };
      return matchItem;
    },

    async fetchLiveSportsApiMatches() {
      try {
        const res = await fetch(this.baseUrl + "/fixtures?live=all", {
          method: "GET",
          headers: { "x-rapidapi-host": "v3.football.api-sports.io", "x-apisports-key": this.apiKey, "x-rapidapi-key": this.apiKey }
        });
        const data = await res.json();
        
        if (!data || !data.response || data.response.length === 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          const res2 = await fetch(this.baseUrl + "/fixtures?date=" + todayStr, {
            method: "GET",
            headers: { "x-rapidapi-host": "v3.football.api-sports.io", "x-apisports-key": this.apiKey, "x-rapidapi-key": this.apiKey }
          });
          const data2 = await res2.json();
          if (data2 && data2.response && data2.response.length > 0) {
            return this.formatApiMatches(data2.response.slice(0, 20));
          }
          return this.getFallbackMatches();
        }

        return this.formatApiMatches(data.response.slice(0, 20));
      } catch {
        return this.getFallbackMatches();
      }
    },

    formatApiMatches(apiList) {
      return apiList.map(item => {
        const fix = item.fixture;
        const league = item.league;
        const teams = item.teams;
        const goals = item.goals;

        const isLive = fix.status.short === "1H" || fix.status.short === "2H" || fix.status.short === "HT" || fix.status.short === "ET" || fix.status.short === "P";
        const elapsed = isLive ? fix.status.elapsed : 0;
        const minuteStr = isLive ? `${elapsed}'` : new Date(fix.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const scoreStr = isLive ? `${goals.home ?? 0} - ${goals.away ?? 0}` : "vs";

        // Mapeo a categoría mundial si contiene World, FIFA, Conmebol, UEFA
        const lName = String(league.name).toLowerCase();
        const isWorld = lName.includes("world") || lName.includes("conmebol") || lName.includes("uefa") || lName.includes("copa");

        const mObj = {
          id: String(fix.id),
          category: isWorld ? "world" : "leagues",
          competition: `⚽ ${league.name} (${league.country})`,
          team1: { name: teams.home.name, flag: "🏠" },
          team2: { name: teams.away.name, flag: "✈️" },
          live: isLive,
          elapsed: elapsed,
          minuteStr: minuteStr,
          score: scoreStr,
          baseOdds: { "1": 2.20, "X": 3.10, "2": 2.75 }
        };

        return this.applyTimeDecayOdds(mObj);
      });
    }
  };

  // --- LÓGICA DE INTERFAZ MINIMALISTA APUESTAS ---
  class FutmundiBetApp {
    constructor() {
      this.matches = SportsApiProvider.getFallbackMatches();
      this.selectedMatch = null;
      this.selectedOddKey = null; 
      this.stakeUSDT = 10; 
      this.activeTab = "matches"; 
      this.activeFilter = "world"; // world, all, leagues
      this.searchQuery = "";

      this.injectOverlay();
      this.injectInvokeButton();
      this.initListeners();
      this.refreshApiMatchesSilently();
    }

    async refreshApiMatchesSilently() {
      const apiMatches = await SportsApiProvider.fetchLiveSportsApiMatches();
      if (apiMatches && apiMatches.length > 0) {
        this.matches = apiMatches;
        if(this.activeTab === 'matches') this.render();
      }
    }

    injectInvokeButton() {
      let topbar = document.querySelector(".futmundi-buttons") || document.querySelector(".futmundi-topbar") || document.body;
      const btn = document.createElement("button");
      btn.className = "futmundi-bet-invoke-btn";
      btn.id = "fbet-invoke-global-btn";
      btn.innerHTML = `<span>🎲 Apuestas Mundial</span><strong id="fbet-global-bal-badge" style="color:#39ff88;">💎 ${BetDB.getUserGems()}</strong>`;
      
      if (topbar.classList && topbar.classList.contains("futmundi-buttons")) {
        topbar.appendChild(btn);
      } else {
        btn.style.position = "fixed";
        btn.style.top = "10px";
        btn.style.right = "180px";
        document.body.appendChild(btn);
      }

      window.addEventListener("futmundi:balance_updated", (e) => {
        const balEl = document.getElementById("fbet-global-bal-badge");
        if (balEl) balEl.textContent = `💎 ${e.detail.gems}`;
        const internalBalEl = document.getElementById("fbet-internal-bal-badge");
        if (internalBalEl) internalBalEl.textContent = `💎 ${e.detail.gems}`;
      });
    }

    injectOverlay() {
      const overlay = document.createElement("div");
      overlay.id = "fbet-universal-overlay";
      overlay.className = "fbet-modal-overlay";
      overlay.hidden = true;
      document.body.appendChild(overlay);
      this.overlayEl = overlay;
    }

    openModal() {
      this.activeTab = "matches";
      BetDB.syncMySupabaseTickets(window.STATE && window.STATE.tonWallet).then(() => this.render());
      this.render();
      this.overlayEl.hidden = false;
    }

    closeModal() {
      this.overlayEl.hidden = true;
    }

    render() {
      const listTickets = BetDB.loadTickets();
      const activeTicketsCount = listTickets.filter(t => t.status === "active").length;

      this.overlayEl.innerHTML = `
        <div class="fbet-modal-box">
          <div class="fbet-header">
            <h2 class="fbet-title"><span>⚡</span> FUTMUNDI APUESTAS (TON SC: EQD3...MIs)</h2>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="fbet-balance-badge" title="Gemas de tus ganancias ganadas">
                <span>Saldo:</span>
                <strong id="fbet-internal-bal-badge">💎 ${BetDB.getUserGems()}</strong>
              </div>
              <button class="fbet-close-btn" type="button" id="fbet-modal-close-btn">✕ Cerrar</button>
            </div>
          </div>

          <div class="fbet-nav-tabs">
            <button class="fbet-tab-btn ${this.activeTab === 'matches' ? 'active' : ''}" type="button" data-fbet-tab="matches">
              ⚽ Encuentros Sports
            </button>
            <button class="fbet-tab-btn ${this.activeTab === 'tickets' ? 'active' : ''}" type="button" data-fbet-tab="tickets">
              📑 Tus Boletos
              ${activeTicketsCount > 0 ? `<span style="background:#ff4545; color:#fff; font-size:0.75rem; padding:2px 7px; border-radius:10px; font-weight:bold;">${activeTicketsCount}</span>` : ''}
            </button>
          </div>

          <div class="fbet-body">
            ${this.activeTab === 'matches' ? this.renderMatchesTab() : this.renderTicketsTab(listTickets)}
          </div>
        </div>
      `;

      this.attachPostRenderListeners();
    }

    renderMatchesTab() {
      // Filtrar la lista
      let filtered = this.matches;
      if (this.activeFilter === "world") {
        filtered = filtered.filter(m => m.category === "world");
      } else if (this.activeFilter === "leagues") {
        filtered = filtered.filter(m => m.category === "leagues");
      }

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.trim().toLowerCase();
        filtered = filtered.filter(m => 
          m.competition.toLowerCase().includes(q) || 
          m.team1.name.toLowerCase().includes(q) || 
          m.team2.name.toLowerCase().includes(q)
        );
      }

      let matchesHTML = `
        <div class="fbet-filters-bar">
          <button class="fbet-quick-filter-btn ${this.activeFilter === 'world' ? 'active' : ''}" type="button" data-fcat="world">
            🔥 MUNDIAL 2026 Y COPAS
          </button>
          <button class="fbet-quick-filter-btn ${this.activeFilter === 'all' ? 'active' : ''}" type="button" data-fcat="all">
            🏆 Todos
          </button>
          <button class="fbet-quick-filter-btn ${this.activeFilter === 'leagues' ? 'active' : ''}" type="button" data-fcat="leagues">
            🇪🇺 Ligas Top
          </button>
          
          <input class="fbet-search-inp" type="text" id="fbet-search-inp" placeholder="🔍 Buscar por país o equipo (Ej: Brasil)..." value="${this.searchQuery}" />
        </div>

        <div class="fbet-matches-list">
          ${filtered.length === 0 ? `<div style="padding:30px 10px; text-align:center; color:rgba(255,255,255,0.5);">No se encontraron partidos para tu búsqueda.</div>` : ''}
          ${filtered.map(m => `
            <div class="fbet-match-card" data-match-id="${m.id}">
              <div class="fbet-match-header">
                <span>${m.competition}</span>
                ${m.live ? `<span class="fbet-live-dot">${m.minuteStr} en juego</span>` : `<span>📅 ${m.minuteStr}</span>`}
              </div>

              <div class="fbet-competitors-row">
                <div class="fbet-team-compact">
                  <span class="fbet-team-flag">${m.team1.flag}</span>
                  <span class="fbet-team-name">${m.team1.name}</span>
                </div>

                <div class="fbet-score-compact">${m.score}</div>

                <div class="fbet-team-compact right">
                  <span class="fbet-team-flag">${m.team2.flag}</span>
                  <span class="fbet-team-name">${m.team2.name}</span>
                </div>
              </div>

              <div class="fbet-odds-compact-grid">
                <button class="fbet-odd-btn ${this.selectedMatch?.id === m.id && this.selectedOddKey === '1' ? 'selected' : ''}" type="button" data-select-odd="${m.id}" data-odd-key="1">
                  <span class="fbet-odd-label">1 (${m.team1.name})</span>
                  <span class="fbet-odd-val">${m.odds["1"].toFixed(2)}</span>
                </button>

                <button class="fbet-odd-btn ${this.selectedMatch?.id === m.id && this.selectedOddKey === 'X' ? 'selected' : ''}" type="button" data-select-odd="${m.id}" data-odd-key="X">
                  <span class="fbet-odd-label">X (Empate)</span>
                  <span class="fbet-odd-val">${m.odds["X"].toFixed(2)}</span>
                </button>

                <button class="fbet-odd-btn ${this.selectedMatch?.id === m.id && this.selectedOddKey === '2' ? 'selected' : ''}" type="button" data-select-odd="${m.id}" data-odd-key="2">
                  <span class="fbet-odd-label">2 (${m.team2.name})</span>
                  <span class="fbet-odd-val">${m.odds["2"].toFixed(2)}</span>
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      `;

      let slipHTML = "";
      if (this.selectedMatch && this.selectedOddKey) {
        const selObj = this.selectedMatch;
        const oVal = selObj.odds[this.selectedOddKey];
        const labelStr = this.selectedOddKey === '1' ? selObj.team1.name : this.selectedOddKey === 'X' ? 'Empate' : selObj.team2.name;
        
        const potWinUSD = (this.stakeUSDT * oVal).toFixed(2);
        const potWinGems = Math.round(this.stakeUSDT * oVal * TonUsdtContractConfig.rateGemsPerWinUSD);

        slipHTML = `
          <div class="fbet-slip-minimal" id="active-bet-slip">
            <div class="fbet-slip-header">
              <span>⚡ Boleta Web3 USDT (TON)</span>
              <button style="background:transparent; border:none; color:#ff4545; cursor:pointer; font-weight:bold;" type="button" id="clear-slip-btn">✕ Cancelar</button>
            </div>

            <div class="fbet-slip-content">
              <div class="fbet-slip-selection">
                <b>${selObj.team1.name} vs ${selObj.team2.name}</b>
                <span>Pronóstico: <strong>${labelStr} (Cuota ${oVal.toFixed(2)})</strong></span>
              </div>

              <div style="display:flex; align-items:center; gap:8px;">
                <input class="fbet-stake-minimal-inp" type="number" id="fbet-stake-inp" value="${this.stakeUSDT}" min="10" max="25000" step="5" />
                <span style="color:#ffe871; font-weight:bold; font-size:0.9rem;">USDT ($10+ mín)</span>
              </div>

              <div class="fbet-return-minimal">
                <span>Premio en Liquidación</span>
                <strong>🎁 ${potWinGems} GEMAS</strong>
                <span style="color:#39ff88;">($${potWinUSD} USD netos)</span>
              </div>
            </div>

            <button class="fbet-confirm-minimal-btn" type="button" id="pay-ton-usdt-btn">
              ⚡ Enviar ${this.stakeUSDT.toFixed(2)} USDT al Contrato en TON & Confirmar Boleto
            </button>
          </div>
        `;
      }

      return matchesHTML + slipHTML;
    }

    renderTicketsTab(ticketsList) {
      if (ticketsList.length === 0) {
        return `
          <div style="text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.5); font-size: 1rem;">
            <span style="font-size: 3rem; display:block; margin-bottom: 12px;">📑</span>
            No tienes boletos registrados.<br>¡Ve a Encuentros, elige tu ganador y haz tu depósito en USDT!
          </div>
        `;
      }

      return `
        <div class="fbet-tickets-minimal-grid">
          ${ticketsList.map(t => {
            let tagHTML = `<span class="fbet-status-minimal-badge active">🔥 En Juego Web3</span>`;
            let actionHTML = `
              <button style="background:#2a3f55; border:none; color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer;" type="button" data-sim-resolve="${t.id}">
                ⏩ Simular Fin (Supabase DB)
              </button>
            `;

            if (t.status === "won") {
              tagHTML = `<span class="fbet-status-minimal-badge won">🟢 ¡GANASTE!</span>`;
              actionHTML = `
                <button class="fbet-claim-minimal-btn" type="button" data-claim-win="${t.id}">
                  🎁 Reclamar ${t.prizeGems} Gemas al Balance
                </button>
              `;
            } else if (t.status === "claimed") {
              tagHTML = `<span class="fbet-status-minimal-badge" style="background:#1e2d3d; color:#fff;">🎁 Reclamado</span>`;
              actionHTML = `<span style="color:#39ff88; font-weight:bold;">💎 +${t.prizeGems} en Balance Final</span>`;
            } else if (t.status === "lost") {
              tagHTML = `<span class="fbet-status-minimal-badge lost">🔴 Perdido</span>`;
              actionHTML = `<span style="color:rgba(255,255,255,0.5); font-size:0.85rem;">Resultado: ${t.realResult || '0-2'}</span>`;
            }

            return `
              <div class="fbet-ticket-minimal-card ${t.status}">
                <div class="fbet-ticket-minimal-info">
                  <span style="font-family:monospace; color:#ffe871; font-size:0.8rem;">${t.id} · ⚡ Depósito: ${t.stakeUSDT.toFixed(2)} USDT (Contrato TON)</span>
                  <b>${t.matchName}</b>
                  <span>Pronóstico: <strong>${t.selectionLabel}</strong> (Cuota ${t.odds.toFixed(2)}) → Recompensa: 🎁 ${t.prizeGems} 💎 ($${t.winUSD.toFixed(2)})</span>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
                  ${tagHTML}
                  ${actionHTML}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    attachPostRenderListeners() {
      const overlay = this.overlayEl;

      overlay.querySelector("#fbet-modal-close-btn")?.addEventListener("click", () => this.closeModal());

      // Pestañas
      overlay.querySelectorAll("[data-fbet-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
          this.activeTab = btn.dataset.fbetTab;
          this.render();
        });
      });

      // Filtros rápidos
      overlay.querySelectorAll("[data-fcat]").forEach(btn => {
        btn.addEventListener("click", () => {
          this.activeFilter = btn.dataset.fcat;
          this.render();
        });
      });

      // Input buscador
      const searchInp = overlay.querySelector("#fbet-search-inp");
      if (searchInp) {
        searchInp.addEventListener("input", (e) => {
          this.searchQuery = e.target.value;
          this.render();
        });
        setTimeout(() => searchInp.focus(), 50);
      }

      // Selección en tarjeta
      overlay.querySelectorAll("[data-select-odd]").forEach(btn => {
        btn.addEventListener("click", () => {
          const mId = btn.dataset.selectOdd;
          const oKey = btn.dataset.oddKey;
          this.selectedMatch = this.matches.find(m => m.id === mId);
          this.selectedOddKey = oKey;
          this.render();
          
          setTimeout(() => {
            document.getElementById("active-bet-slip")?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        });
      });

      // Bet Slip Controles
      const stInp = overlay.querySelector("#fbet-stake-inp");
      if (stInp) {
        stInp.addEventListener("input", (e) => {
          this.stakeUSDT = Math.max(10, parseFloat(e.target.value) || 10);
          const selObj = this.selectedMatch;
          const oVal = selObj.odds[this.selectedOddKey];
          
          const potWinUSD = (this.stakeUSDT * oVal).toFixed(2);
          const potWinGems = Math.round(this.stakeUSDT * oVal * TonUsdtContractConfig.rateGemsPerWinUSD);

          const retEl = overlay.querySelector(".fbet-return-minimal strong");
          if(retEl) retEl.textContent = `🎁 ${potWinGems} GEMAS`;
          const retMetaEl = overlay.querySelector(".fbet-return-minimal span:nth-child(3)");
          if(retMetaEl) retMetaEl.textContent = `($${potWinUSD} USD netos)`;

          const confirmBtn = overlay.querySelector("#pay-ton-usdt-btn");
          if(confirmBtn) confirmBtn.textContent = `⚡ Enviar ${this.stakeUSDT.toFixed(2)} USDT al Contrato en TON & Confirmar Boleto`;
        });
      }

      overlay.querySelector("#clear-slip-btn")?.addEventListener("click", () => {
        this.selectedMatch = null;
        this.selectedOddKey = null;
        this.render();
      });

      // Pagar con TON Smart Contract USDT ($10 USDT mínimo estricto)
      overlay.querySelector("#pay-ton-usdt-btn")?.addEventListener("click", () => {
        if (this.stakeUSDT < 10 || !this.selectedMatch || !this.selectedOddKey) {
          alert("⚠️ El contrato inteligente solo procesa depósitos exactos de $10 USDT en adelante. Ninguna boleta menor a 10 USDT será procesada.");
          return;
        }

        const selObj = this.selectedMatch;
        const labelStr = this.selectedOddKey === '1' ? selObj.team1.name : this.selectedOddKey === 'X' ? 'Empate' : selObj.team2.name;
        
        const nanoAmount = Math.round(this.stakeUSDT * 1e6);
        const scAddress = TonUsdtContractConfig.contractAddress;
        
        // Disparamos deep link directo y creamos boleto
        try {
          window.open(`ton://transfer/${scAddress}?amount=${nanoAmount}&jetton=${TonUsdtContractConfig.jettonUsdtAddress}`, "_blank");
        } catch {}

        const winUSD = this.stakeUSDT * selObj.odds[this.selectedOddKey];
        const prizeGems = Math.round(winUSD * TonUsdtContractConfig.rateGemsPerWinUSD);

        BetDB.createTicket({
          matchId: selObj.id,
          matchName: `${selObj.team1.name} vs ${selObj.team2.name} (${selObj.competition})`,
          selectionKey: this.selectedOddKey,
          selectionLabel: labelStr,
          odds: selObj.odds[this.selectedOddKey],
          stakeUSDT: this.stakeUSDT,
          winUSD: winUSD,
          prizeGems: prizeGems,
          smartContract: scAddress
        });

        this.selectedMatch = null;
        this.selectedOddKey = null;
        this.activeTab = "tickets";
        this.render();

        if (typeof toast === "function") {
          toast(`⚡ ¡Boleto Web3 en USDT registrado y asegurado en Supabase DB! Transacción lanzada.`, true);
        }
      });

      // Simular Fin de Partido
      overlay.querySelectorAll("[data-sim-resolve]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tId = btn.dataset.simResolve;
          const list = BetDB.loadTickets();
          const tick = list.find(t => t.id === tId);
          if (!tick) return;

          const isWin = Math.random() > 0.35; 
          const newStatus = isWin ? "won" : "lost";
          const resStr = isWin ? `Acierto (${tick.selectionLabel})` : "Resultado Inesperado (1-2)";

          BetDB.updateTicketStatus(tId, newStatus, resStr);
          this.render();

          if (typeof toast === "function") {
            toast(isWin ? "🟢 ¡BOLETO ACERTADO A GANADOR! Reclama tu premio en Gemas." : "🔴 Boleta liquidada (Perdida).", isWin);
          }
        });
      });

      // Reclamar Gemas
      overlay.querySelectorAll("[data-claim-win]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tId = btn.dataset.claimWin;
          const claimedGems = BetDB.claimTicketPrize(tId);
          this.render();

          if (typeof toast === "function") {
            toast(`🎁 ¡Brillante! +${claimedGems} Gemas agregadas a tu balance en vivo. Disponibles en tu botón de retiros.`, true);
          }
        });
      });
    }

    initListeners() {
      document.addEventListener("click", (e) => {
        const invokeBtn = e.target.closest && (e.target.closest("#fbet-invoke-global-btn") || e.target.closest("[data-open-sports-bet]"));
        if (invokeBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.openModal();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new FutmundiBetApp());
  } else {
    new FutmundiBetApp();
  }
})();
