# Arcana Pulse — Detailed Project Guide & Architecture Overview

**Arcana Pulse** is the consumer-facing money management application for **Arcana Credit Union**, designed as a sandbox-first digital banking experience that integrates standard credit-union portal features with a robust finance management SaaS tracker.

This document outlines the project's core intent, strategic fit, feature catalog, technical architecture, and implementation details.

---

## 1. Core Product Intent & Vision

Arcana Pulse is structured as **two layers unified into a single experience**:

1. **Digital Banking Sandbox Layer**: Implements core credit-union digital operations, including member authentication, bank account linking via Plaid, live balance queries, transaction feed synchronization, and fund transfers via Dwolla.
2. **Personal Finance Management (PFM) SaaS Layer**: Empowers members with manual transaction CRUD, spending analysis, dynamic forecasting, AI-driven budget planning, savings goals projections, and portfolio tracking in isolated multi-tenant workspaces.

By combining both layers, Arcana Pulse bridges the gap between passive banking portals and active manual budgeting spreadsheets.

### Strategic Fit & Career Empowerment
Unlike generic finance tools, Arcana Pulse is positioned to support **member career mobility and financial literacy**:
* **Career Pathway Dashboard**: Tracks professional advancement, educational milestones, and licensing readiness.
* **AI Career Coach**: Provides interview coaching and resume building based on financial targets.
* **Advising Network**: Prepares users for careers in wealth advising and connects them to financial services pipelines.

---

## 2. Platform Feature Catalog

Arcana Pulse is organized into distinct functional domains, navigated via a unified app shell:

### A. Core Account & Workspace Management
* **Multi-Tenant Workspaces**: Financial data is strictly partitioned inside workspace tenants (`workspaces` collection), preventing cross-account data exposure.
* **Persona-Based Dashboard Routing**: Users are routed to specialized dashboards based on membership type:
  * **Students/Job Seekers**: Routed to `/intelligence/career` to focus on skills and job progression.
  * **Employers**: Routed to `/employer/dashboard` for talent pipelines and ledger management.
  * **Retail Members**: Routed to the personal `/dashboard`.
* **MFA (TOTP) Security**: Multi-factor authentication configured in member settings.

### B. Banking & Fund Movements (Sandbox)
* **Plaid Account Linking**: Connects real or sandbox checking/savings accounts securely, exposing active balances and masking account numbers in the UI.
* **Dwolla ACH Transfers**: Allows account-to-account money movement using Dwolla funding sources. Shows status updates (Pending, Processing, Cleared) with automated Dwolla webhook handling.
* **Statement Account Viewer**: An individual bank dashboard for each connected account, detailing running balances, period summaries, print-ready views, and statement imports.

### C. Unified Transaction Ledger
* **Canonical Transaction Model**: Merges three distinct transaction sources into a single database representation:
  * `synced`: Real-time banking updates pulled via Plaid API.
  * `manual`: User-created entries for cash, checks, or unlinked activity.
  * `transfer`: Internal credit-union movements tracked by the platform.
* **Workspace-Enforced CRUD**: Ensures that members can freely add, modify, and delete manual transaction records, while locking synced banking records to preserve audit integrity.
* **Granular Filtering & Pagination**: Allows search-by-title, filtering by bank account/category, and standard 10-item page-based navigation.

### D. AI Financial Intelligence
Powered by the **Anthropic Claude AI SDK**, the platform provides:
* **AI Categorization Engine**: Automatically classifies incoming raw transaction descriptions into standard budgets.
* **Spending Anomaly & Insights**: Pinpoints spikes in discretionary categories (e.g., shopping, dining out) and surfaces alerts.
* **Natural Language Chat Assistant**: A financial copilot (`/assistant`) allowing members to query their financial ledgers using natural language (e.g., *"How much did I spend on coffee in the last 30 days?"*).
* **Cash Flow Forecasts**: Runs pattern recognition on historical data to map projected income, recurring utility costs, and upcoming budget obligations.
* **Budget Projections**: Recommends monthly spending adjustments dynamically based on savings target performance.

### E. Investment & Portfolio Tracking
* **Plaid Investments**: Connects brokerage and retirement accounts to track stock holdings and asset distribution.
* **Alpaca Paper Trading Integration**: Visualizes live investment positions, tracks dividend schedules, and recommends tax-loss harvesting plans.

---

## 3. Technology Stack & Directory Structure

### Technical Stack
* **Framework**: Next.js 14 (App Router)
* **Language**: TypeScript
* **Styling**: Vanilla CSS + Tailwind CSS + shadcn/ui for unified visual aesthetics
* **State & Animation**: React 18 & Framer Motion
* **Database & Auth**: Appwrite (Backend-as-a-Service) & NextAuth.js
* **API Integrations**: Plaid SDK, Dwolla SDK, Alpaca API, Anthropic SDK
* **Error Tracking**: Sentry (Client, Server, Edge instrumentation)

### Key Directory Layout
```text
arcana_pulse/
├── src/
│   ├── app/                    # Next.js App Router Pages
│   │   ├── (auth)/             # Sign-In, Sign-Up, Forgot Password pages
│   │   └── (root)/             # Dashboard, Accounts, Transactions, Transfers
│   ├── components/             # Reusable UI widgets and charts
│   ├── lib/                    # Business logic and services
│   │   ├── ai/                 # Anthropic AI interface
│   │   ├── db/                 # Appwrite collections configuration
│   │   ├── services/           # Services (transactions, wallets, forecasts)
│   │   └── utils.ts            # Formatting utilities
│   └── middleware.ts           # Route guard and rate limiter
├── docs/                       # Product requirements and manuals
├── SCHEMA.md                   # Database collection schemas
├── ROADMAP.md                  # Milestone status tracking
└── package.json                # Project dependencies
```

---

## 4. Architectural & Production Integrity

To remain production-ready, the platform implements strict resilience practices:

### 1. Robust Middleware Guards
* **IP Rate Limiting**: Next.js middleware tracks request sources and limits mutations (sign-in, MFA, password resets) to deter brute-force attempts.
* **CORS Validation**: Blocks cross-origin API requests from unapproved domains, while leaving open paths for OAuth callbacks and MCP tool endpoints.
* **HTTPS Enforcement**: Forces secure connections (308 redirect) in production.

### 2. Sentry Instrumentation & PII Scrubbing
* Every page incorporates error boundaries to isolate component-level failures.
* Log payloads pass through scrubbing filters to sanitize personal identifying information (PII) like raw account numbers, routing codes, and email addresses before forwarding to Sentry.

### 3. Cross-Timezone Hydration Consistency
* Next.js server-rendered HTML can trigger React Hydration failures if client and server construct dates in different system timezones (e.g. UTC on production containers vs PST/EST on local computers).
* To prevent this mismatch, the app overrides standard time queries via a central `formatDate` utility in `src/lib/utils.ts` which forces **UTC-timezone formatting** by default.

### 4. Dynamic Router Suspense Boundaries
* During production compilation (`next build`), Next.js attempts to statically compile client-side pages.
* If a page invokes functions that read active search parameters (e.g. `useSearchParams()`) outside a wrapper boundary, compilation bails. 
* Arcana Pulse isolates search parameter components inside `<Suspense>` wrappers (e.g., `/my-banks`) to guarantee compile-time and runtime robustness.
