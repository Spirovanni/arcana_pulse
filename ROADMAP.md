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

## Milestone 4 — Transfer Workflow

> Transfer service, form validation, confirmation, Dwolla sandbox integration, status lifecycle.

| Status | Task | Bead |
|--------|------|------|
| ✅ | Build transfer funds page | `arcana_pulse-u0f` |
| ✅ | Create transfer service layer | `arcana_pulse-ban` |
| ⬜ | Wire transfer form with validation and confirmation | `arcana_pulse-2bk` |
| ⬜ | Add transfer status lifecycle display | `arcana_pulse-9jz` |
| ⬜ | Integrate Dwolla sandbox transfer flow | `arcana_pulse-4mi` |
| ⬜ | Add Dwolla API routes for customer and transfer | `arcana_pulse-4rf` |
| ⬜ | Map Dwolla transfer statuses to Arcana lifecycle | `arcana_pulse-zw7` |
| ⬜ | Add Dwolla webhook handler | `arcana_pulse-2sb` |

**Dependency chain:**
```
Transfer page (u0f)
  → Transfer service (ban) → Wire form + validation (2bk) → Status lifecycle (9jz)
  → Dwolla integration (4mi) → Dwolla API routes (4rf) → Status mapping (zw7)
                                                          → Webhook handler (2sb)
```

---

## Milestone 5 — Auth, Monitoring, and Hardening

> Authentication, route protection, Sentry, error handling, deployment.

| Status | Task | Bead |
|--------|------|------|
| ⬜ | Add auth flow with protected route middleware | `arcana_pulse-6b3` |
| ⬜ | Add Sentry monitoring and deployment hardening | `arcana_pulse-785` |
| ⬜ | Install and configure Sentry SDK | `arcana_pulse-9ea` |
| ⬜ | Add error boundaries and PII scrubbing | `arcana_pulse-9pb` |
| ⬜ | Add environment validation and Vercel config | `arcana_pulse-klu` |
| ⬜ | Add loading states and empty state standardization | `arcana_pulse-4qb` |
| ⬜ | Responsive QA and mobile polish | `arcana_pulse-udr` |

**Dependency chain:**
```
Sentry (785) → Install SDK (9ea) → Error boundaries + PII scrubbing (9pb)
             → Env validation + Vercel config (klu)
Auth (6b3) — independent, can be parallelized
Loading states (4qb) — independent
Responsive QA (udr) — final pass, after all features
```

---

## Epics

| Epic | Status | Phase |
|------|--------|-------|
| Platform foundation | ✅ In progress (M1-M2 done) | `arcana_pulse-5g0` |
| Connected banking | ✅ Milestone 3 complete | `arcana_pulse-58p` |
| Finance tracker SaaS layer | ✅ In progress (M2 done) | `arcana_pulse-2jq` |
| Transfers, monitoring, hardening | ⬜ Milestones 4-5 | `arcana_pulse-h8h` |

---

## Progress Summary

| Metric | Count |
|--------|-------|
| Total issues | 39 |
| Closed | 20 |
| Open | 19 |
| Blocked (waiting on dependency) | 16 |
| Ready to work | 10 |

---

## Future (Post-MVP)

These are not tracked as beads yet. They will be created when the MVP milestones are complete.

- Budget envelopes by category
- Recurring transaction support
- CSV/PDF export for finance reporting
- Savings goals with progress tracking
- Notifications (email, in-app)
- Recurring transfers
- Household / team workspace collaboration
- Advisor / client mode
- Subscription billing (Stripe)
- Admin and support tooling
- Reconciliation jobs
- Suspicious activity controls
