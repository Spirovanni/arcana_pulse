# CLAUDE.md — Project Context for AI Agents

This file orients any AI agent (Claude, Cursor, etc.) working in this repository. Read it before making changes. For task-tracking mechanics, read `AGENTS.md` (bd / Beads workflow) — that file is unchanged by this one and remains authoritative for how work is claimed, tracked, and closed.

---

## 1. What this project is

**Arcana Pulse** is the consumer-facing money management app for **Arcana Credit Union** — a sandbox-first digital banking + personal finance SaaS hybrid. It is **not** a chartered financial institution; see the disclaimer in `SECURITY.md` §11 and `README.md`.

A new layer is being added on top of the existing banking/PFM product: **Market Intelligence** — market watching, strategy research, backtesting, paper trading, education, and alerts. See `docs/MARKET_INTELLIGENCE_PRD.md` for scope.

## 2. Acting as: senior product architect, AI safety reviewer, technical PM

When working on Market Intelligence features, hold all three hats at once: design it well, keep it safe, and keep it shippable in small reviewable increments. The ten non-negotiable rules below exist to keep those three roles aligned — they are not optional style preferences.

## 3. Non-negotiable rules

1. **Never recommend or build autonomous live trading.** Every execution path in this codebase is paper-only.
2. **Agents never move real money or initiate real transfers.** This applies to Dwolla transfers and to any future Alpaca live-trading capability.
3. **Treat as sensitive:** Alpaca live keys, Plaid tokens, Dwolla secrets, Appwrite keys, Stripe keys, Sentry auth tokens, NextAuth/encryption secrets.
4. **Never put secrets in prompts, tickets, logs, screenshots, or commits.** `.env` / `.env.local` are gitignored; `.env.example` holds placeholders only.
5. **Never fabricate market data, financial metrics, or strategy results.** Every number shown to a user must trace back to a tool call, API response, database query, or uploaded file.
6. **Every new market/trading feature is workspace-scoped.** Follow the `workspaceId` pattern already enforced in `transactions`, `transfers`, `banks` (see `SCHEMA.md`).
7. **Every strategy output is labeled** `educational`, `simulated`, or `paper-trading` unless backed by a compliant live-trading framework (which does not exist in this repo and should not be built without explicit, separate authorization).
8. **Human approval is required for:** order placement, production deployments, database migrations, and changes to auth/security code.
9. **Prefer small, PR-sized tasks** with acceptance criteria, tests, and rollback notes. Don't bundle unrelated changes.
10. **Keep the app maintainable:** canonical services, typed interfaces, clear API boundaries, audit logs, Sentry visibility.

Full operationalization of these rules for the Market Intelligence layer lives in `docs/AGENT_OPERATING_MODEL.md` and `docs/TRADING_RISK_POLICY.md`. Read both before touching anything under `src/app/api/alpaca/*`, `algo-strategies`, or `portfolio`.

> **Known gap as of this writing:** `src/app/api/alpaca/orders/route.ts` (`POST`) places a real paper order with no `requireAuth()` call, no `workspaceId` scoping, and no audit log entry. Per rule #6, #8, and #10 this must be remediated (auth + workspace check + approval gate + `logAuditEvent()`) before any agent-facing strategy or alert flow is allowed to call it. See `docs/TRADING_RISK_POLICY.md` §3.

## 4. Tech stack (do not introduce alternatives without a migration plan)

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Appwrite (`node-appwrite`) + NextAuth.js (JWT sessions)
- **Integrations:** Plaid (banking), Dwolla (ACH transfers), Alpaca (paper trading + market data), Anthropic AI SDK, Resend (email), Stripe (billing)
- **Monitoring:** Sentry (client/server/edge)
- **Deployment:** Vercel

Do not add a second ORM, auth stack, or database. Do not add a live-broker SDK beyond Alpaca without a written proposal and human sign-off.

## 5. Where things live

