
# Arcana Pulse
## Product Requirements Document (PRD) + Project Description

**Version:** 1.1  
**Prepared for:** Max  
**Prepared on:** March 14, 2026  
**Institution Brand:** Arcana Credit Union  
**Consumer App:** Arcana Pulse  
**Primary Domain:** arcanacu.org

---

## 1. Project Description
**Arcana Pulse** is the consumer-facing money management application for **Arcana Credit Union**, delivered through **arcanacu.org** as a sandbox-first digital banking experience. It combines the connected-account feel of a modern credit union portal with the daily utility of a finance tracker: members can create an account, complete onboarding, link one or more external financial accounts, view aggregated balances and transaction feeds, move money between platform-linked accounts, and actively manage their finances through income, expense, category, and analytics workspaces.

The product is intentionally designed as **two layers in one experience**:

1. A **sandbox credit-union banking layer** that handles onboarding, linked accounts, balances, transaction feeds, member-friendly transfer identifiers, and transfer workflows.
2. A **finance management SaaS layer** that gives members the ability to organize, edit, categorize, and analyze financial activity through dashboards, income and expense views, transaction CRUD, reporting, and financial summary metrics.

The result is not “a budget tracker with a bank skin” and not “a banking demo with no everyday utility.” It is a finance operating layer inside a branded member banking shell.

### Brand Architecture
- **Institution / umbrella brand:** Arcana Credit Union
- **Consumer app / member experience:** Arcana Pulse
- **Primary public domain:** arcanacu.org
- **Working legal / product posture:** sandbox credit-union-style platform unless and until a real charter, compliance program, and operational infrastructure are established

At launch, the product centers on six core experiences:
- **Authentication and onboarding**
- **Connected accounts**
- **Unified dashboard**
- **Transactions**
- **Income and expense workspaces**
- **Internal payment transfer**

This PRD frames Arcana Pulse as the **member application for Arcana Credit Union’s sandbox platform**, not evidence of an already chartered financial institution. Real-world launch under a true credit union structure would still require substantial compliance, operations, reconciliation, fraud, member support, and legal work beyond the application scope.

## 2. Product Vision
Give Arcana Credit Union members a single financial cockpit where they can connect accounts, understand cash flow, manage categorized transactions, and move money between accounts inside a polished credit union style experience.

## 3. Product Positioning
### One-sentence positioning
A connected money-management app for Arcana Credit Union members, combining finance tracking with a sandbox digital banking experience.

### What makes it different
Most products choose one lane:
- budgeting and manual tracking, or
- digital banking access and money movement.

Arcana Pulse combines both:
- **connected account visibility** from the digital banking side,
- **manual control and analytics** from the finance tracker side,
- and **productized SaaS structure** so the platform can serve many members and future workspace types as a hosted product.

### Core promise
Members should be able to:
- connect real or sandbox financial accounts,
- see balances and transaction feeds,
- manually add or edit finance records where needed,
- separate income and expense activity,
- view visual reporting and summary metrics,
- and initiate internal transfers without leaving the product.

## 4. Problem Statement

Members often have to choose between two imperfect product categories.

### Category A: finance trackers
These tools help members log income and expenses, but they usually lack:
- live or linked account context,
- bank-style dashboards,
- account-to-account transfer experiences,
- and a more realistic financial hub feel.

### Category B: banking or credit-union-style products
These tools offer connected accounts and money movement, but they often lack:
- strong manual transaction management,
- dedicated income and expense workspaces,
- customizable categorization,
- and richer financial planning or reporting insight.

As a result, members split their behavior across multiple tools. Arcana Pulse solves that by merging **bank-linked visibility** with **finance-tracker control** in one SaaS product.

---

## 5. Product Goals

### Primary goals
1. Enable members to securely create an account and complete onboarding.
2. Allow members to connect one or more bank accounts through a guided linking flow.
3. Show a unified financial dashboard with balances, account distribution, money flow, categories, and recent transactions.
4. Support a canonical transaction model that includes synced bank activity and member-managed records.
5. Provide dedicated income and expense views for focused financial management.
6. Allow transfers between platform-linked accounts using a guided payment workflow.
7. Make the product SaaS-ready with a clear account model, tenant boundaries, and extensible architecture.

