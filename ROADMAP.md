# Arcana Pulse Roadmap

**Product:** Arcana Pulse — Consumer app for Arcana Credit Union
**Domain:** arcanacu.org
**Stack:** Next.js 14, TypeScript, Tailwind CSS, Appwrite, Plaid, Dwolla, Sentry

---

## Milestone 1 — Platform Foundation ✅

> App shell, routing, layouts, navigation, workspace types, canonical transaction model, mock data.

| Status | Task | Bead |
|--------|------|------|
| ✅ | Scaffold Next.js app shell, routes, and layouts | `arcana_pulse-2zo` |
| ✅ | Define workspace-aware data types | `arcana_pulse-0dp` |
| ✅ | Create canonical transaction type and mock data | `arcana_pulse-u49` |

**Delivered:**
- Next.js 14 App Router with `(auth)` and `(root)` route groups
- Persistent sidebar (desktop) + mobile drawer navigation
- TypeScript interfaces: Workspace, User, Bank, Transaction, Transfer, DashboardMetrics
- Canonical transaction model with `sourceType` (synced/manual/transfer) and `transactionType` (income/expense/transfer)
- 12 mock transactions, 3 banks, 2 transfers, 1 workspace, 1 user
- Placeholder pages for all 10 routes

---

## Milestone 2 — Service Layer + Transaction CRUD ✅

> Workspace service, canonical transaction service, dashboard aggregation, full CRUD.

| Status | Task | Bead |
|--------|------|------|
| ✅ | Implement workspace service layer | `arcana_pulse-dap` |
| ✅ | Implement canonical transaction service | `arcana_pulse-2n8` |
| ✅ | Implement dashboard aggregation service | `arcana_pulse-njp` |
| ✅ | Add manual transaction CRUD | `arcana_pulse-bw9` |
| ✅ | Build dashboard page with summary cards and charts | `arcana_pulse-e2o` |
| ✅ | Build transactions page with filters and pagination | `arcana_pulse-1z3` |
| ✅ | Build dedicated income page | `arcana_pulse-oyw` |
| ✅ | Build dedicated expense page | `arcana_pulse-2vf` |

**Delivered:**
- Unified service layer: `workspace.ts`, `transactions.ts`, `dashboard.ts`
- In-memory stores structured for Appwrite SDK replacement
- Transaction CRUD with create/edit/delete modals
- Transaction filtering by account and type, working pagination (10/page)
- Dashboard: summary cards, account distribution, category breakdown, monthly cash flow, financial summary
- Income page: filtered view, income-by-source breakdown, CRUD
- Expense page: filtered view, expense-by-category breakdown, CRUD
- Service-enforced rule: only manual records can be edited/deleted

---

## Milestone 3 — Connected Banking ✅

> Bank service layer, My Banks page, Plaid sandbox integration, transaction sync.

| Status | Task | Bead |
|--------|------|------|
| ✅ | Build My Banks (Accounts) page | `arcana_pulse-7wf` |
| ✅ | Create bank service layer | `arcana_pulse-4km` |
| ✅ | Wire My Banks page to bank service | `arcana_pulse-c5f` |
| ✅ | Add bank-level transaction filtering | `arcana_pulse-6dq` |
| ✅ | Integrate Plaid sandbox bank linking | `arcana_pulse-agr` |
| ✅ | Add Plaid API routes for link token and token exchange | `arcana_pulse-2af` |
| ✅ | Build Plaid Link React component | `arcana_pulse-3t4` |
| ✅ | Sync Plaid sandbox transactions | `arcana_pulse-6pf` |
| ✅ | Create Dwolla funding source on bank link | `arcana_pulse-4dm` |

**Dependency chain:**
```
My Banks page (7wf)
  → Bank service (4km) → Wire page to service (c5f) → Bank-level filtering (6dq)
  → Plaid integration (agr) → Plaid API routes (2af) → Plaid Link component (3t4)
                                                          → Sync transactions (6pf)
                                                          → Dwolla funding source (4dm)
```

---

## Milestone 4 — Transfer Workflow ✅

> Transfer service, form validation, confirmation, Dwolla sandbox integration, status lifecycle.

