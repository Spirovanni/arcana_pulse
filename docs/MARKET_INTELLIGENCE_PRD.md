# Market Intelligence Layer — Product Requirements Document

**Product:** Arcana Pulse — Market Intelligence layer
**Status:** Draft, pre-Beads-epic
**Related:** `docs/Arcana_Pulse_PRD.md` (parent product PRD), `docs/AGENT_OPERATING_MODEL.md`, `docs/TRADING_RISK_POLICY.md`

---

## 1. Project description

Arcana Pulse already gives members a banking + finance-tracker cockpit (Plaid-linked accounts, Dwolla transfers, AI categorization) and an early investment surface (Plaid Investments, Alpaca paper account/positions/orders, tax-loss-harvesting suggestions). The **Market Intelligence layer** extends that surface into a sandboxed environment for watching markets, researching strategies, backtesting them against historical data, running them on paper, learning the underlying concepts, and getting alerted when something the member cares about happens.

It is explicitly **not** a live-trading product. Every execution path terminates at Alpaca's paper endpoint.

## 2. Strategic fit

This layer is the natural extension of the existing Investment & Portfolio milestone (M8 in `ROADMAP.md`) and the existing `algo-strategies` page, which today is a static, curated catalog of third-party MetaTrader EAs with mock ratings — useful for inspiration, not connected to the platform's own data or paper account. Market Intelligence turns that catalog into something a member can actually act on, safely:

- connect strategy ideas to real (paper) market data instead of marketing copy,
- let members backtest before they paper-trade,
- close the loop with alerts so research isn't a one-time visit,
- and reinforce the platform's financial-literacy mission (it sits next to, not instead of, the existing `/intelligence/career` financial-education track).

## 3. Vision

Give a member a single place to ask "what would this idea have done, and what is the market doing right now," test it without risk, and get told when it matters — all inside the same workspace-scoped, audited platform that already handles their banking.

## 4. Positioning

**One sentence:** A sandboxed research, backtesting, paper-trading, and alerting workspace for Arcana Pulse members — education and simulation, not a brokerage.

**What it is not:** a signal service, a live-trading bot, or investment advice. Every output is labeled `educational`, `simulated`, or `paper-trading` (`docs/AGENT_OPERATING_MODEL.md` §2.7).

## 5. Problem statement

Members currently have three disconnected options: read about strategies on forums/marketplaces (no data, no proof), use a real brokerage's paper mode (no integration with their actual Arcana financial picture), or do nothing. Arcana Pulse can offer a middle path that's tied to the same workspace, dashboard, and AI assistant members already use — but only if it's built with the same rigor as the banking layer: workspace isolation, audit logs, and a hard wall against real execution.

## 6. Personas

| Persona | Need |
|---|---|
| **Curious member** | Wants to understand what a strategy idea would have done historically, with no risk |
| **Paper trader** | Wants to run a strategy (manually or rule-based) against a live paper account and track results |
| **Financial-literacy track member** | Connects to the existing career/advisor-track pages — strategy education feeds licensing/coaching content |
| **Risk-aware admin** (internal) | Needs audit visibility into every simulated/paper action across workspaces |

## 7. Feature catalog

### A. Market Watch
Live (paper-feed) quotes, watchlists, basic charting. Workspace-scoped. Built on `src/lib/alpaca.ts` market-data calls; see `docs/MARKET_DATA_PROVIDERS.md` for source detail.

### B. Strategy Research
Evolves `algo-strategies` from a static third-party catalog into a connected experience: members can still browse curated ideas, but can also define their own rule-based strategy and see it alongside real data. Spec: `docs/STRATEGY_ENGINE_SPEC.md`.

### C. Backtesting
Run a defined strategy against historical data and get back computed (never estimated) performance metrics, clearly labeled `simulated`. Spec: `docs/STRATEGY_ENGINE_SPEC.md`.

### D. Paper Trading Execution
Deploy a strategy — or place a manual order — against the Alpaca **paper** account, gated by human confirmation and audit-logged. Service name and setup: `docs/PAPERCLIP_SETUP.md`.

### E. Alerts
Threshold/signal-based notifications (price moves, strategy signals, risk-limit breaches) delivered via the existing in-app notification surface and email. Service name and setup: `docs/HERMES_SETUP.md`.

### F. Education
Contextual explainers on strategy mechanics, risk terms, and backtest statistics, reusing the existing Anthropic AI integration (`src/lib/services/ai/`) under the Education Agent role defined in `docs/AGENT_OPERATING_MODEL.md`.

## 8. Non-goals

- Live trading or any code path that can reach `https://api.alpaca.markets` (non-paper) trading endpoints.
- Investment advice. Output is informational/educational only — see `legal_and_financial_advice` posture in product-wide guidance.
- Autonomous order placement without a human confirmation step.
- A second data layer outside Appwrite, or a second auth stack.

## 9. Dependencies on existing systems

- `src/lib/alpaca.ts`, `src/app/api/alpaca/*` — paper account, positions, orders, assets, portfolio history (already implemented; order route has a gating gap, see `docs/TRADING_RISK_POLICY.md` §3)
- `src/app/(root)/portfolio/page.tsx` — existing portfolio UI to extend rather than fork
- `src/app/(root)/algo-strategies/page.tsx` — existing curated catalog to evolve
- `src/lib/services/notifications.ts` — existing in-app notification store to extend for Hermes
- `src/lib/services/db/auditLog.ts` — existing audit log to extend with new event types
- `src/lib/resilience/circuit-breaker.ts`, `retry.ts` — existing resilience wrappers for any new external data calls

## 10. Proposed milestone mapping

Following the existing `ROADMAP.md` numbering (current milestones run through M10), this layer is proposed as a new milestone. Actual Beads epics/issues should be created via `bd create` per `AGENTS.md` — the breakdown below is a starting point, not a substitute for that.

**Milestone 11 — Market Intelligence**
1. Risk policy + agent operating model sign-off (this doc set) — prerequisite for all following work
2. Remediate `/api/alpaca/orders` gating gap (auth, workspace scope, approval, audit) — blocks everything else that calls it
3. Market Watch (watchlists, quotes)
4. Strategy data model + Appwrite collections
5. Backtesting engine (read-only, no execution)
6. Paper execution service ("Paperclip") wrapping the now-remediated order route
7. Alerts service ("Hermes") on top of `notifications.ts`
8. Education content surfaced in strategy/backtest UI

Items 2 and 6 both touch order placement and should be reviewed against `docs/TRADING_RISK_POLICY.md` before any code is written.

## 11. Success metrics

To be defined with product/business stakeholders before M11 kicks off — not fabricated here. Candidates to validate: backtest-to-paper-deploy conversion rate, alert engagement rate, education content completion rate. Do not report these as live numbers until instrumentation exists to compute them.

## 12. Open questions

- **Paperclip's single-account architecture:** today's Alpaca integration has one paper account for the whole deployment, not one per workspace. `docs/PAPERCLIP_SETUP.md` §3 lays out a shadow-ledger stopgap vs. a per-workspace Broker API account as the long-term fix — needs a product/eng decision before Paperclip ships past a single-workspace demo.
- Should Strategy Research fully replace the third-party EA catalog, or run alongside it?
- Does Education content live inside Market Intelligence or get cross-linked from the existing `/intelligence/career` track?

## 13. Risks

See `docs/TRADING_RISK_POLICY.md` for the full risk treatment. Top-line: the existing paper order route is currently callable without auth or workspace scoping — this is a real gap, not a hypothetical, and must be closed before this layer ships anything user-facing that can reach it.