### Desired outcomes
- Members complete signup and bank linking without confusion.
- Members can understand their financial picture from the dashboard alone.
- Members can review linked transactions and also manage their own records when categorization or manual entries are needed.
- Members can identify income trends, expense drivers, and savings behavior visually.
- Members can complete transfers with clear confirmation and status visibility.
- The product can evolve from portfolio/demo quality into a credible hosted fintech platform.

---

## 6. Product Principles

### 6.1 Banking feel, tracker usefulness
The product should feel like a modern fintech portal while still delivering everyday finance management utility.

### 6.2 One source of truth for transactions
Synced and manual records should live in one canonical transaction domain, even if the UI exposes filtered views like Income or Expense.

### 6.3 Clarity over cleverness
Financial interfaces should be explicit. Source accounts, balances, transfer states, categories, and metrics should never require detective work.

### 6.4 Security and trust first
Auth, route protection, secrets, data isolation, and sensitive workflow handling are first-class product requirements.

### 6.5 SaaS by design
The product should be structured for multiple customers or workspaces, even if the first release targets an individual-member experience.

### 6.6 Extensible architecture
Recurring transactions, subscriptions, notifications, admin tooling, reconciliation, and stronger compliance layers should be addable without rewriting the whole product.

---

## 7. Target Members

### Primary member
**Financially engaged individual or operator**  
Someone who wants a more powerful financial home base than a spreadsheet or basic tracker, but does not want full accounting software.

### Secondary member
**Fintech explorer / sandbox tester**  
Someone who wants to link accounts, see balances, inspect transactions, and simulate money movement in a realistic product environment.

### Tertiary member
**Technical evaluator or startup builder**  
Someone assessing the product as a showcase of full-stack fintech architecture, SaaS product thinking, and production-minded UX.

---

## 8. Personas

### Persona 1: Connected Cash-Flow Member
- Wants to see multiple accounts in one place
- Cares about balance visibility and recent activity
- Needs simple category and trend insight
- Occasionally moves money between accounts

### Persona 2: Manual Finance Organizer
- Wants to control categories and manually add records
- Prefers seeing dedicated income and expense pages
- Uses dashboard summaries to understand spending behavior

### Persona 3: Product Evaluator
- Reviews the application for architecture, integrations, polish, and scale-readiness
- Cares about auth, linked banking workflows, transaction design, and deployability

---

## 9. SaaS Model

### Recommended SaaS framing
Arcana Pulse should be positioned as a hosted finance product with **workspace-based ownership**.

### Workspace model
- Each member belongs to at least one workspace.
- A default personal workspace is created at signup.
- All banks, transactions, dashboards, and transfers are scoped to a workspace.
- Future versions may support shared workspaces, household use, or advisor/client visibility.

### Tenant boundary rule
No member should be able to read or mutate another workspace’s banking or finance data without explicit role-based permission.

### Packaging concept
- **Starter**: one member, up to N linked banks, core dashboard and tracking
- **Pro**: more linked accounts, advanced analytics, exports, rules, recurring entries
- **Team/Household**: multi-member workspace, roles, shared views

> Billing implementation is outside the MVP unless explicitly added later, but the data model and permission model should be SaaS-ready from day one.

---

## 10. MVP Scope

### Included in MVP
- Sign up and sign in
- Onboarding form
- Protected routes
- Workspace creation for new member
- Bank linking via Plaid sandbox
- Account and member persistence
- Funding source setup for sandbox transfer workflows
- Unified dashboard with:
  - total current balance,
  - total income,
  - total expense,
  - total transaction value,
  - account distribution chart,
  - money flow chart,
  - category breakdown,
  - recent transactions,
  - financial summary card
- Accounts page
- Unified transactions page
- Dedicated income page
- Dedicated expense page
- Transaction create, update, delete
- Filter by account and type
- Pagination for transaction history
- Internal transfer flow
- Transfer status visibility
- Responsive navigation and layouts
- Monitoring and error tracking
- Vercel-deployable build

