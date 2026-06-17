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
    rateGemsPerWinUSD: 32, // 32 gemas equivalen a 1 USDT/USD
    minimumStakeUSDT: 10,
    maximumStakeUSDT: 25000
  };

  const escapeHTML = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const shortAddress = (addr) => {
    const str = String(addr || "");
    return str.length > 18 ? `${str.slice(0, 8)}...${str.slice(-6)}` : str;
  };

  const formatUSDT = (num) => Number(num || 0).toFixed(2);

  // --- GESTOR HÍBRIDO DB (SUPABASE REMOTO & LOCAL) ---
  const BetDB = {
    getTicketsKey() { return "futmundi_bet_tickets_minimal_v7"; },
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
        const current = localStorage.getItem(this.getTicketsKey());
        if (current) return JSON.parse(current || "[]");

        // Migración suave desde la versión anterior para no perder boletos locales.
        const legacy = localStorage.getItem("futmundi_bet_tickets_minimal_v6");
        if (legacy) {
          const parsedLegacy = JSON.parse(legacy || "[]");
          localStorage.setItem(this.getTicketsKey(), JSON.stringify(parsedLegacy));
          return parsedLegacy;
        }
        return [];
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
      if (!matchItem.live || matchItem.elapsed <= 45) {
        matchItem.odds = Object.assign({}, matchItem.baseOdds);
        return matchItem;
      }

      const elapsed = matchItem.elapsed; 
      const parts = matchItem.score.split("-").map(x => parseInt(x.trim(), 10));
      const gHome = parts[0] !== undefined ? parts[0] : 0;
      const gAway = parts[1] !== undefined ? parts[1] : 0;

      let o1 = matchItem.baseOdds["1"];
      let oX = matchItem.baseOdds["X"];
      let o2 = matchItem.baseOdds["2"];

      const factor = (elapsed - 45) / 45; 
      
      if (gHome > gAway) {
        o1 = Math.max(1.02, +(o1 - (o1 - 1.02) * factor * 1.3).toFixed(2));
        oX = +(oX + oX * factor * 3.5).toFixed(2);
        o2 = +(o2 + o2 * factor * 6.0).toFixed(2);
      } else if (gAway > gHome) {
        o2 = Math.max(1.02, +(o2 - (o2 - 1.02) * factor * 1.3).toFixed(2));
        oX = +(oX + oX * factor * 3.5).toFixed(2);
        o1 = +(o1 + o1 * factor * 6.0).toFixed(2);
      } else {
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
      this.stakeUSDT = TonUsdtContractConfig.minimumStakeUSDT;
      this.activeTab = "matches";
      this.activeFilter = "world"; // world, all, leagues
      this.searchQuery = "";
      this.pendingDrafts = new Map();

      this.injectOverlay();
      this.injectInvokeButton();
      this.initListeners();
      this.installPaymentBridge();
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
            <h2 class="fbet-title"><span>⚡</span> FUTMUNDI APUESTAS · USDT TON</h2>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div class="fbet-balance-badge" title="Premios de apuestas: 32 gemas equivalen a 1 USDT">
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
          
          <input class="fbet-search-inp" type="text" id="fbet-search-inp" placeholder="🔍 Buscar por país o equipo (Ej: Brasil)..." value="${escapeHTML(this.searchQuery)}" />
        </div>

        <div class="fbet-matches-list">
          ${filtered.length === 0 ? `<div style="padding:30px 10px; text-align:center; color:rgba(255,255,255,0.5);">No se encontraron partidos para tu búsqueda.</div>` : ''}
          ${filtered.map(m => `
            <div class="fbet-match-card" data-match-id="${m.id}">
              <div class="fbet-match-header">
                <span>${escapeHTML(m.competition)}</span>
                ${m.live ? `<span class="fbet-live-dot">${escapeHTML(m.minuteStr)} en juego</span>` : `<span>📅 ${escapeHTML(m.minuteStr)}</span>`}
              </div>

              <div class="fbet-competitors-row">
                <div class="fbet-team-compact">
                  <span class="fbet-team-flag">${escapeHTML(m.team1.flag)}</span>
                  <span class="fbet-team-name">${escapeHTML(m.team1.name)}</span>
                </div>

                <div class="fbet-score-compact">${escapeHTML(m.score)}</div>

                <div class="fbet-team-compact right">
                  <span class="fbet-team-flag">${escapeHTML(m.team2.flag)}</span>
                  <span class="fbet-team-name">${escapeHTML(m.team2.name)}</span>
                </div>
              </div>

              <div class="fbet-odds-compact-grid">
                <button class="fbet-odd-btn ${this.selectedMatch?.id === m.id && this.selectedOddKey === '1' ? 'selected' : ''}" type="button" data-select-odd="${escapeHTML(m.id)}" data-odd-key="1">
                  <span class="fbet-odd-label">1 (${escapeHTML(m.team1.name)})</span>
                  <span class="fbet-odd-val">${m.odds["1"].toFixed(2)}</span>
                </button>

                <button class="fbet-odd-btn ${this.selectedMatch?.id === m.id && this.selectedOddKey === 'X' ? 'selected' : ''}" type="button" data-select-odd="${escapeHTML(m.id)}" data-odd-key="X">
                  <span class="fbet-odd-label">X (Empate)</span>
                  <span class="fbet-odd-val">${m.odds["X"].toFixed(2)}</span>
                </button>

                <button class="fbet-odd-btn ${this.selectedMatch?.id === m.id && this.selectedOddKey === '2' ? 'selected' : ''}" type="button" data-select-odd="${escapeHTML(m.id)}" data-odd-key="2">
                  <span class="fbet-odd-label">2 (${escapeHTML(m.team2.name)})</span>
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
              <span>🎫 Ticket de apuesta Web3</span>
              <button style="background:transparent; border:none; color:#ff4545; cursor:pointer; font-weight:bold;" type="button" id="clear-slip-btn">✕ Cancelar</button>
            </div>

            <div class="fbet-slip-content">
              <div class="fbet-slip-selection">
                <b>${escapeHTML(selObj.team1.name)} vs ${escapeHTML(selObj.team2.name)}</b>
                <span>Pronóstico: <strong>${escapeHTML(labelStr)} (Cuota ${oVal.toFixed(2)})</strong></span>
              </div>

              <div style="display:flex; align-items:center; gap:8px;">
                <input class="fbet-stake-minimal-inp" type="number" id="fbet-stake-inp" value="${this.stakeUSDT}" min="10" max="25000" step="5" />
                <span style="color:#ffe871; font-weight:bold; font-size:0.9rem;">USDT · mínimo 10</span>
              </div>

              <div class="fbet-return-minimal">
                <span>Premio si aciertas</span>
                <strong>🎁 ${potWinGems} GEMAS</strong>
                <span style="color:#39ff88;">$${potWinUSD} USDT aprox. · 32 💎 = 1 USDT</span>
              </div>
            </div>

            <button class="fbet-confirm-minimal-btn" type="button" id="pay-ton-usdt-btn">
              🎫 Abrir ticket y pagar ${this.stakeUSDT.toFixed(2)} USDT
            </button>
            <div class="fbet-slip-contract-note">
              Contrato inteligente pool USDT TON:<br>
              <code>${escapeHTML(TonUsdtContractConfig.contractAddress)}</code>
            </div>
          </div>
        `;
      }

      return matchesHTML + slipHTML;
    }

    renderTicketsTab(ticketsList) {
      if (ticketsList.length === 0) {
        return `
          <div class="fbet-empty-state">
            <span>📑</span>
            <b>No tienes boletos registrados.</b>
            <small>Ve a Encuentros, elige Equipo A / Empate / Equipo B y abre tu ticket para pagar en USDT.</small>
          </div>
        `;
      }

      const canResolveLocally = (typeof window.isAdmin === "function" && window.isAdmin()) || localStorage.getItem("fbet_debug_resolve") === "1";

      return `
        <div class="fbet-tickets-minimal-grid">
          ${ticketsList.map(t => {
            const contract = t.smartContract || TonUsdtContractConfig.contractAddress;
            const paymentStatus = t.paymentStatus || "pending_chain_confirmation";
            let tagHTML = `<span class="fbet-status-minimal-badge active">⏳ En juego</span>`;
            let actionHTML = `
              <span class="fbet-ticket-waiting-note">
                Resultado pendiente<br>
                <small>Solo se liquida cuando termine el partido oficial.</small>
              </span>
            `;

            if (canResolveLocally && t.status === "active") {
              actionHTML += `
                <button class="fbet-dev-resolve-btn" type="button" data-sim-resolve="${escapeHTML(t.id)}" title="Solo debug/admin">
                  Debug: liquidar
                </button>
              `;
            }

            if (t.status === "won") {
              tagHTML = `<span class="fbet-status-minimal-badge won">🟢 ¡GANASTE!</span>`;
              actionHTML = `
                <button class="fbet-claim-minimal-btn" type="button" data-claim-win="${escapeHTML(t.id)}">
                  🎁 Reclamar ${Number(t.prizeGems || 0).toLocaleString()} Gemas
                </button>
              `;
            } else if (t.status === "claimed") {
              tagHTML = `<span class="fbet-status-minimal-badge claimed">🎁 Reclamado</span>`;
              actionHTML = `<span class="fbet-ticket-claimed-note">💎 +${Number(t.prizeGems || 0).toLocaleString()} en balance</span>`;
            } else if (t.status === "lost") {
              tagHTML = `<span class="fbet-status-minimal-badge lost">🔴 Perdido</span>`;
              actionHTML = `<span class="fbet-ticket-lost-note">Resultado: ${escapeHTML(t.realResult || 'Oficial')}<br><small>Si perdió, no hay reclamo.</small></span>`;
            }

            return `
              <div class="fbet-ticket-minimal-card ${escapeHTML(t.status)}">
                <div class="fbet-ticket-minimal-info">
                  <span class="fbet-ticket-id-line">${escapeHTML(t.id)} · Depósito: ${formatUSDT(t.stakeUSDT)} USDT · ${paymentStatus === 'confirmed' ? 'Pago confirmado' : 'Pago enviado / por verificar'}</span>
                  <b>${escapeHTML(t.matchName)}</b>
                  <span>Pronóstico: <strong>${escapeHTML(t.selectionLabel)}</strong> · Cuota ${Number(t.odds || 0).toFixed(2)}</span>
                  <span>Premio si acierta: <strong>${Number(t.prizeGems || 0).toLocaleString()} 💎</strong> (${formatUSDT(t.winUSD)} USDT aprox.) · 32 💎 = 1 USDT</span>
                  <code class="fbet-contract-pill" title="${escapeHTML(contract)}">Contrato pool USDT TON: ${escapeHTML(shortAddress(contract))}</code>
                </div>

                <div class="fbet-ticket-actions">
                  ${tagHTML}
                  ${actionHTML}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    normalizeStake(value) {
      const raw = Number(value);
      if (!Number.isFinite(raw)) return TonUsdtContractConfig.minimumStakeUSDT;
      return Math.min(TonUsdtContractConfig.maximumStakeUSDT, Math.max(TonUsdtContractConfig.minimumStakeUSDT, raw));
    }

    getPendingDraftStorageKey() {
      return "futmundi_bet_pending_drafts_v1";
    }

    savePendingDraft(draft) {
      this.pendingDrafts.set(draft.id, draft);
      try {
        const key = this.getPendingDraftStorageKey();
        const all = JSON.parse(localStorage.getItem(key) || "{}");
        all[draft.id] = draft;
        localStorage.setItem(key, JSON.stringify(all));
      } catch {}
    }

    loadPendingDraft(draftId) {
      if (this.pendingDrafts.has(draftId)) return this.pendingDrafts.get(draftId);
      try {
        const all = JSON.parse(localStorage.getItem(this.getPendingDraftStorageKey()) || "{}");
        return all[draftId] || null;
      } catch {
        return null;
      }
    }

    removePendingDraft(draftId) {
      this.pendingDrafts.delete(draftId);
      try {
        const key = this.getPendingDraftStorageKey();
        const all = JSON.parse(localStorage.getItem(key) || "{}");
        delete all[draftId];
        localStorage.setItem(key, JSON.stringify(all));
      } catch {}
    }

    buildDraftFromSelection() {
      if (!this.selectedMatch || !this.selectedOddKey) return null;
      const selObj = this.selectedMatch;
      const odds = Number(selObj.odds[this.selectedOddKey]);
      const stake = this.normalizeStake(this.stakeUSDT);
      const selectionLabel = this.selectedOddKey === '1' ? selObj.team1.name : this.selectedOddKey === 'X' ? 'Empate' : selObj.team2.name;
      const winUSD = +(stake * odds).toFixed(2);
      const prizeGems = Math.round(winUSD * TonUsdtContractConfig.rateGemsPerWinUSD);
      const draftId = "FBET-" + Math.floor(100000 + Math.random() * 900000);
      return {
        id: draftId,
        createdAt: Date.now(),
        matchId: selObj.id,
        competition: selObj.competition,
        matchName: `${selObj.team1.name} vs ${selObj.team2.name}`,
        fullMatchName: `${selObj.team1.name} vs ${selObj.team2.name} (${selObj.competition})`,
        selectionKey: this.selectedOddKey,
        selectionLabel,
        odds,
        stakeUSDT: stake,
        winUSD,
        prizeGems,
        contractAddress: TonUsdtContractConfig.contractAddress,
        jettonUsdtAddress: TonUsdtContractConfig.jettonUsdtAddress,
        wallet: (window.STATE && window.STATE.tonWallet) || "Wallet TON no conectada",
        memo: `FUTMUNDI BET ${draftId}`,
        amountUnits: Math.round(stake * 1e6)
      };
    }

    buildTonPaymentUrl(draft) {
      const params = new URLSearchParams({
        amount: String(draft.amountUnits),
        jetton: draft.jettonUsdtAddress,
        text: draft.memo
      });
      return `ton://transfer/${draft.contractAddress}?${params.toString()}`;
    }

    openTicketPaymentWindow() {
      if (this.stakeUSDT < TonUsdtContractConfig.minimumStakeUSDT || !this.selectedMatch || !this.selectedOddKey) {
        alert("⚠️ El mínimo de apuesta es 10 USDT. Selecciona partido, pronóstico y monto válido.");
        return;
      }

      this.stakeUSDT = this.normalizeStake(this.stakeUSDT);

      if (!window.STATE || !window.STATE.tonWallet) {
        const go = confirm("Para asociar tu ticket a tu cuenta debes conectar tu wallet TON.\n\n¿Quieres continuar abriendo el ticket de pago igualmente?");
        if (!go) {
          try { window.tonConnectUI && window.tonConnectUI.openModal(); } catch {}
          return;
        }
      }

      const draft = this.buildDraftFromSelection();
      if (!draft) return;
      this.savePendingDraft(draft);

      const popup = window.open("", "_blank", "width=460,height=760,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes");
      if (!popup) {
        alert("Tu navegador bloqueó la ventana del ticket. Permite ventanas emergentes para FUTMUNDI y vuelve a tocar 'Abrir ticket y pagar'.");
        return;
      }

      this.writeTicketWindow(popup, draft);
    }

    writeTicketWindow(popup, draft) {
      const payUrl = this.buildTonPaymentUrl(draft);
      const confirmPayload = JSON.stringify({ type: "fbet:confirm-draft", draftId: draft.id });
      const safe = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, escapeHTML(v)]));
      const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket FUTMUNDI ${safe.id}</title>
<style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#e8f5e2;background:radial-gradient(circle at 30% 0%,rgba(57,255,136,.14),transparent 32%),linear-gradient(160deg,#06110b,#0b1410 50%,#030604);padding:18px}.ticket{max-width:460px;margin:auto;background:linear-gradient(180deg,rgba(21,36,25,.98),rgba(7,13,9,.98));border:1px solid #39ff88;border-radius:22px;box-shadow:0 18px 60px rgba(0,0,0,.55),0 0 30px rgba(57,255,136,.14);overflow:hidden}.top{padding:18px;background:#0e1a12;border-bottom:1px solid rgba(57,255,136,.25)}.top small{color:#39ff88;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.top h1{margin:6px 0 0;font-size:1.35rem;color:#ffe871}.body{padding:18px;display:grid;gap:14px}.row{display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(0,0,0,.22)}.row span{color:rgba(232,245,226,.68);font-size:.82rem}.row b{text-align:right;color:#fff}.highlight{border-color:#ffe871;background:rgba(255,232,113,.08)}.highlight b{color:#ffe871}.contract{padding:13px;border:1px dashed #39ff88;border-radius:14px;background:rgba(57,255,136,.07)}.contract span{display:block;color:#39ff88;font-weight:900;margin-bottom:8px}.contract code{display:block;word-break:break-all;color:#fff;font-size:.86rem;line-height:1.45}.note{font-size:.84rem;line-height:1.45;color:rgba(232,245,226,.74);background:rgba(63,191,255,.08);border:1px solid rgba(63,191,255,.22);padding:12px;border-radius:14px}.actions{display:grid;gap:10px}.btn{width:100%;border:0;border-radius:13px;padding:13px 12px;font-weight:950;text-transform:uppercase;letter-spacing:.05em;cursor:pointer}.pay{background:#ffe871;color:#041006}.confirm{background:#39ff88;color:#041006}.ghost{background:transparent;border:1px solid rgba(255,255,255,.22);color:#e8f5e2}.status{min-height:20px;color:#39ff88;text-align:center;font-weight:800;font-size:.85rem}.foot{text-align:center;color:rgba(232,245,226,.52);font-size:.75rem;padding:0 18px 18px}.warn{color:#ffcf71}
</style>
</head>
<body>
  <main class="ticket">
    <section class="top"><small>FUTMUNDI · Ticket de apuesta</small><h1>${safe.id}</h1></section>
    <section class="body">
      <div class="row"><span>Partido</span><b>${safe.matchName}</b></div>
      <div class="row"><span>Competición</span><b>${safe.competition}</b></div>
      <div class="row highlight"><span>Tu selección</span><b>${safe.selectionLabel} · cuota ${Number(draft.odds).toFixed(2)}</b></div>
      <div class="row"><span>Monto a apostar</span><b>${formatUSDT(draft.stakeUSDT)} USDT</b></div>
      <div class="row"><span>Premio si aciertas</span><b>${Number(draft.prizeGems).toLocaleString()} 💎<br><small>${formatUSDT(draft.winUSD)} USDT aprox.</small></b></div>
      <div class="contract"><span>Contrato inteligente / pool de liquidez USDT TON</span><code id="contract">${safe.contractAddress}</code></div>
      <div class="note"><b>Regla de pago:</b> paga desde tu wallet TON en USDT Jetton al contrato mostrado. <b>32 gemas equivalen a 1 USDT.</b><br><br><span class="warn">El resultado y el reclamo solo estarán disponibles cuando termine el partido.</span></div>
      <div class="actions">
        <button class="btn pay" type="button" onclick="payWallet()">⚡ Pagar ${formatUSDT(draft.stakeUSDT)} USDT desde wallet TON</button>
        <button class="btn confirm" type="button" onclick="confirmTicket()">✅ Ya pagué / registrar boleto</button>
        <button class="btn ghost" type="button" onclick="copyContract()">Copiar contrato</button>
      </div>
      <div id="status" class="status"></div>
    </section>
    <div class="foot">Memo sugerido: ${safe.memo}</div>
  </main>
<script>
  const payUrl = ${JSON.stringify(payUrl)};
  function payWallet(){
    document.getElementById('status').textContent = 'Abriendo wallet TON...';
    window.location.href = payUrl;
  }
  function confirmTicket(){
    document.getElementById('status').textContent = 'Registrando boleto en FUTMUNDI...';
    if(window.opener && !window.opener.closed){ window.opener.postMessage(${confirmPayload}, '*'); }
    setTimeout(function(){ window.close(); }, 650);
  }
  function copyContract(){
    const c = document.getElementById('contract').textContent;
    if(navigator.clipboard){ navigator.clipboard.writeText(c); }
    document.getElementById('status').textContent = 'Contrato copiado.';
  }
<\/script>
</body>
</html>`;
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      try { popup.focus(); } catch {}
    }

    confirmDraftPayment(draftId) {
      const draft = this.loadPendingDraft(draftId);
      if (!draft) {
        alert("No se encontró el ticket temporal. Vuelve a seleccionar la apuesta.");
        return;
      }

      BetDB.createTicket({
        matchId: draft.matchId,
        matchName: draft.fullMatchName,
        selectionKey: draft.selectionKey,
        selectionLabel: draft.selectionLabel,
        odds: Number(draft.odds),
        stakeUSDT: Number(draft.stakeUSDT),
        winUSD: Number(draft.winUSD),
        prizeGems: Number(draft.prizeGems),
        smartContract: draft.contractAddress,
        jettonUsdtAddress: draft.jettonUsdtAddress,
        paymentMemo: draft.memo,
        paymentStatus: "pending_chain_confirmation"
      });

      this.removePendingDraft(draftId);
      this.selectedMatch = null;
      this.selectedOddKey = null;
      this.activeTab = "tickets";
      this.render();

      if (typeof toast === "function") {
        toast("🎫 Boleto registrado. Queda activo hasta que el partido termine y se liquide oficialmente.", true);
      }
    }

    installPaymentBridge() {
      window.FUTMUNDI_BET_CONFIRM_DRAFT = (draftId) => this.confirmDraftPayment(draftId);
      window.addEventListener("message", (ev) => {
        const data = ev && ev.data;
        if (!data || typeof data !== "object") return;
        if (data.type === "fbet:confirm-draft" && data.draftId) {
          this.confirmDraftPayment(String(data.draftId));
        }
      });
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
          this.stakeUSDT = this.normalizeStake(parseFloat(e.target.value) || TonUsdtContractConfig.minimumStakeUSDT);
          const selObj = this.selectedMatch;
          const oVal = selObj.odds[this.selectedOddKey];
          
          const potWinUSD = (this.stakeUSDT * oVal).toFixed(2);
          const potWinGems = Math.round(this.stakeUSDT * oVal * TonUsdtContractConfig.rateGemsPerWinUSD);

          const retEl = overlay.querySelector(".fbet-return-minimal strong");
          if(retEl) retEl.textContent = `🎁 ${potWinGems} GEMAS`;
          const retMetaEl = overlay.querySelector(".fbet-return-minimal span:nth-child(3)");
          if(retMetaEl) retMetaEl.textContent = `$${potWinUSD} USDT aprox. · 32 💎 = 1 USDT`;

          const confirmBtn = overlay.querySelector("#pay-ton-usdt-btn");
          if(confirmBtn) confirmBtn.textContent = `🎫 Abrir ticket y pagar ${this.stakeUSDT.toFixed(2)} USDT`;
        });
      }

      overlay.querySelector("#clear-slip-btn")?.addEventListener("click", () => {
        this.selectedMatch = null;
        this.selectedOddKey = null;
        this.render();
      });

      // Abrir ticket de pago en una ventana nueva antes de registrar el boleto
      overlay.querySelector("#pay-ton-usdt-btn")?.addEventListener("click", () => {
        this.openTicketPaymentWindow();
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

  // Exponer DB para que el motor de juego y otras capas puedan sincronizar gemas
  window.BetDB = BetDB;
})();