| Status | Task | Bead |
|--------|------|------|
| ✅ | Build transfer funds page | `arcana_pulse-u0f` |
| ✅ | Create transfer service layer | `arcana_pulse-ban` |
| ✅ | Wire transfer form with validation and confirmation | `arcana_pulse-2bk` |
| ✅ | Add transfer status lifecycle display | `arcana_pulse-9jz` |
| ✅ | Integrate Dwolla sandbox transfer flow | `arcana_pulse-4mi` |
| ✅ | Add Dwolla API routes for customer and transfer | `arcana_pulse-4rf` |
| ✅ | Map Dwolla transfer statuses to Arcana lifecycle | `arcana_pulse-zw7` |
| ✅ | Add Dwolla webhook handler | `arcana_pulse-2sb` |

**Dependency chain:**
```
Transfer page (u0f)
  → Transfer service (ban) → Wire form + validation (2bk) → Status lifecycle (9jz)
  → Dwolla integration (4mi) → Dwolla API routes (4rf) → Status mapping (zw7)
                                                          → Webhook handler (2sb)
```

---

## Milestone 5 — Auth, Monitoring, and Hardening ✅

> Authentication, route protection, Sentry, error handling, deployment.

| Status | Task | Bead |
|--------|------|------|
| ✅ | Add auth flow with protected route middleware | `arcana_pulse-6b3` |
| ✅ | Add Sentry monitoring and deployment hardening | `arcana_pulse-785` |
| ✅ | Install and configure Sentry SDK | `arcana_pulse-9ea` |
| ✅ | Add error boundaries and PII scrubbing | `arcana_pulse-9pb` |
| ✅ | Add environment validation and Vercel config | `arcana_pulse-klu` |
| ✅ | Add loading states and empty state standardization | `arcana_pulse-4qb` |
| ✅ | Responsive QA and mobile polish | `arcana_pulse-udr` |

**Delivered:**
- Cookie-based auth with in-memory session store, sign-in/sign-up forms, route protection middleware
- Sentry SDK (client/server/edge) with session replay, PII scrubbing, and error boundaries
- Environment validation module with `requireEnv()` helper
- Vercel deployment config (`vercel.json`)
- Reusable `LoadingSpinner` and `EmptyState` components standardized across all pages
- Responsive mobile polish: stacking page headers, horizontal-scroll tables with `min-w`, 44px touch targets, settings row stacking

---

## Milestone 6 — Production Data Layer

> Migrate from in-memory stores to Appwrite database, production auth, email verification, MFA.

| Status | Task | Bead |
|--------|------|------|
| | Design and apply production database schema | `arcana_pulse-dwg` |
| | Replace in-memory stores with Appwrite database | `arcana_pulse-9kx` |
| | Migrate auth to NextAuth.js with production-safe credentials | `arcana_pulse-ph3` |
| | Add email verification and password reset flow | `arcana_pulse-756` |
| | Add database connection pooling and error retry logic | `arcana_pulse-2fz` |
| | Add multi-factor authentication (TOTP) | `arcana_pulse-qvo` |

**Dependency chain:**
```
Schema design (dwg)
  → Appwrite migration (9kx) → NextAuth (ph3) → Email verification (756) → MFA (qvo)
  → Connection pooling (2fz)
```

---

## Milestone 7 — AI Financial Intelligence

> AI-powered categorization, spending insights, chat assistant, forecasting, budgets, and goals.

| Status | Task | Bead |
|--------|------|------|
| | Build AI transaction categorization engine | `arcana_pulse-0r1` |
| | Build spending insights and anomaly detection | `arcana_pulse-dm6` |
| | Build natural language financial assistant (chat) | `arcana_pulse-ib3` |
| | Add cash flow forecasting with recurring detection | `arcana_pulse-db2` |
| | Add AI-generated budget recommendations | `arcana_pulse-r7x` |
| | Add savings goal tracking with AI projections | `arcana_pulse-ynj` |

**Dependency chain:**
```
Appwrite migration (M6: 9kx)
  → AI categorization (0r1) → Spending insights (dm6) → Cash flow forecasting (db2)
                             → Chat assistant (ib3)    → Budget recommendations (r7x) → Savings goals (ynj)
```

---

## Milestone 8 — Investment & Portfolio