### Out of scope for MVP
- Real production KYC/AML operations
- ACH returns and disputes
- Card issuance
- Bill pay
- Ledger reconciliation tooling
- Subscription billing implementation
- Budget envelopes
- Tax workflows
- Investment tracking
- Advanced household collaboration
- Native mobile app
- Full admin back office

---

## 11. Non-Goals for MVP

The MVP does **not** attempt to become:
- a regulated bank,
- a full accounting suite,
- an ERP,
- a tax filing system,
- or a complete budgeting universe with every financial feature under the sun.

This version aims to be a believable, useful, extensible fintech SaaS product with strong core workflows.

---

## 12. Core User Stories

### Authentication and onboarding
- As a new member, I want to create an account and be redirected into onboarding so I can begin using the platform immediately.
- As a returning member, I want secure sign-in so I can access my workspace and financial data.
- As a member, I want protected routes so my banking and finance data remains private.

### Workspace model
- As a new member, I want a personal workspace created automatically so I can start without setup friction.
- As the platform, we want tenant boundaries so members only access their own data.

### Bank linking
- As a member, I want to connect one or more bank accounts so I can view balances and transactions in one place.
- As a member, I want newly linked banks to appear across dashboard, Accounts, and transaction history.

### Transactions and finance tracking
- As a member, I want to view all transactions in a unified list across connected accounts and manual entries.
- As a member, I want to add manual income or expense entries when something is missing or needs adjustment.
- As a member, I want to edit and delete records so my financial picture stays accurate.
- As a member, I want dedicated income and expense pages so I can focus on one side of my cash flow at a time.

### Dashboard and analytics
- As a member, I want to see balances, income, expense, savings behavior, categories, and recent activity immediately.
- As a member, I want charts that help me understand account distribution and month-by-month flow.
- As a member, I want a recent activity table and a “See all” pathway to deeper transaction history.

### Transfers
- As a member, I want to choose a source bank, enter recipient information, and submit a transfer.
- As a member, I want to see transfer status so I understand whether the transfer is pending, processing, posted, or failed.

### Reliability
- As a member, I want the product to work well on mobile and desktop.
- As the product team, we want monitoring and replay so we can diagnose issues without exposing sensitive values.

---

## 13. Functional Requirements

### 13.1 Authentication and access
The system shall:
- support sign up and sign in,
- support protected routes,
- support logout,
- establish an authenticated session,
- create a default personal workspace for new members,
- isolate all finance and banking data by workspace.

### 13.2 Registration data
The onboarding flow shall collect, at minimum:
- first name,
- last name,
- email,
- password,
- address,
- city,
- state,
- postal code,
- date of birth,
- sandbox identity fields required for connected-banking flows.

### 13.3 Workspace model
The system shall persist:
- workspace ID,
- workspace name,
- owner user ID,
- plan or subscription placeholder field,
- created/updated timestamps.

### 13.4 User model
The system shall persist:
- user ID,
- workspace membership,
- email,
- profile information,
- role,
- created/updated timestamps.

### 13.5 Bank linking
The system shall:
- generate a Plaid link token,
- launch the bank-link flow,
- exchange the public token for an access token,
- retrieve account data,
- create a funding source for transfer workflows,
- persist linked bank records,
- support more than one linked bank per workspace.

A bank record shall include:
- bank/account ID,
- institution name,
- mask or display identifier,
- access token reference,
- funding source URL,
- Arcana Transfer ID,
- workspace ID,
- timestamps.

### 13.6 Canonical transaction model
The system shall use a single transaction domain that can represent:
- bank-synced transactions,
- manual income entries,
- manual expense entries,
- internal transfer records.

Each transaction shall support, at minimum:
- transaction ID,
- workspace ID,
- source type (`synced`, `manual`, `transfer`),
- transaction type (`income`, `expense`, `transfer`),
- title or name,
- category,
- amount,
- date,
- account or bank reference where applicable,
- status,
- notes,
- created/updated timestamps.

### 13.7 Transaction management
The system shall:
- allow manual transaction creation,
- allow updates and deletion for manual records,
- fetch all transactions for a workspace,
- filter by bank account, type, category, and date range where supported,
- synchronize transaction changes across dashboard, transactions, income, and expense views.

