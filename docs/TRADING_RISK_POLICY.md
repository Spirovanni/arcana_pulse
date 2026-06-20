# Trading Risk Policy — Market Intelligence Layer

**Status:** Active policy. Applies to every code path that can read market data, run a strategy, place an order, or send a trading-related alert.
**Owners:** Product architecture + AI safety review (this doc), enforced in code review.
**Related:** `CLAUDE.md` §3, `docs/AGENT_OPERATING_MODEL.md`, `SECURITY.md`

---

## 1. Purpose

Define the controls that keep the Market Intelligence layer firmly inside "sandbox education and paper simulation" and out of "real money moves." This policy is binding on both human contributors and AI agents.

## 2. Scope

Applies to: `src/lib/alpaca.ts`, everything under `src/app/api/alpaca/*`, `algo-strategies`, `portfolio`, and any new strategy/backtest/paper-execution/alerts code introduced under the Market Intelligence layer (`docs/MARKET_INTELLIGENCE_PRD.md`).

## 3. Current state — known gap (read this before touching order code)

As of this writing, `src/app/api/alpaca/orders/route.ts`:

- `GET` and `POST` have **no `requireAuth()` call** — unlike every other route in `src/app/api/` (compare `src/lib/auth/withAuth.ts` usage elsewhere).
- `POST` has **no `workspaceId` scoping** — it submits whatever symbol/qty/side the request body contains directly to Alpaca's paper endpoint.
- Neither route writes to `logAuditEvent()` (`src/lib/services/db/auditLog.ts`).
- There is no confirmation/approval step between a request hitting this route and an order reaching Alpaca.

**This must be remediated before this route is reachable from any strategy, alert, or agent-initiated flow.** Required fix, in order:

1. Add `requireAuth(request, { requiredRole: "member" })` to both handlers.
2. Add `workspaceId` to the order record/audit entry (Alpaca itself has no concept of an Arcana workspace, so this is enforced at the Arcana layer, not Alpaca's).
3. Require a `confirmed: true` field set only after explicit user confirmation in the UI — reject silently-triggered submissions.
4. Call `logAuditEvent()` with a new `paper_order_submit` event type (see §6) on every successful `POST`.
5. Add a rate/size guard (see §4) before the Alpaca call.

This is the first ticket in Milestone 11 (`docs/MARKET_INTELLIGENCE_PRD.md` §10, item 2) and blocks every later item that depends on order placement.

## 4. Hard controls

| Control | Rule |
|---|---|
| Environment | `ALPACA_ENV` must be `paper` (the default in `src/lib/env.ts`). Flipping to `live` is an explicit, out-of-band human decision — never a code change made by an agent, never a feature flag a strategy can toggle. |
| Symbol/asset scope | Recommend an allow-list of liquid, listed equities/ETFs for any agent- or rule-driven order; reject anything outside it pending human review. |
| Position sizing | Recommend a configurable max-notional-per-order and max-open-positions-per-workspace limit, enforced server-side before the Alpaca call (not just in the UI). |
| Kill switch | Recommend a workspace-level "pause all paper trading" flag checked before every order submission, so an admin can halt activity without a deploy. |
| Idempotency | Reuse Alpaca's `client_order_id` to prevent duplicate submissions on retry (the resilience layer, `src/lib/resilience/retry.ts`, must not blindly retry a POST that already succeeded). |

None of the above exist in the codebase yet — they are requirements for the M11 work, not a description of current behavior.

## 5. Approval workflow

| Action | Trigger | Approver | Record |
|---|---|---|---|
| Submit a paper order | User clicks "Confirm" in UI (manual or strategy-deploy flow) | The user themselves, in-session | `paper_order_submit` audit entry |
| Cancel a paper order | User action | The user themselves | `paper_order_cancel` audit entry |
| Enable a new alert rule | User opts in per rule | The user themselves | `alert_rule_created` audit entry |
| Ship the order-route remediation (§3) | PR merge | Human reviewer | PR approval, CI security gates pass |
| Any future live-trading capability | N/A — not authorized under this policy | Requires a separate written authorization outside this repo's current scope | N/A |

An AI agent never substitutes for the "approver" column above. It can prepare the order/alert/PR for a human to approve; it cannot be the approval.

## 6. Audit trail — event taxonomy to add

Extend `src/lib/services/db/auditLog.ts`'s event types (it currently covers `sign_in`, `transaction_create`, `transfer_create`, etc. — see `SECURITY.md` §7) with:

| Event type | Logged fields |
|---|---|
| `strategy_create` / `strategy_update` | userId, workspaceId, strategyId |
| `backtest_run` | userId, workspaceId, strategyId, backtestId, dateRange |
| `paper_order_submit` | userId, workspaceId, symbol, side, qty, clientOrderId |
| `paper_order_cancel` | userId, workspaceId, orderId |
| `alert_rule_created` / `alert_rule_deleted` | userId, workspaceId, ruleId, ruleType |
| `alert_sent` | workspaceId, ruleId, channel (in-app/email) |
| `risk_limit_breach` | workspaceId, limitType, attemptedValue, limitValue — logged even when the action is blocked |

Audit entries are append-only per the existing pattern; never deleted except as part of the existing GDPR/CCPA cascade-delete flow.

## 7. Output labeling

Every user-facing strategy, backtest, or paper-trading result must display one of:

- **`educational`** — explanatory content, no specific account tie-in
- **`simulated`** — backtest output against historical data
- **`paper-trading`** — live activity against the Alpaca paper account

No output may be labeled or implied to be live trading performance or investment advice. This is enforced at the component level (a shared `<ResultLabel>` or equivalent, not ad hoc per-page text).

## 8. Secrets handling

- `ALPACA_API_KEY` / `ALPACA_API_SECRET` follow the same rules as every other secret in `SECURITY.md` §5: env vars only, never logged, never in `.env.example` with real values, never in a ticket or PR description.
- If/when a live key ever exists in any environment, it must be named distinctly (e.g. a separate `ALPACA_LIVE_*` pair, never reusing the paper variable names) so a code review can spot a live-key reference by name alone. No such variables should exist today.

## 9. Incident response

If an agent or a code path attempts a prohibited action (live order, cross-workspace read, secret exposure):

1. The action is blocked at the layer closest to the violation (route handler, not just UI).
2. A `risk_limit_breach` or equivalent audit entry is written even though the action was blocked.
3. Sentry captures the attempt (`sentry.server.config.ts` already wired for error capture).
4. Treat as a P0 bug, not a feature request, regardless of how it was triggered.

## 10. PR acceptance checklist for trading-adjacent code

- [ ] `requireAuth()` present on every new/modified route
- [ ] `workspaceId` scoping verified on every query and write
- [ ] Output labeled per §7
- [ ] Audit event added per §6
- [ ] No path reaches a non-paper Alpaca endpoint
- [ ] Tests cover the rejection path (unauthenticated, cross-workspace, over-limit) not just the happy path
- [ ] Rollback note included in the PR description
