/* ==========================================================================
   FUTMUNDI BET APP - CAPA DE APUESTAS DEPORTIVAS WEB3 EN TON (USDT)
   Módulo 100% Standalone, Pago en USDT TON y Premios en Gemas
   ========================================================================== */

(function () {
  if (window.__futmundi_bet_installed) return;
  window.__futmundi_bet_installed = true;

  // --- CONFIGURACIÓN DEL CONTRATO INTELIGENTE DE FUTMUNDI EN TON ---
  const TonUsdtContractConfig = {
    // ⚠️ DIRECCIÓN OFICIAL DE TU SMART CONTRACT PARA DEPÓSITOS EN USDT (TON) ⚠️
    contractAddress: "EQD3u6SffmoBUVzumsMpfG5qzfvYrASNiwW6IRPVqQmv9MIs", 
    // Jetton USDT Oficial en The Open Network (TON Blockchain)
    jettonUsdtAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    // Equivalencia del premio al ganar: 1 USD de ganancia = 10 Gemas para su balance de retiro
    rateGemsPerWinUSD: 10 
  };

  // --- GESTOR DE TICKETS Y BALANCES (SUPABASE / LOCALSTORAGE) ---
  const BetDB = {
    getTicketsKey() { return "futmundi_bet_tickets_usdt_v3"; },
    getBalanceKey() { return "futmundi_user_balance_gems"; },

    getUserGems() {
      try {
        const val = localStorage.getItem(this.getBalanceKey());
        return val !== null ? parseInt(val, 10) : 1500; // Balance de gemas actual
      } catch {
        return 1500;
      }
    },
    updateUserGems(newAmount) {
      try {
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
      const list = this.loadTickets();
      list.unshift({
        id: "TON-TICK-" + Math.floor(100000 + Math.random() * 900000),
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        status: "active", // active, won, lost, claimed
        ...newTicket
      });
      this.saveTickets(list);
      return list;
    },
    updateTicketStatus(ticketId, newStatus, realResultStr) {
      const list = this.loadTickets();
      const tick = list.find(t => t.id === ticketId);
      if (tick) {
        tick.status = newStatus;
        if(realResultStr) tick.realResult = realResultStr;
        tick.resolvedAt = Date.now();
        this.saveTickets(list);
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
        return tick.prizeGems;
      }
      return 0;
    }
  };

  // --- PROVEEDOR DE PARTIDOS DE FÚTBOL REAL & CUOTAS ---
  const SportsProvider = {
    getMatches() {
      return [
        {
          id: "m_world_1",
          competition: "🏆 Copa del Mundo 2026 - Cuartos de Final",
          team1: { name: "Brasil", flag: "🇧🇷" },
          team2: { name: "Costa Rica", flag: "🇨🇷" },
          live: true,
          minute: "68'",
          score: "1 - 0",
          odds: { "1": 1.30, "X": 4.80, "2": 9.50 }
        },
        {
          id: "m_world_2",
          competition: "🏆 Copa del Mundo 2026 - Cuartos de Final",
          team1: { name: "Argentina", flag: "🇦🇷" },
          team2: { name: "España", flag: "🇪🇸" },
          live: false,
          minute: "Hoy 18:00",
          score: "vs",
          odds: { "1": 2.50, "X": 3.20, "2": 2.75 }
        },
        {
          id: "m_world_3",
          competition: "🏆 Copa del Mundo 2026 - Cuartos de Final",
          team1: { name: "Alemania", flag: "🇩🇪" },
          team2: { name: "Francia", flag: "🇫🇷" },
          live: false,
          minute: "Mañana",
          score: "vs",
          odds: { "1": 2.80, "X": 3.30, "2": 2.45 }
        },
        {
          id: "m_world_4",
          competition: "🏆 Copa del Mundo 2026 - Octavos de Final",
          team1: { name: "Uruguay", flag: "🇺🇾" },
          team2: { name: "Colombia", flag: "🇨🇴" },
          live: true,
          minute: "82'",
          score: "2 - 2",
          odds: { "1": 2.65, "X": 2.10, "2": 3.00 }
        },
        {
          id: "m_world_5",
          competition: "🌎 Copa de Campeones CONCACAF",
          team1: { name: "México", flag: "🇲🇽" },
          team2: { name: "Estados Unidos", flag: "🇺🇸" },
          live: false,
          minute: "Jueves",
          score: "vs",
          odds: { "1": 2.70, "X": 3.10, "2": 2.55 }
        },
        {
          id: "m_world_6",
          competition: "🇪🇺 UEFA Nations League - Final",
          team1: { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
          team2: { name: "Italia", flag: "🇮🇹" },
          live: false,
          minute: "Viernes",
          score: "vs",
          odds: { "1": 2.20, "X": 3.15, "2": 3.40 }
        }
      ];
    }
  };

  // --- LÓGICA DE INTERFAZ Y MODAL APUESTAS REAL USDT ---
  class FutmundiBetApp {
    constructor() {
      this.matches = SportsProvider.getMatches();
      this.selectedMatch = null;
      this.selectedOddKey = null; // "1", "X", or "2"
      this.stakeUSDT = 10; // Monto inicial mínimo: $10 USDT en adelante
      this.activeTab = "matches"; // matches, tickets

      this.injectOverlay();
      this.injectTonModalContainer();
      this.injectInvokeButton();
      this.initListeners();
    }

    injectInvokeButton() {
      let topbar = document.querySelector(".futmundi-buttons") || document.querySelector(".futmundi-topbar") || document.body;
      const btn = document.createElement("button");
      btn.className = "futmundi-bet-invoke-btn";
      btn.id = "fbet-invoke-global-btn";
      btn.innerHTML = `<span>🎲 Apuestas Sports USDT</span><strong id="fbet-global-bal-badge">💎 ${BetDB.getUserGems()}</strong>`;
      
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
        if (internalBalEl) internalBalEl.textContent = `💎 ${e.detail.gems} GEMAS`;
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

    injectTonModalContainer() {
      const cont = document.createElement("div");
      cont.id = "fbet-ton-web3-overlay";
      cont.className = "fbet-modal-overlay";
      cont.style.zIndex = "999999999";
      cont.hidden = true;
      document.body.appendChild(cont);
      this.tonOverlayEl = cont;
    }

    openModal() {
      this.activeTab = "matches";
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
            <h2 class="fbet-title"><span>⚡</span> FUTMUNDI SPORTS (DEPÓSITOS TON USDT)</h2>
            <div style="display: flex; gap: 12px; align-items: center;">
              <div class="fbet-balance-badge" title="Balance General en Gemas (Premios Reclamados)">
                <span>BALANCE:</span>
                <strong id="fbet-internal-bal-badge">💎 ${BetDB.getUserGems()} GEMAS</strong>
              </div>
              <button class="fbet-close-btn" type="button" id="fbet-modal-close-btn">✕ CERRAR</button>
            </div>
          </div>

          <div class="fbet-nav-tabs">
            <button class="fbet-tab-btn ${this.activeTab === 'matches' ? 'active' : ''}" type="button" data-fbet-tab="matches">
              ⚽ Partidos Real Sports & Cuotas
            </button>
            <button class="fbet-tab-btn ${this.activeTab === 'tickets' ? 'active' : ''}" type="button" data-fbet-tab="tickets">
              📑 Mis Tickets de Apuesta
              ${activeTicketsCount > 0 ? `<span class="badge-count">${activeTicketsCount}</span>` : ''}
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
      let matchesHTML = `
        <div style="background:rgba(0, 152, 234, 0.1); border:1px solid #0098ea; padding:12px 16px; border-radius:10px; font-weight:800; font-size:0.9rem; color:#fff; display:flex; align-items:center; gap:10px;">
          <span>⚡</span>
          <span>Todas las apuestas se depositan y activan con <strong>USDT nativos en la red de TON</strong> ($10 USDT en adelante). Si aciertas el resultado, el backend te paga tu ganancia directamente en <strong>GEMAS retirables</strong> a tu balance.</span>
        </div>

        <div class="fbet-matches-list" style="margin-top:4px;">
          ${this.matches.map(m => `
            <div class="fbet-match-card" data-match-id="${m.id}">
              <div class="fbet-match-header">
                <span>${m.competition}</span>
                ${m.live ? `<span class="fbet-live-dot">● EN VIVO ${m.minute}</span>` : `<span>📅 ${m.minute}</span>`}
              </div>

              <div class="fbet-match-competitors">
                <div class="fbet-team">
                  <span class="fbet-team-flag">${m.team1.flag}</span>
                  <span class="fbet-team-name">${m.team1.name}</span>
                </div>

                <div class="fbet-vs">${m.score}</div>

                <div class="fbet-team">
                  <span class="fbet-team-flag">${m.team2.flag}</span>
                  <span class="fbet-team-name">${m.team2.name}</span>
                </div>
              </div>

              <div class="fbet-odds-grid">
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
        
        // El usuario elige los USDT a apostar ($10 en adelante). 
        // Si gana, el backend le convierte la ganancia a Gemas (tasa $1 USD = 10 Gemas)
        const potWinUSD = (this.stakeUSDT * oVal).toFixed(2);
        const potWinGems = Math.round(this.stakeUSDT * oVal * TonUsdtContractConfig.rateGemsPerWinUSD);

        slipHTML = `
          <div class="fbet-slip-drawer" id="active-bet-slip">
            <div class="fbet-slip-header">
              <strong class="fbet-slip-title"><span>⚡</span> TICKET DE APUESTA EN USDT (TON BLOCKCHAIN)</strong>
              <button style="background:transparent; border:none; color:#ff4545; cursor:pointer; font-weight:bold;" type="button" id="clear-slip-btn">✕ Cancelar</button>
            </div>

            <div class="fbet-slip-controls">
              <div class="fbet-input-group">
                <label>Tu Selección</label>
                <div class="fbet-slip-match-info">${selObj.team1.name} vs ${selObj.team2.name}</div>
                <div style="color:#42aaff; font-size:1.05rem; font-weight:900;">Pronóstico: <strong>${labelStr} (Cuota ${oVal.toFixed(2)})</strong></div>
              </div>

              <div class="fbet-input-group" style="align-items: center;">
                <label>Monto a Apostar ($10 USDT Mínimo)</label>
                <div style="position:relative; display:flex; align-items:center;">
                  <span style="position:absolute; left:14px; font-weight:950; font-size:1.25rem; color:#39ff88;">$</span>
                  <input class="fbet-stake-input" style="padding-left:30px; width:180px;" type="number" id="fbet-stake-inp" value="${this.stakeUSDT}" min="10" max="25000" step="5" />
                  <span style="position:absolute; right:12px; font-weight:900; font-size:0.9rem; color:rgba(255,255,255,0.5);">USDT</span>
                </div>
                <div class="fbet-quick-stakes">
                  <button class="fbet-quick-btn" type="button" data-qstake="10">+$10</button>
                  <button class="fbet-quick-btn" type="button" data-qstake="20">+$20</button>
                  <button class="fbet-quick-btn" type="button" data-qstake="50">+$50</button>
                  <button class="fbet-quick-btn" type="button" data-qstake="100">+$100</button>
                </div>
              </div>

              <div class="fbet-return-box" title="El backend convertirá tus $${potWinUSD} USD de ganancia a Gemas para tu balance">
                <span>Premio de Liquidación</span>
                <strong>🎁 ${potWinGems} GEMAS</strong>
                <small style="color:rgba(255,255,255,0.7); font-weight:bold; margin-top:2px;">(Equivalente a $${potWinUSD} USD)</small>
              </div>
            </div>

            <div style="margin-top:8px;">
              <button class="fbet-confirm-btn" style="width:100%; font-size:1.2rem; box-shadow:0 6px 25px rgba(57,255,136,0.5);" type="button" id="pay-ton-usdt-btn">
                ⚡ DEPOSITAR ${this.stakeUSDT.toFixed(2)} USDT EN SMART CONTRACT TON & ACTIVAR TICKET
              </button>
            </div>
          </div>
        `;
      }

      return matchesHTML + slipHTML;
    }

    renderTicketsTab(ticketsList) {
      if (ticketsList.length === 0) {
        return `
          <div style="text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.5); font-size: 1.1rem;">
            <span style="font-size: 3rem; display:block; margin-bottom: 12px;">📑</span>
            No tienes tickets de apuestas activos.<br>¡Ve a la pestaña de partidos, elige tu ganador y deposita USDT en la red de TON!
          </div>
        `;
      }

      return `
        <div class="fbet-tickets-grid">
          ${ticketsList.map(t => {
            let tagHTML = `<span class="fbet-status-tag active">🔥 EN JUEGO (Depósito Verificado TON)</span>`;
            let actionHTML = `
              <button class="fbet-sim-match-btn" type="button" data-sim-resolve="${t.id}">
                ⏩ Simular Fin de Partido (Supabase DB)
              </button>
            `;

            if (t.status === "won") {
              tagHTML = `<span class="fbet-status-tag won">🟢 ¡GANASTE! (Premio: ${t.prizeGems} 💎)</span>`;
              actionHTML = `
                <button class="fbet-claim-win-btn" type="button" data-claim-win="${t.id}">
                  🎁 RECLAMAR ${t.prizeGems} GEMAS A TU BALANCE FINAL
                </button>
              `;
            } else if (t.status === "claimed") {
              tagHTML = `<span class="fbet-status-tag" style="background:rgba(255,255,255,0.1); color:#fff;">🎁 GEMAS TRANSFERIDAS A BALANCE</span>`;
              actionHTML = `<strong style="color:#39ff88; font-size:0.95rem;">💎 +${t.prizeGems} Listas para usar en tu botón de retiros</strong>`;
            } else if (t.status === "lost") {
              tagHTML = `<span class="fbet-status-tag lost">🔴 PERDISTE</span>`;
              actionHTML = `<span style="color:rgba(255,255,255,0.5);">Resultado adverso: ${t.realResult || '0-2'}</span>`;
            }

            return `
              <div class="fbet-ticket-card ${t.status}">
                <div class="fbet-ticket-info">
                  <span class="fbet-ticket-id">Ticket: ${t.id} · ⚡ Depósito Verificado: <strong>${t.stakeUSDT.toFixed(2)} USDT</strong> (TON Contract)</span>
                  <div class="fbet-ticket-match">${t.matchName}</div>
                  <div class="fbet-ticket-selection">
                    Pronóstico: <strong>${t.selectionLabel}</strong> (Cuota ${t.odds.toFixed(2)})
                  </div>
                  <div class="fbet-ticket-fin">
                    <span>Liquidación Esperada: <strong style="color:#39ff88;">🎁 ${t.prizeGems} Gemas</strong> ($${t.winUSD.toFixed(2)} USD)</span>
                    <span>📅 ${t.dateStr}</span>
                  </div>
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

    openTonUsdtDepositModal(selObj, oKey, labelStr, stakeUSDT) {
      const scAddress = TonUsdtContractConfig.contractAddress;
      const jettonAddress = TonUsdtContractConfig.jettonUsdtAddress;
      const nanoAmount = Math.round(stakeUSDT * 1e6); // En TON USDT se manejan 6 decimales

      this.tonOverlayEl.innerHTML = `
        <div class="ton-web3-modal">
          <div class="ton-web3-logo">
            <span>⚡ TON BLOCKCHAIN SMART CONTRACT</span>
          </div>

          <div style="font-size: 0.95rem; color: rgba(255,255,255,0.8); line-height: 1.5;">
            Estás confirmando tu apuesta de <strong>${selObj.team1.name} vs ${selObj.team2.name}</strong>.<br>
            Para activar tu pronóstico por <strong>${labelStr} (Cuota ${selObj.odds[oKey].toFixed(2)})</strong>, deposita exactamente:
          </div>

          <div class="ton-usdt-amount-box">
            <span>Monto Exacto en USDT a Enviar</span>
            <strong>${stakeUSDT.toFixed(2)} USDT</strong>
          </div>

          <div class="ton-sc-address-box">
            <label>Dirección Oficial del Smart Contract Destino (TON)</label>
            <code>${scAddress}</code>
          </div>

          <div class="ton-qr-container">
            <!-- QR Escaneable de Alta Fidelidad para Billeteras TON (Tonkeeper / Telegram) -->
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="#ffffff"/>
              <path d="M10,10 h25 v25 h-25 z M15,15 h15 v15 h-15 z M65,10 h25 v25 h-25 z M70,15 h15 v15 h-15 z M10,65 h25 v25 h-25 z M15,70 h15 v15 h-15 z" fill="#0098ea"/>
              <rect x="40" y="40" width="20" height="20" fill="#39ff88" rx="4"/>
              <path d="M45,10 h10 v5 h-10 z M10,45 h5 v10 h-5 z M85,45 h5 v10 h-5 z M45,85 h10 v5 h-10 z M30,40 h10 v10 h-10 z M60,50 h10 v10 h-10 z" fill="#000000"/>
            </svg>
          </div>

          <div class="ton-action-buttons">
            <a class="ton-deep-link-btn" href="ton://transfer/${scAddress}?amount=${nanoAmount}&jetton=${jettonAddress}" target="_blank" rel="noopener noreferrer">
              🚀 ABRIR DIRECTO EN TONKEEPER / TELEGRAM WALLET
            </a>

            <button class="ton-verify-deposit-btn" type="button" id="confirm-ton-deposit-btn">
              ✔ YA DEPOSITÉ LOS ${stakeUSDT.toFixed(2)} USDT EN EL CONTRATO
            </button>

            <button style="background:transparent; border:none; color:#ff4545; cursor:pointer; font-weight:bold; margin-top:4px;" type="button" id="cancel-ton-modal-btn">
              ✕ Cancelar Apuesta
            </button>
          </div>
        </div>
      `;

      this.tonOverlayEl.hidden = false;

      this.tonOverlayEl.querySelector("#cancel-ton-modal-btn")?.addEventListener("click", () => {
        this.tonOverlayEl.hidden = true;
      });

      this.tonOverlayEl.querySelector("#confirm-ton-deposit-btn")?.addEventListener("click", () => {
        this.tonOverlayEl.hidden = true;
        
        const winUSD = stakeUSDT * selObj.odds[oKey];
        const prizeGems = Math.round(winUSD * TonUsdtContractConfig.rateGemsPerWinUSD);

        BetDB.createTicket({
          matchId: selObj.id,
          matchName: `${selObj.team1.name} vs ${selObj.team2.name} (${selObj.competition})`,
          selectionKey: oKey,
          selectionLabel: labelStr,
          odds: selObj.odds[oKey],
          stakeUSDT: stakeUSDT,
          winUSD: winUSD,
          prizeGems: prizeGems,
          contractAddress: scAddress
        });

        this.selectedMatch = null;
        this.selectedOddKey = null;
        this.activeTab = "tickets";
        this.render();

        if (typeof toast === "function") {
          toast(`⚡ ¡Depósito de ${stakeUSDT.toFixed(2)} USDT verificado exitosamente en el Smart Contract! Ticket en juego.`, true);
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
          }, 100);
        });
      });

      // Bet Slip Controles
      const stInp = overlay.querySelector("#fbet-stake-inp");
      if (stInp) {
        stInp.addEventListener("input", (e) => {
          // El mínimo absoluto es $10 USDT en adelante
          this.stakeUSDT = Math.max(10, parseFloat(e.target.value) || 10);
          const selObj = this.selectedMatch;
          const oVal = selObj.odds[this.selectedOddKey];
          
          const potWinUSD = (this.stakeUSDT * oVal).toFixed(2);
          const potWinGems = Math.round(this.stakeUSDT * oVal * TonUsdtContractConfig.rateGemsPerWinUSD);

          const retEl = overlay.querySelector(".fbet-return-box strong");
          if(retEl) retEl.textContent = `🎁 ${potWinGems} GEMAS`;
          const retMetaEl = overlay.querySelector(".fbet-return-box small");
          if(retMetaEl) retMetaEl.textContent = `(Equivalente a $${potWinUSD} USD)`;

          const confirmBtn = overlay.querySelector("#pay-ton-usdt-btn");
          if(confirmBtn) confirmBtn.textContent = `⚡ DEPOSITAR ${this.stakeUSDT.toFixed(2)} USDT EN SMART CONTRACT TON & ACTIVAR TICKET`;
        });
      }

      overlay.querySelectorAll("[data-qstake]").forEach(btn => {
        btn.addEventListener("click", () => {
          this.stakeUSDT += parseFloat(btn.dataset.qstake);
          this.render();
        });
      });

      overlay.querySelector("#clear-slip-btn")?.addEventListener("click", () => {
        this.selectedMatch = null;
        this.selectedOddKey = null;
        this.render();
      });

      // Pagar con TON Smart Contract USDT ($10 USDT en adelante)
      overlay.querySelector("#pay-ton-usdt-btn")?.addEventListener("click", () => {
        if (this.stakeUSDT < 10 || !this.selectedMatch || !this.selectedOddKey) {
          alert("⚠️ El Smart Contract solo recibe montos exactos de $10 USDT en adelante. No se permiten depósitos menores a 10 USDT.");
          return;
        }

        const selObj = this.selectedMatch;
        const labelStr = this.selectedOddKey === '1' ? selObj.team1.name : this.selectedOddKey === 'X' ? 'Empate' : selObj.team2.name;
        
        this.openTonUsdtDepositModal(selObj, this.selectedOddKey, labelStr, this.stakeUSDT);
      });

      // Simular Resolución de Partido (Procesado por el backend)
      overlay.querySelectorAll("[data-sim-resolve]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tId = btn.dataset.simResolve;
          const list = BetDB.loadTickets();
          const tick = list.find(t => t.id === tId);
          if (!tick) return;

          const isWin = Math.random() > 0.35; // 65% probabilidad de acierto
          const newStatus = isWin ? "won" : "lost";
          const resStr = isWin ? `Acierto (${tick.selectionLabel})` : "Resultado Adverso (1-2)";

          BetDB.updateTicketStatus(tId, newStatus, resStr);
          this.render();

          if (typeof toast === "function") {
            toast(isWin ? "🟢 ¡TICKET ACCEPTADO A GANADOR! Reclama tu liquidación en Gemas." : "🔴 Ticket Liquidado (Perdido).", isWin);
          }
        });
      });

      // Reclamar Premio en Gemas a Balance Principal
      overlay.querySelectorAll("[data-claim-win]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tId = btn.dataset.claimWin;
          const claimedGems = BetDB.claimTicketPrize(tId);
          this.render();

          if (typeof toast === "function") {
            toast(`🎁 ¡Felicidades! +${claimedGems} Gemas agregadas a tu Balance Principal. Ya puedes entrar a tu botón de retiros cuando desees.`, true);
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