### 13.8 Income page
The income page shall:
- display income records only,
- support add, edit, and delete for manual income entries,
- render an income chart,
- show empty and loading states.

### 13.9 Expense page
The expense page shall:
- display expense records only,
- support add, edit, and delete for manual expense entries,
- render an expense chart,
- show empty and loading states.

### 13.10 Transactions page
The transactions page shall:
- show all transactions in one view,
- support pagination,
- support account and type filtering,
- display icon or label, title, type, category, date, amount, source, and actions,
- support a chart that visualizes transaction trends.

### 13.11 Dashboard
The dashboard shall:
- greet the signed-in member,
- display summary cards for total current balance, total income, total expense, and total transaction value,
- show account distribution,
- show monthly money flow,
- show category breakdown,
- show recent transactions,
- show a financial summary card,
- provide quick navigation into transactions, accounts, income, expense, and transfer workflows.

### 13.12 Accounts
The Accounts page shall:
- list all connected banks,
- show balances,
- show Arcana Transfer IDs,
- support add-bank actions,
- provide bank-level navigation into transactions.

### 13.13 Internal transfer flow
The transfer flow shall:
- allow source bank selection,
- accept recipient email or workspace-linked identity where applicable,
- accept recipient Arcana Transfer ID,
- accept amount and note,
- create a transfer record,
- display transfer status,
- reflect the transfer in transaction history and dashboard activity.

### 13.14 Monitoring and supportability
The system shall:
- integrate Sentry or equivalent monitoring,
- support session replay,
- avoid exposing sensitive values in monitoring,
- provide error traces for failed onboarding, linking, CRUD, and transfer flows.

### 13.15 Deployment
The product shall:
- deploy to Vercel,
- support environment-based secrets,
- maintain functional auth, bank linking, finance tracking, and transfer flows in deployed environments.

---

## 14. Information Architecture

### Primary navigation
- Dashboard
- Accounts
- Transactions
- Income
- Expense
- Transfer Funds
- Settings
- Logout

### Route groups
1. **Public**
   - Sign In
   - Sign Up
2. **Authenticated**
   - Dashboard
   - Accounts
   - Transactions
   - Income
   - Expense
   - Transfer Funds
   - Settings / Workspace

### Navigation behavior
- Desktop: persistent sidebar
- Mobile: collapsible drawer or sheet

---

## 15. Key User Flows

### 15.1 New member to active dashboard
1. Member signs up.
2. Session is created.
3. Personal workspace is created.
4. Member completes onboarding.
5. Member is redirected to connect a bank.
6. Linked account is saved.
7. Member lands on dashboard with first account context.

### 15.2 Add a second bank
1. Member opens Accounts or dashboard.
2. Member selects connect bank.
3. Plaid link launches.
4. New bank and account data are stored.
5. Dashboard, Accounts, and transactions update.

### 15.3 Add a manual finance record
1. Member opens Income, Expense, or Transactions.
2. Member opens add modal or form.
3. Member selects type if applicable.
4. Member enters title, category, amount, date, and notes.
5. System saves record.
6. Dashboard and filtered views refresh.

### 15.4 Review transactions
1. Member opens Transactions.
2. Member views full history across synced and manual records.
3. Member filters by account, type, or category.
4. Member pages through history.

### 15.5 Transfer funds
1. Member opens Transfer Funds.
2. Member selects source bank.
3. Member enters recipient Arcana Transfer ID, email, note, and amount.
4. System validates data.
5. Transfer is submitted.
6. Transfer record is created.
7. Member sees processing/pending state.
8. Activity appears in dashboard and transaction history.

---

## 16. Data Model Overview

### 16.1 Workspace
- workspaceId
- name
- ownerUserId
- plan
- status
- createdAt
- updatedAt

### 16.2 User
- userId
- workspaceId
- email
- firstName
- lastName
- imageUrl
- role
- createdAt
- updatedAt

### 16.3 Bank
- bankId
- workspaceId
- institutionName
- accountId
- displayMask
- accessTokenRef
- fundingSourceUrl
- shareableId
- balance
- createdAt
- updatedAt

