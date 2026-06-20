# Paperclip Setup — Paper-Trading Execution Service

**Status:** Draft setup spec, no implementation yet
**Related:** `docs/AGENT_OPERATING_MODEL.md` (defines the "Paper Execution Agent ('Paperclip')" role), `docs/TRADING_RISK_POLICY.md` (hard controls this service must enforce), `docs/STRATEGY_ENGINE_SPEC.md` §7 (consumer), `docs/MARKET_INTELLIGENCE_PRD.md` §7D

---

## 1. What Paperclip is

Paperclip is the name for the gated execution layer in front of Alpaca's **paper** trading API. It is not a new broker integration — it's the confirmation, audit, and risk-control wrapper required before any strategy or manual action is allowed to reach `/api/alpaca/orders`. "Paper" is non-negotiable here (rule #1/#2 in `CLAUDE.md`): Paperclip has no live-trading code path and should never grow one without separate, explicit authorization.

Paperclip is responsible for:

- Accepting an order request from a human (manual ticket entry) or the Strategy/Backtest Agent (a deployed strategy's signal)
- Enforcing the human-approval/confirmation gate before any order reaches Alpaca
- Enforcing the hard controls in `docs/TRADING_RISK_POLICY.md` §4 (symbol allow-list, sizing limits, kill switch, idempotency)
- Writing an audit entry via `logAuditEvent()` for every submit, cancel, and rejection
- Reconciling local order/position records against Alpaca's actual state

Paperclip does **not**:

- Place live orders, under any configuration
- Auto-approve anything — every order needs an explicit human confirmation step
- Compute its own prices or fills — it only relays what Alpaca returns

## 2. Prerequisite: remediate the existing gap

Before Paperclip can wrap it, `src/app/api/alpaca/orders/route.ts` (`POST`) needs the 5-point remediation specified in `docs/TRADING_RISK_POLICY.md` §3: `requireAuth()`, `workspaceId` scoping, a `confirmed: true` gate, a `logAuditEvent()` call, and a rate/size guard. Paperclip v1 **is** that remediation plus a local order ledger — it is not a separate service layered on top of an already-fixed route.

## 3. Architecture decision needed before scaling past one workspace

Alpaca paper credentials (`ALPACA_API_KEY` / `ALPACA_API_SECRET`) are configured once, server-wide, via env vars — there is exactly **one** Alpaca paper account for the whole deployment today. Rule #6 requires every market/trading feature to be workspace-scoped, but there is currently no mechanism for that at the brokerage layer: every workspace submitting orders would trade against the same shared paper account, the same shared buying power, and the same shared position list.

Two paths — pick one explicitly before shipping Paperclip beyond a single-workspace demo:

**(a) Shadow ledger (stopgap).** Paperclip keeps its own Appwrite-backed ledger (`paperOrders`, and later `paperPositions`) that partitions fills by `workspaceId` for display purposes, while the real Alpaca account stays shared underneath. Caveat: this is **not** true isolation — workspace A's fills consume the same real buying power as workspace B's. Must be disclosed in-product ("shared paper sandbox") and is only acceptable for an internal/demo phase.

**(b) Per-workspace paper accounts (correct long-term).** Provision a distinct Alpaca account per workspace via Alpaca's **Broker API** (a different product from the Trading API already integrated in `src/lib/alpaca.ts`). Larger lift: new credential type, new client, lightweight onboarding flow per workspace. Out of scope for a first Paperclip PR — track as its own epic.

This doc recommends building **(a)** now as an explicitly-labeled stopgap, with the limitation surfaced in the UI, while **(b)** is tracked separately. Don't silently default to (a) without writing the decision into a Beads issue and getting human sign-off (rule #8 — this is an architecture/security-adjacent decision).

## 4. Environment variables

No new secrets are needed for v1. Paperclip reuses what's already defined in `src/lib/env.ts`:

| Variable | Purpose |
|---|---|
| `ALPACA_API_KEY` / `ALPACA_API_SECRET` | Existing Alpaca paper credentials |
| `ALPACA_ENV` | Must remain `paper` — never `live`, outside a separate authorized project |

If §3(b) ships later, per-workspace credential storage would need encryption at rest at the same handling tier as Plaid access tokens (`SECURITY.md` §5) — not in scope now.

## 5. Data model

New Appwrite collection, prefixed `pco-` (Paperclip order), following `SCHEMA.md` conventions:

### `paperOrders`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | Document ID | auto | `pco-*` |
| `workspaceId` | string | yes | Tenant scope |
| `strategyId` | string | no | FK to `strategies` if order originated from Strategy Engine |
| `submittedBy` | string | yes | userId |
| `side` | enum | yes | `buy`, `sell` |
| `symbol` | string | yes | |
| `qty` / `notional` | float | yes | One or the other, matching Alpaca's own order shape |
| `orderType` | enum | yes | `market`, `limit` (v1 scope, matches existing route) |
| `timeInForce` | enum | yes | |
| `clientOrderId` | string | yes | Idempotency key, generated client-side per attempt |
| `alpacaOrderId` | string | no | Populated once Alpaca acks |
| `status` | enum | yes | `pending_confirmation`, `submitted`, `filled`, `canceled`, `rejected` |
| `confirmedAt` | datetime | no | Set only after explicit UI confirmation |
| `createdAt` | datetime | yes | |

Indexes: `idx_workspace` (`[workspaceId]`), `idx_workspace_status` (`[workspaceId, status]`).

Alpaca itself has no notion of `workspaceId` or `strategyId` — this table is the only place that mapping exists, and it's what makes rule #6 enforceable here: every query filters by `workspaceId` against this table, not against Alpaca.

## 6. Request flow

1. Order request originates from the UI (manual ticket) or the Strategy/Backtest Agent (`status = "paper_deployed"` signal, see `docs/STRATEGY_ENGINE_SPEC.md` §7).
2. `POST /api/alpaca/orders` runs `requireAuth({ requiredRole: "member" })` — reject if no session or if the request's `workspaceId` doesn't match the session.
3. Hard-control checks run next: symbol allow-list, qty/notional limit, workspace kill-switch flag (§9). Any failure rejects with 4xx **and** an audit entry of type `risk_limit_breach`.
4. If checks pass but `confirmed !== true`, return a 409/422 "confirmation required" response. The UI shows a confirmation modal with the order's full details; the member must explicitly confirm.
5. Re-submit with `confirmed: true` and the same `clientOrderId` → only now does Paperclip call Alpaca's `POST /v2/orders`.
6. On Alpaca ack: write the `paperOrders` record and call `logAuditEvent({ type: "paper_order_submit", workspaceId, ... })`.
7. Background reconciliation (§7) updates `status` as Alpaca fills, cancels, or rejects the order.

## 7. Reconciliation

Alpaca paper fills happen asynchronously (market orders fill near-instantly in the paper simulator; limit orders may sit open). Until a push-based integration exists, reconcile by polling `GET /v2/orders/{id}` (already reachable through the existing `alpacaGet` helper in `src/lib/alpaca.ts`) — e.g. on dashboard load for any order not yet in a terminal state, plus an explicit "refresh" action. Alpaca does offer a trade-updates WebSocket stream, but it is **not wired up in this codebase today** — treat it as a future enhancement, not something to describe as already working.

## 8. Cancel path

`DELETE /v2/orders/{id}` needs the same gating: `requireAuth`, a workspace-ownership check (the stored order's `workspaceId` must match the session), and a `paper_order_cancel` audit event. A confirmation modal is not strictly required for cancellation (it's the safe direction), but auth and audit logging are still mandatory.

## 9. Kill switch

Add a workspace-level boolean (e.g. `workspaces.tradingPaused`) checked at the top of the order-submit handler. When `true`, reject all new submissions with a clear message regardless of role. This is the manual circuit-breaker described in `docs/TRADING_RISK_POLICY.md` §4 and should be toggleable by an admin/owner role without requiring a deploy.

## 10. Resilience

Wrap every Alpaca call (submit, cancel, status check) with `src/lib/resilience/circuit-breaker.ts` + `retry.ts`. **Trading-specific caveat:** never blindly retry a `POST /v2/orders` on a timeout or 5xx — a retried submit could double-place an order. The `clientOrderId` idempotency key protects against this (Alpaca rejects a duplicate `client_order_id`), but only if every retry attempt reuses the same key. `GET` and cancel calls are safe to retry normally.

## 11. Testing / QA checklist

- [ ] Unit test: order rejected when `requireAuth` fails
- [ ] Unit test: order rejected when request `workspaceId` doesn't match session
- [ ] Unit test: order rejected when `confirmed !== true`
- [ ] Unit test: order rejected when symbol isn't allow-listed or qty/notional exceeds the configured limit
- [ ] Unit test: kill-switch flag blocks submission regardless of role
- [ ] Integration test: a duplicate `clientOrderId` does not produce two Alpaca orders
- [ ] Integration test: every accepted submit produces exactly one `paper_order_submit` audit entry
- [ ] Manual QA: confirm the Alpaca dashboard shows the **paper** account for the resulting order

## 12. Rollout as PR-sized tickets

1. Remediate `/api/alpaca/orders` per `docs/TRADING_RISK_POLICY.md` §3 (auth + workspace check + confirm gate + audit log) — no new collection yet.
2. Add `paperOrders` collection + write-through on submit/cancel.
3. Kill-switch flag + admin toggle UI.
4. Reconciliation polling on the portfolio/algo-strategies pages.
5. Wire the Strategy Engine's paper-deploy route (`docs/STRATEGY_ENGINE_SPEC.md` §5) to call the now-gated order route.
6. Decide and document path (a) vs (b) from §3 as its own epic.

Each ticket gets its own Beads issue (`AGENTS.md` workflow) with acceptance criteria and a rollback note before work starts.

## 13. Out of scope (this doc)

- Live trading of any kind — permanently out of scope per rule #1.
- Per-workspace brokerage accounts (§3(b)) — tracked as a future epic, not this one.
- Options, crypto, or multi-leg orders — v1 is single-symbol equity market/limit orders only, matching what `/api/alpaca/orders` already supports.