> Plaid Investments, portfolio visualization, AI insights, goal-based investing, dividends, tax optimization.

| Status | Task | Bead |
|--------|------|------|
| | Integrate Plaid Investments for brokerage account linking | `arcana_pulse-crr` |
| | Build portfolio visualization page | `arcana_pulse-oqz` |
| | Add AI investment insights and risk analysis | `arcana_pulse-4h4` |
| | Add goal-based investing projections | `arcana_pulse-c5i` |
| | Add dividend and investment income tracking | `arcana_pulse-sp1` |
| | Add tax-loss harvesting suggestions | `arcana_pulse-bn3` |

**Dependency chain:**
```
Appwrite migration (M6: 9kx)
  → Plaid Investments (crr) → Portfolio page (oqz) → AI insights (4h4) → Goal-based investing (c5i)
                             → Dividend tracking (sp1)                  → Tax-loss harvesting (bn3)
```

---

## Milestone 9 — Compliance & Security

> Audit logging, rate limiting, encryption, privacy, GDPR/CCPA, SOC 2, pen testing.

| Status | Task | Bead |
|--------|------|------|
| | Add audit logging for all financial operations | `arcana_pulse-qf2` |
| | Add rate limiting and abuse prevention | `arcana_pulse-v9q` |
| | Add data encryption at rest for sensitive fields | `arcana_pulse-zx2` |
| | Build privacy policy and terms of service pages | `arcana_pulse-gyq` |
| | Implement CCPA/GDPR data handling | `arcana_pulse-gb9` |
| | SOC 2 readiness checklist and access controls | `arcana_pulse-p3z` |
| | Prepare for third-party penetration testing | `arcana_pulse-vr3` |

**Dependency chain:**
```
Appwrite migration (M6: 9kx) → Audit logging (qf2) ──→ CCPA/GDPR (gb9) → SOC 2 (p3z) → Pen testing (vr3)
                              → Encryption (zx2)       ↑
NextAuth (M6: ph3) → Rate limiting (v9q)    Privacy/ToS (gyq) ─┘
```

---

## Milestone 10 — Scale & Monetization

> Stripe billing, multi-tenant workspaces, notifications, export, admin tooling, mobile app.

| Status | Task | Bead |
|--------|------|------|
| | Integrate Stripe subscription billing | `arcana_pulse-eor` |
| | Build multi-tenant workspace collaboration | `arcana_pulse-yrn` |
| | Add real-time notifications system | `arcana_pulse-ikz` |
| | Build CSV/PDF financial report export | `arcana_pulse-7yq` |
| | Build admin dashboard and support tooling | `arcana_pulse-bvk` |
| | Build React Native mobile app | `arcana_pulse-e5f` |

**Dependency chain:**
```
Appwrite migration (M6: 9kx) → Stripe billing (eor) ──→ Admin dashboard (bvk) → Mobile app (e5f)
NextAuth (M6: ph3) → Workspaces (yrn) ────────────────┘
Spending insights (M7: dm6) → Notifications (ikz)
Appwrite migration (M6: 9kx) → CSV/PDF export (7yq)
```

---

## Epics

| Epic | Status | Phase |
|------|--------|-------|
| Platform foundation | ✅ Complete (M1-M2) | `arcana_pulse-5g0` |
| Connected banking | ✅ Complete (M3) | `arcana_pulse-58p` |
| Finance tracker SaaS layer | ✅ Complete (M2) | `arcana_pulse-2jq` |
| Transfers, monitoring, hardening | ✅ Complete (M4-M5) | `arcana_pulse-h8h` |
| Production data layer | Open (M6) | `arcana_pulse-zgh` |
| AI financial intelligence | Open (M7) | `arcana_pulse-099` |
| Investment and portfolio | Open (M8) | `arcana_pulse-yhp` |
| Compliance and security | Open (M9) | `arcana_pulse-hh4` |
| Scale and monetization | Open (M10) | `arcana_pulse-e93` |

---

## Progress Summary

| Metric | Count |
|--------|-------|
| Total issues | 75 |
| Closed | 39 |
| Open | 36 |
| Blocked (waiting on dependency) | 29 |
| Ready to work | 7 |