```
src/
├── app/
│   ├── (auth)/             # Sign in/up, MFA, password reset
│   ├── (public)/           # Marketing, career, pricing, legal
│   ├── (root)/             # Authenticated app shell
│   │   ├── algo-strategies/  # Curated third-party EA catalog (mock data today)
│   │   ├── portfolio/        # Alpaca positions/performance UI
│   │   └── intelligence/     # Career intelligence (existing, unrelated to Market Intelligence layer)
│   └── api/
│       ├── alpaca/          # account, assets, orders, portfolio-history, positions
│       ├── ai/               # categorize, forecast, insights, assistant, tax-loss-harvesting
│       ├── plaid/, dwolla/, stripe/
│       └── mcp/              # MCP resource vault server
├── lib/
│   ├── alpaca.ts             # Server-only Alpaca client (paper by default via ALPACA_ENV)
│   ├── env.ts                 # requireEnv() — fail-fast config validation
│   ├── auth/withAuth.ts       # requireAuth({ requiredRole }) — use on every protected route
│   ├── resilience/            # circuit-breaker.ts, retry.ts — wrap flaky external calls with these
│   ├── security/urlSafety.ts
│   └── services/
│       ├── db/                # Appwrite-backed services (auditLog.ts, transactions.ts, ...)
│       ├── ai/                 # Anthropic integrations
│       ├── investments.ts, tlh.ts, monte-carlo.ts, notifications.ts
│       └── forecasting/
```

Reuse `lib/services/db/auditLog.ts` (`logAuditEvent()`) for anything Market Intelligence does — don't invent a parallel logging path. Reuse `withAuth.ts` for route protection. Prefer Appwrite-backed services over in-memory mocks for anything beyond a first prototype.

## 6. Conventions to follow

- **Workspace scoping:** every collection includes `workspaceId`; every query filters on it (`SCHEMA.md` §Conventions).
- **Document IDs:** prefixed (`ws-`, `usr-`, `bnk-`, `txn-`, `xfr-`, `sess-`). New Market Intelligence collections should follow the same pattern (e.g. `strat-`, `bt-`, `alert-`) — see `docs/STRATEGY_ENGINE_SPEC.md`.
- **Dates:** always format through `formatDate` in `src/lib/utils.ts` (UTC-forced) to avoid hydration mismatches.
- **Client components reading `useSearchParams()`** must be wrapped in `<Suspense>` or `next build` will fail.
- **Rate limiting / CORS:** configured in `src/middleware.ts`. `/api/mcp` and `/.well-known/*` are intentionally CORS-open; everything else is not.
- **Resilience:** wrap third-party API calls (Alpaca, Plaid, Dwolla, and any future market data provider) with `src/lib/resilience/circuit-breaker.ts` + `retry.ts` rather than bare `fetch`.

## 7. Environment variables relevant to Market Intelligence

| Variable | Purpose |
|---|---|
| `ALPACA_API_KEY` / `ALPACA_API_SECRET` | Alpaca trading + data API credentials |
| `ALPACA_ENV` | `paper` (default) or `live` — **must stay `paper`** outside of an explicitly authorized live-trading project |
| `ANTHROPIC_API_KEY` | Strategy/insight generation, education content |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*` | Required for audit/observability visibility on any new agent action |

See `.env.example` for the full list and `SECURITY.md` §5 for handling rules.

## 8. Project documentation map

| Doc | Purpose |
|---|---|
| `AGENTS.md` | Beads (`bd`) task-tracking workflow — unchanged, still mandatory |
| `docs/AGENT_OPERATING_MODEL.md` | What AI agents may/may not do in this codebase, approval checkpoints |
| `docs/MARKET_INTELLIGENCE_PRD.md` | Product scope for the Market Intelligence layer |
| `docs/TRADING_RISK_POLICY.md` | Risk controls, order-placement gating, audit taxonomy |
| `docs/MARKET_DATA_PROVIDERS.md` | Data source catalog, current vs. candidate providers |
| `docs/STRATEGY_ENGINE_SPEC.md` | Backtesting/strategy engine technical spec |
| `docs/PAPERCLIP_SETUP.md` | Paper-trading execution service ("Paperclip") setup |
| `docs/HERMES_SETUP.md` | Alerts/notifications messenger service ("Hermes") setup |
| `SCHEMA.md`, `SECURITY.md`, `ROADMAP.md` | Existing platform-wide references — read before adding collections, routes, or milestones |

## 9. Before you start coding

1. Read `AGENTS.md` and create/claim Beads issues for the work — don't track Market Intelligence work in ad-hoc markdown TODOs.
2. Read `docs/Arcana_Pulse_PRD.md` and the Market Intelligence docs above relevant to your task.
3. Check whether a service/component already exists (`src/lib/services/`, `src/components/`) before writing a new one.
4. If touching `algo-strategies`, `portfolio`, or anything under `api/alpaca/*`, read `docs/TRADING_RISK_POLICY.md` first — there's a known gap noted in §3 above.
5. Open a small PR with acceptance criteria, tests, and a rollback note. Get human approval before merging anything that touches auth/security, runs a migration, places an order, or deploys to production.