### 16.4 Transaction
- transactionId
- workspaceId
- bankId (nullable)
- sourceType
- transactionType
- title
- category
- amount
- date
- status
- note
- externalReference
- createdBy
- createdAt
- updatedAt

### 16.5 Transfer
- transferId
- workspaceId
- senderBankId
- receiverBankId or receiverShareableId
- amount
- note
- recipientEmail
- status
- providerReference
- createdAt
- updatedAt

### 16.6 Derived dashboard metrics
- total current balance
- total income
- total expense
- total transaction value
- savings rate
- spending rate
- top category
- account count
- recent activity list

---

## 17. Recommended Unified Architecture

The two source projects use different backend approaches. For the merged product, the recommended direction is to **standardize on a single platform architecture** instead of preserving duplicated auth and data layers.

### Recommended stack
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Charts:** Chart.js or Highcharts (choose one and standardize)
- **Auth + data persistence:** Appwrite **or** Clerk + MongoDB, but not both in production
- **Bank linking:** Plaid
- **Sandbox transfer rails:** Dwolla
- **Monitoring:** Sentry
- **Hosting:** Vercel

### Preferred merged approach
Use the **Horizon-style base** as the platform shell:
- Next.js App Router
- server actions / server-side logic
- Appwrite collections for members, workspaces, banks, and transactions

Then bring in the **FlowArc finance tracker domain**:
- canonical transaction model,
- income/expense filtered views,
- dashboard financial summary metrics,
- manual CRUD and analytics.

### Why this is recommended
- Fewer moving parts
- Less auth duplication
- Clearer tenant model
- Better fit for a single hosted fintech product
- Easier long-term productization

---

## 18. API / Service Requirements

### Authentication / member lifecycle
- create user
- create workspace
- fetch current session
- logout user

### Banking services
- create Plaid link token
- exchange public token
- fetch linked accounts
- create funding source
- fetch bank balances
- fetch bank transactions

### Transaction services
- create transaction
- update transaction
- delete transaction
- list transactions
- aggregate dashboard metrics

### Transfer services
- create transfer
- list transfers
- fetch transfer status
- map provider status to member-facing status labels

### Settings and workspace
- fetch workspace details
- update workspace name
- fetch members / roles (future-ready)
- fetch plan state placeholder

---

## 19. UX Requirements

### Visual direction
- modern fintech styling
- clean hierarchy
- confidence-building balance presentation
- mobile-responsive dashboard
- consistent charts and table patterns

### Interaction requirements
- async actions must have visible loading states
- empty states should invite next action
- transfer forms must explain recipient Arcana Transfer IDs clearly
- finance entry forms must be fast, consistent, and forgiving
- charts should be legible and not overloaded

### Accessibility requirements
- sufficient contrast
- keyboard-navigable forms and dialogs
- semantic labels
- screen-reader-friendly form controls
- meaningful button text and icon usage

---

## 20. Security, Privacy, and Compliance Notes
### Security requirements
- secrets must be stored in environment variables,
- all protected routes must require authenticated context,
- workspace boundaries must be enforced at the data layer,
- sensitive actions must run server-side,
- monitoring must avoid capturing raw sensitive member inputs.

### Brand and compliance caveat
Arcana Pulse is presented here as the consumer application for **Arcana Credit Union**, but this PRD assumes a **sandbox / pre-charter / concept-stage environment** unless a real legal entity, charter, and compliance framework are in place. The product may look and feel like credit union banking, but a real public launch with actual deposits or money movement would still require, at minimum:
- charter and regulatory pathway validation,
- KYC/AML program design,
- OFAC/sanctions screening,
- fraud and risk controls,
- dispute and support operations,
- privacy policy and terms,
- reconciliation processes,
- vendor/legal review,
- incident response procedures.

That is the classic difference between “this demo is convincing” and “this institution is actually cleared to open the doors.”

## 21. Non-Functional Requirements

### Performance
- dashboard should feel immediate after login,
- transaction CRUD should update visible state quickly,
- charts should remain responsive for moderate datasets,
- filter and pagination should preserve usability as data grows.

### Reliability
- bank-link and transfer failures should fail safely,
- provider errors should surface cleanly,
- critical flows should be monitored and diagnosable.

