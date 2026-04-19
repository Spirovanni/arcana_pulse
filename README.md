<div align="center">
  <img src="/Users/xaviermartinez/.gemini/antigravity/brain/4d4949fb-bb86-4570-8a65-82170fa74e4b/arcana_pulse_banner_1776561905126.png" alt="Arcana Pulse Banner" width="100%" />
  
  # Arcana Pulse
  
  **The consumer-facing money management application for Arcana Credit Union**
  
  Combining the connected-account feel of a modern credit union portal with the daily utility of a SaaS finance tracker.
</div>

---

## 📖 Overview

**Arcana Pulse** is strategically designed as **two layers in one experience**:

1. **Sandbox Credit-Union Banking Layer:** Handles onboarding, linked accounts via Plaid, balances, transaction feeds, and realistic transfer workflows via Dwolla.
2. **Finance Management SaaS Layer:** Provides members the ability to organize, edit, categorize, and analyze financial activity through dashboards, dedicated income/expense views, AI insights, and financial summary metrics.

It provides members with a unified financial cockpit where they can connect accounts, understand cash flow, manage categorized transactions, and move money between accounts inside a polished, modern fintech experience.

---

## ✨ Key Features

- **Multi-Tenant Workspaces (SaaS Ready):** Each member operates within an isolated workspace.
- **Secure Authentication:** Robust user onboarding and session management.
- **Banking Integration:** Link multiple real or sandbox bank accounts using **Plaid**.
- **Fund Transfers:** Account-to-account money movement powered by **Dwolla**.
- **Canonical Transactions:** A unified ledger that intelligently combines synced banking data with manual member entries.
- **Interactive Dashboards:** Rich financial reporting including balance tracking, income/expense analysis, category breakdowns, and cash flow charts.
- **AI Financial Intelligence (Milestone 7):** AI-powered transaction categorization, anomaly detection, budget recommendations, and natural language chat assistance.
- **Enterprise Reliability:** Error boundaries, PII scrubbing, and real-time monitoring via **Sentry**.

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database & Auth:** Appwrite (Backend-as-a-Service)
- **Integrations:**
  - Plaid (Bank Account Linking & Transactions)
  - Dwolla (ACH Transfers)
  - Anthropic AI SDK (Financial Intelligence)
- **Monitoring:** Sentry
- **Deployment:** Vercel

---

## 📂 Project Structure

```text
arcana_pulse/
├── src/
│   ├── app/                # Next.js App Router (Public & Protected routes)
│   │   ├── (auth)/         # Sign in, Sign up flows
│   │   └── (root)/         # Dashboard, Accounts, Transactions, Transfers
│   ├── components/         # Reusable UI components (Modals, Charts, Nav)
│   └── lib/                # Core business logic and services
│       ├── services/       # Domain services (workspace, transactions, transfers)
│       ├── resilience/     # Circuit breakers and retry logic for external APIs
│       ├── db/             # Appwrite database client & queries
│       ├── ai/             # Anthropic AI integrations
│       └── types/          # TypeScript interfaces
├── scripts/                # Database migrations and seeding
├── docs/                   # Product Requirements (PRD)
├── SCHEMA.md               # Database schema definition
└── ROADMAP.md              # Project status and upcoming milestones
```

---

## 🚀 Getting Started

Follow these steps to set up the development environment.

### 1. Requirements
- Node.js (v18+)
- Appwrite instance (Cloud or self-hosted)
- Plaid Sandbox API keys
- Dwolla Sandbox API keys

### 2. Environment Variables
Copy the `.env.example` file to create a `.env.local` file:
```bash
cp .env.example .env.local
```
Fill in the required values in `.env.local` including your Appwrite project and API keys, Plaid secrets, and Dwolla keys.

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Seeding
Arcana Pulse requires specific collections and indexes in your Appwrite instance. Run the provided scripts to provision the schema and populate it with mock data:

```bash
# Provision collections, attributes, and indexes
npx tsx scripts/db-setup.ts

# Seed the database with mock workspaces, users, banks, and transactions
npx tsx scripts/db-seed.ts
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

---

## 🗄 Database Schema

The platform relies on a strict tenant-boundary architecture within Appwrite. 

- **`workspaces`:** Tenant boundaries isolating financial data.
- **`users`:** Platform members mapped to workspaces.
- **`banks`:** Connected institutional accounts.
- **`transactions`:** Canonical records for synced, manual, and transfer activities.
- **`transfers`:** Fund movement tracking through initiation, processing, and clearing states.
- **`sessions`:** Authentication tokens.

For detailed schema definitions, see [SCHEMA.md](./SCHEMA.md).

---

## 🗺 Roadmap & Status

We are currently tracking against **Milestone 6 (Production Data Layer)** and **Milestone 7 (AI Financial Intelligence)**. 

For the complete task list, Bead tracking, and progress summary, please refer to the [ROADMAP.md](./ROADMAP.md).

---

## 📜 Legal / Compliance Caveat
*Note: Arcana Pulse is a demonstration consumer application for Arcana Credit Union operating in a sandbox environment. Real-world deployment involves extensive KYC/AML compliance, charter validation, fraud control, and reconciliation infrastructure outside the scope of this repository.*
