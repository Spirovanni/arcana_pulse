# Hermes Setup — Alerts & Notifications Messenger Service

**Status:** Draft setup spec, no implementation yet
**Related:** `docs/AGENT_OPERATING_MODEL.md` (defines the "Alerts Agent ('Hermes')" role), `docs/TRADING_RISK_POLICY.md` §6 (audit taxonomy), `docs/MARKET_INTELLIGENCE_PRD.md` §7E, `docs/STRATEGY_ENGINE_SPEC.md` §7, `docs/PAPERCLIP_SETUP.md` §6 (one of Hermes's event sources)

---

## 1. What Hermes is

Hermes is the name for the alert-evaluation and delivery service: it watches conditions (price thresholds, strategy signals, paper-order events, risk-limit breaches) and delivers notifications through the channels this codebase already has — in-app (`src/lib/services/notifications.ts`) and email (`src/lib/services/email.ts` via Resend). Hermes is not a new channel provider; it's the rule engine and delivery glue on top of what exists.

Hermes is responsible for:

- Storing and evaluating alert rules a member defines (e.g. "notify me if AAPL crosses above its 50-day SMA," "notify me when a paper order fills," "notify me if a strategy's drawdown breaches X%")
- Delivering matched alerts via in-app notification and, optionally, email
- Writing audit entries (`alert_rule_created`, `alert_rule_deleted`, `alert_sent`) per `docs/TRADING_RISK_POLICY.md` §6
- De-duplicating and rate-limiting so one condition doesn't spam a member

Hermes does **not**:

- Place or cancel orders — that's Paperclip's job. Hermes notifies; it never acts.
- Originate market data — it reads the same provider data documented in `docs/MARKET_DATA_PROVIDERS.md`.
- Send SMS or push. v1 is in-app + email only; SMS/push are candidate future channels, not implemented.

## 2. Prerequisite: `notifications.ts` is an in-memory mock today

`src/lib/services/notifications.ts` currently stores everything in a process-local array (`let store: Notification[] = []`) that is wiped on every server restart or serverless cold start, and `src/app/api/notifications/route.ts` has no `requireAuth()` call — it trusts a `workspaceId` query param directly. Per this project's "prefer Appwrite-backed services over in-memory mocks" rule, the first Hermes milestone is migrating this to a real Appwrite `notifications` collection and adding `requireAuth` to its route — the same category of gap called out for `/api/alpaca/orders` in `docs/TRADING_RISK_POLICY.md` §3. Hermes cannot reliably alert on anything if the underlying store doesn't survive a deploy, and shouldn't read/write another workspace's notifications because nothing checks the session.

## 3. Data model

New Appwrite collection, prefixed `alr-` (alert rule), plus migrating the existing in-memory `Notification` shape into a persisted collection. Following `SCHEMA.md` conventions:

### `alertRules`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | Document ID | auto | `alr-*` |
| `workspaceId` | string | yes | Tenant scope |
| `createdBy` | string | yes | userId |
| `name` | string | yes | |
| `kind` | enum | yes | `price_threshold`, `strategy_signal`, `paper_order_event`, `risk_limit_breach` |
| `config` | string (JSON) | yes | Shape depends on `kind` — e.g. `{ symbol, operator, value }` for `price_threshold` |
| `channels` | string[] | yes | Subset of `["in_app", "email"]` |
| `active` | boolean | yes | |
| `lastTriggeredAt` | datetime | no | Used for cooldown (§7) |

Indexes: `idx_workspace` (`[workspaceId]`), `idx_workspace_active` (`[workspaceId, active]`).

### `notifications` (migrated from in-memory)

Same shape as today's `Notification` interface (`id, workspaceId, type, severity, title, body, read, createdAt, href`), persisted in Appwrite, plus a new optional `alertRuleId` (FK, nullable — null for existing non-alert notifications like transaction-based ones). Extend the `NotificationType` enum to include the new Market Intelligence sources rather than overloading an existing type.

## 4. Alert kinds (v1)

| Kind | Trigger condition | Data source |
|---|---|---|
| `price_threshold` | Symbol crosses above/below a configured value | Market data provider (`docs/MARKET_DATA_PROVIDERS.md`) |
| `strategy_signal` | A deployed strategy's entry/exit rule fires | Strategy Engine (`docs/STRATEGY_ENGINE_SPEC.md` §6) |
| `paper_order_event` | A Paperclip order fills, is rejected, or is canceled | Paperclip (`docs/PAPERCLIP_SETUP.md` §6) |
| `risk_limit_breach` | A hard control trips (sizing limit, kill switch) | `docs/TRADING_RISK_POLICY.md` §4 |

Every delivered alert body must state which of these kinds produced it, and for `strategy_signal` / `risk_limit_breach` must carry the same `educational` / `simulated` / `paper-trading` label as its source per `docs/TRADING_RISK_POLICY.md` §7 — Hermes relays labels, it never strips or rewrites them.

## 5. Evaluation / scheduling

This codebase has no cron or job-runner infrastructure today (`vercel.json` has no `crons` block; no queue). Two evaluation paths, chosen per alert kind:

- **Event-driven** (`paper_order_event`, `strategy_signal`, `risk_limit_breach`): fire synchronously from the producing code path — Paperclip's submit/cancel handlers, the strategy signal evaluator — by calling a single `evaluateAndNotify()` entry point. No polling, no new infrastructure.
- **Time-driven** (`price_threshold`): needs periodic evaluation against live quotes. Recommend Vercel Cron (a `crons` block in `vercel.json` calling a new `/api/cron/evaluate-alerts` route) at a deliberately low frequency (e.g. every 5 minutes) to respect the market-data provider's rate limits documented in `docs/MARKET_DATA_PROVIDERS.md`. Do not poll per-second. This is new infrastructure and should be its own PR with the rate-limit math shown in the ticket.

## 6. Delivery

- **In-app:** `addNotification()` (once migrated to the Appwrite-backed store) — always fires, no opt-out, since it's just an inbox item.
- **Email:** `sendEmail()` from `src/lib/services/email.ts`, gated by both the rule's `channels` including `"email"` and the member's notification preferences. Check how other email sends in this codebase handle opt-in before inventing a new preference flag — reuse the pattern rather than adding a parallel one. Uses the existing `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_APP_URL` env vars — no new secrets.

## 7. De-duplication / rate limiting

Before sending, check `lastTriggeredAt` on the rule and suppress re-firing within a cooldown window (e.g. 15 minutes, configurable) so a price flapping near a threshold doesn't spam the member. **Exception:** `risk_limit_breach` alerts must never be cooldown-suppressed — those are safety-critical and should always deliver.

## 8. Audit events

Use `logAuditEvent()` exclusively (`docs/TRADING_RISK_POLICY.md` §6 taxonomy) — don't invent a parallel logging path:

- `alert_rule_created` — on rule creation
- `alert_rule_deleted` — on deletion or deactivation
- `alert_sent` — on every successful delivery (include `alertRuleId`, `channel`, `workspaceId`)

## 9. API routes (proposed)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/alerts/rules` | GET, POST | List/create alert rules for the workspace | `requireAuth` |
| `/api/alerts/rules/[id]` | GET, PUT, DELETE | Manage a single rule | `requireAuth` + workspace ownership check |
| `/api/cron/evaluate-alerts` | POST | Cron-triggered `price_threshold` sweep | Cron-secret only — not member-facing |
| `/api/notifications` | GET, PATCH | Existing route, **to be migrated** to Appwrite + `requireAuth` | `requireAuth` (currently missing) |

## 10. Environment variables

No new secrets beyond what's already in `.env.example`:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Existing email provider credential |
| `EMAIL_FROM` | Existing sender address override (`src/lib/services/email.ts`) |
| `NEXT_PUBLIC_APP_URL` | Used to build links inside alert emails |

If Vercel Cron is added (§5), document a `CRON_SECRET` used to authenticate the cron-triggered route, per Vercel's recommended pattern. Treat it as sensitive — same handling tier as the other secrets in `SECURITY.md` §5.

## 11. Testing / QA checklist

- [ ] Unit test: rule evaluation logic for each alert kind against known fixture data
- [ ] Unit test: cooldown suppression applies to `price_threshold` and is bypassed for `risk_limit_breach`
- [ ] Integration test: `requireAuth` enforced on all `/api/alerts/*` routes and on the migrated `/api/notifications`
- [ ] Integration test: every delivered alert produces exactly one `alert_sent` audit entry
- [ ] Integration test: notifications persist across a simulated process restart (proves the Appwrite migration actually happened)
- [ ] Manual QA: email renders correctly in at least one client and includes the source label (`educational` / `simulated` / `paper-trading`)

## 12. Rollout as PR-sized tickets

1. Migrate `notifications.ts`'s in-memory store to an Appwrite-backed collection; add `requireAuth` to `/api/notifications`.
2. `alertRules` collection + CRUD routes.
3. Event-driven `evaluateAndNotify()` wired into Paperclip's submit/cancel handlers (`paper_order_event`).
4. Event-driven wiring into Strategy Engine signal evaluation (`strategy_signal`, `risk_limit_breach`).
5. Vercel Cron + `/api/cron/evaluate-alerts` for `price_threshold` — separate ticket, new infrastructure, needs its own rate-limit review.
6. Email delivery + opt-in preference UI.
7. "My Alerts" UI surface (list, create, edit, delivery history).

Each ticket gets its own Beads issue (`AGENTS.md` workflow) with acceptance criteria and a rollback note before work starts.

## 13. Out of scope (this doc)

- SMS or push notifications — candidate future channels, not in this stack today.
- Any alert that itself places or cancels an order — Hermes notifies; only Paperclip, with human confirmation, ever executes.