### Maintainability
- modular UI components,
- isolated service layer,
- reusable finance form patterns,
- canonical transaction model rather than scattered record logic.

### Scalability
- architecture should support more members, more workspaces, more banks, and more transaction volume without a redesign.

---

## 22. Success Metrics

### Product metrics
- signup completion rate
- bank-link completion rate
- percentage of members who add at least one manual transaction
- average linked accounts per workspace
- transaction history engagement
- dashboard return rate after first successful bank link
- transfer initiation rate

### Quality metrics
- auth failure rate
- bank-link failure rate
- transfer validation failure rate
- transaction CRUD success rate
- mobile layout issue count
- time to diagnose issues via monitoring

### Business metrics for future SaaS expansion
- activated workspaces
- plan conversion rate
- retention by workspace
- average linked bank count by plan tier

---

## 23. Risks

### Product risk
Members may misunderstand the product as a real bank. Positioning and in-product disclosure must be explicit.

### Architecture risk
Using two conflicting auth/data stacks would create unnecessary complexity and maintenance drag.

### Data consistency risk
Synced bank transactions, manual edits, and transfer records can drift unless the transaction model is normalized carefully.

### UX risk
If the system does not clearly separate synced activity, manual entries, and transfer records, members may lose trust in the data.

### Operational risk
Production-grade money movement requires operational maturity beyond app code.

---

## 24. Recommended Productization Improvements

### Priority improvements
1. Unify all financial records into a canonical transaction service.
2. Add transaction source labels: synced, manual, transfer.
3. Add stronger dashboard filters by account and time range.
4. Add receipt and confirmation states for transfers.
5. Add transfer lifecycle labels: initiated, pending, processing, posted, failed, reversed.
6. Add search and richer filtering across transactions.
7. Add recurring transaction support.
8. Add exports (CSV/PDF) for finance reporting.
9. Add workspace settings and role management.
10. Add analytics events for onboarding, bank linking, CRUD, and transfers.

### Phase 2 ideas
- budgets by category
- savings goals
- notifications
- recurring transfers
- household or team collaboration
- advisor/client mode
- subscription billing
- admin and support tooling
- reconciliation jobs
- suspicious activity controls

---

## 25. Release Plan

### Phase 1 — Platform foundation
- auth
- workspace creation
- routing and layout shell
- settings foundation
- monitoring baseline

### Phase 2 — Connected banking
- Plaid link
- bank persistence
- balances
- Accounts
- transaction feed ingestion

### Phase 3 — Finance tracker SaaS
- canonical transaction model
- manual transaction CRUD
- income and expense pages
- dashboard metrics
- category breakdowns
- financial summary

### Phase 4 — Transfers and hardening
- transfer workflow
- status lifecycle
- better empty/loading states
- QA across mobile and desktop
- deployment stabilization

---

## 26. Recommended One-Paragraph External Project Description
**Arcana Pulse** is the consumer-facing financial management app for **Arcana Credit Union**, designed as a sandbox-ready digital banking experience at **arcanacu.org**. Members can sign up, connect multiple financial accounts, view balances and transaction history, manage manual income and expense records, analyze cash flow through dashboard charts and financial summary metrics, and initiate internal transfers between linked accounts. The product is structured as a multi-tenant, deployment-ready finance platform that blends credit-union-style member experience with modern SaaS product architecture.

## 27. Recommended Short Portfolio Description
Built **Arcana Pulse**, the consumer app for **Arcana Credit Union**, to merge connected account visibility, transaction tracking, income and expense management, dashboard analytics, and internal transfer workflows into a single sandbox digital banking experience.

## 28. Final Recommendation
Treat **Arcana Pulse** as the financial operating layer inside **Arcana Credit Union’s** member-facing platform. Use the Arcana Credit Union brand to establish trust, institution-level framing, and a coherent public identity through **arcanacu.org**. Use Arcana Pulse to deliver the everyday value: transaction control, cash-flow understanding, account connectivity, and guided transfers.

In other words: **Arcana Credit Union** is the institution story, and **Arcana Pulse** is the product people actually live in.

