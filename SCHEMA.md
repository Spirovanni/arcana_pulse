# Arcana Pulse — Database Schema

**Backend:** Appwrite (Cloud or Self-Hosted)
**Database ID:** `arcana_pulse`
**Database Name:** Arcana Pulse

> This document defines the canonical Appwrite collection schema for all entities in the Arcana Pulse platform. Each collection maps directly to the TypeScript interfaces in `src/lib/types/index.ts`.

---

## Conventions

- **Document ID (`$id`)**: Maps to entity primary key (`workspaceId`, `userId`, etc.). Generated with prefixed IDs (`ws-`, `usr-`, `bnk-`, `txn-`, `xfr-`, `sess-`).
- **Timestamps**: Appwrite provides `$createdAt` and `$updatedAt` automatically on every document. No need for custom timestamp attributes.
- **Workspace scoping**: All user-facing entities include a `workspaceId` attribute with a composite index for tenant isolation.
- **Soft deletes**: Not used. Deletions are hard deletes via `databases.deleteDocument()`.

---

## Collections

### 1. `workspaces`

> Tenant boundary. Every user, bank, transaction, and transfer belongs to exactly one workspace.

| Attribute | Type | Required | Size/Constraints | Description |
|-----------|------|----------|------------------|-------------|
| `$id` | Document ID | auto | — | Maps to `workspaceId` |
| `name` | string | yes | max 128 | Workspace display name |
| `ownerUserId` | string | yes | max 36 | User ID of workspace owner |
| `plan` | enum | yes | `starter`, `pro`, `team` | Subscription plan |
| `status` | enum | yes | `active`, `suspended` | Workspace status |

**Indexes:**

| Name | Type | Attributes | Order |
|------|------|------------|-------|
| `idx_owner` | key | `[ownerUserId]` | ASC |
| `idx_status` | key | `[status]` | ASC |

---

### 2. `users`

> Platform users. Each user belongs to one workspace. Stores auth credentials for sign-in.

| Attribute | Type | Required | Size/Constraints | Description |
|-----------|------|----------|------------------|-------------|
| `$id` | Document ID | auto | — | Maps to `userId` |
| `workspaceId` | string | yes | max 36 | Parent workspace reference |
| `email` | string | yes | max 320 | Login email (case-insensitive lookup) |
| `passwordHash` | string | yes | max 256 | Bcrypt hash (production) |
| `firstName` | string | yes | max 64 | First name |
| `lastName` | string | yes | max 64 | Last name |
| `imageUrl` | string | no | max 2048 | Profile image URL |
| `role` | enum | yes | `owner`, `admin`, `member` | Workspace role |

**Indexes:**

| Name | Type | Attributes | Order |
|------|------|------------|-------|
| `idx_email` | unique | `[email]` | ASC |
| `idx_workspace` | key | `[workspaceId]` | ASC |
| `idx_workspace_role` | key | `[workspaceId, role]` | ASC, ASC |

---

### 3. `banks`

> Connected bank accounts (via Plaid) or manually added accounts.

| Attribute | Type | Required | Size/Constraints | Description |
|-----------|------|----------|------------------|-------------|
| `$id` | Document ID | auto | — | Maps to `bankId` |
| `workspaceId` | string | yes | max 36 | Parent workspace |
| `institutionName` | string | yes | max 128 | Bank name (Chase, BOA, etc.) |
| `accountId` | string | yes | max 128 | External account identifier |
| `displayMask` | string | yes | max 4 | Last 4 digits |
| `accessTokenRef` | string | no | max 256 | Encrypted Plaid access token |
| `fundingSourceUrl` | string | no | max 512 | Dwolla funding source URL |
| `shareableId` | string | yes | max 128 | Transfer-routing identifier |
| `balance` | float | yes | — | Current balance |

**Indexes:**

| Name | Type | Attributes | Order |
|------|------|------------|-------|
| `idx_workspace` | key | `[workspaceId]` | ASC |
| `idx_shareable` | unique | `[shareableId]` | ASC |

---

### 4. `transactions`

> Canonical transaction records. Source can be Plaid sync, manual entry, or transfer side-effect.

| Attribute | Type | Required | Size/Constraints | Description |
|-----------|------|----------|------------------|-------------|
| `$id` | Document ID | auto | — | Maps to `transactionId` |
| `workspaceId` | string | yes | max 36 | Parent workspace |
| `bankId` | string | no | max 36 | Associated bank (null for manual) |
| `sourceType` | enum | yes | `synced`, `manual`, `transfer` | How the record was created |
| `transactionType` | enum | yes | `income`, `expense`, `transfer` | Financial classification |
| `title` | string | yes | max 256 | Description / merchant name |
| `category` | string | yes | max 32 | Category from enum |
| `amount` | float | yes | — | Absolute amount (always positive) |
| `date` | datetime | yes | — | Transaction date (ISO 8601) |
| `status` | enum | yes | `pending`, `posted`, `failed`, `cancelled` | Lifecycle status |
| `note` | string | no | max 1024 | User notes |
| `externalReference` | string | no | max 256 | Plaid transaction ID |
| `createdBy` | string | yes | max 36 | User ID or `"system"` |

**Indexes:**

| Name | Type | Attributes | Order |
|------|------|------------|-------|
| `idx_workspace` | key | `[workspaceId]` | ASC |
| `idx_workspace_date` | key | `[workspaceId, date]` | ASC, DESC |
| `idx_workspace_type` | key | `[workspaceId, transactionType]` | ASC, ASC |
| `idx_workspace_bank` | key | `[workspaceId, bankId]` | ASC, ASC |
| `idx_workspace_source` | key | `[workspaceId, sourceType]` | ASC, ASC |
| `idx_workspace_category` | key | `[workspaceId, category]` | ASC, ASC |
| `idx_workspace_status` | key | `[workspaceId, status]` | ASC, ASC |
| `idx_external_ref` | unique | `[externalReference]` | ASC |
| `idx_search` | fulltext | `[title]` | — |

**Notes:**
- `category` is stored as a plain string (not an Appwrite enum) because the canonical category list (17 values) may grow. Application-layer validation enforces valid values.
- `externalReference` unique index enables efficient duplicate detection during Plaid transaction sync.
- `idx_search` fulltext index on `title` powers the search filter. Appwrite fulltext does not support multi-attribute fulltext on all plans, so `note` search falls back to application-side filtering.

---

### 5. `transfers`

> Fund transfer records between bank accounts (via Dwolla).

| Attribute | Type | Required | Size/Constraints | Description |
|-----------|------|----------|------------------|-------------|
| `$id` | Document ID | auto | — | Maps to `transferId` |
| `workspaceId` | string | yes | max 36 | Parent workspace |
| `senderBankId` | string | yes | max 36 | Sender bank reference |
| `receiverShareableId` | string | yes | max 128 | Receiver routing identifier |
| `recipientEmail` | string | no | max 320 | Recipient email (for display) |
| `amount` | float | yes | — | Transfer amount |
| `note` | string | no | max 1024 | Transfer notes |
| `status` | enum | yes | `initiated`, `pending`, `processing`, `posted`, `failed`, `reversed` | Lifecycle status |
| `providerReference` | string | no | max 256 | Dwolla transfer URL/ID |

**Indexes:**

| Name | Type | Attributes | Order |
|------|------|------------|-------|
| `idx_workspace` | key | `[workspaceId]` | ASC |
| `idx_workspace_status` | key | `[workspaceId, status]` | ASC, ASC |
| `idx_provider_ref` | key | `[providerReference]` | ASC |

**Status transitions (enforced in application layer):**
```
initiated → pending | failed
pending   → processing | failed
processing → posted | failed
posted    → reversed
failed    → (terminal)
reversed  → (terminal)
```

---

### 6. `sessions`

> Server-side session tokens for cookie-based authentication.

| Attribute | Type | Required | Size/Constraints | Description |
|-----------|------|----------|------------------|-------------|
| `$id` | Document ID | auto | — | Maps to `sessionId` |
| `userId` | string | yes | max 36 | Authenticated user |
| `token` | string | yes | max 128 | Session cookie value |
| `expiresAt` | datetime | yes | — | TTL (default 24h from creation) |

**Indexes:**

| Name | Type | Attributes | Order |
|------|------|------------|-------|
| `idx_token` | unique | `[token]` | ASC |
| `idx_user` | key | `[userId]` | ASC |
| `idx_expires` | key | `[expiresAt]` | ASC |

**Notes:**
- Expired sessions should be cleaned up via a scheduled function or on-read lazy deletion.
- When NextAuth.js is adopted (bead `arcana_pulse-ph3`), this collection may be replaced by NextAuth's built-in session store.

---

## Entity Relationship Diagram

```
┌──────────────┐
│  workspaces  │
│  $id = ws-*  │
└──────┬───────┘
       │ 1
       │
       ├────────────┐──────────────┐──────────────┐
       │ N          │ N            │ N            │ N
┌──────┴───────┐ ┌──┴──────────┐ ┌┴─────────────┐ ┌┴─────────────┐
│    users     │ │    banks    │ │ transactions │ │  transfers   │
│ $id = usr-*  │ │ $id = bnk-* │ │ $id = txn-*  │ │ $id = xfr-*  │
└──────┬───────┘ └──────┬──────┘ └──────────────┘ └──────────────┘
       │ 1              │ 1              ▲                ▲
       │                │               │                │
       │                └───────────────┘                │
       │                   bankId (nullable)             │
       │                                                 │
       └──── sessions ($id = sess-*)                     │
              userId ─────────────────────┘ (createdBy on side-effect txns)
```

---

## Query Patterns

| Use Case | Collection | Index Used | Filter |
|----------|------------|-----------|--------|
| Dashboard: all banks for workspace | banks | `idx_workspace` | `workspaceId = ?` |
| Transaction list with filters | transactions | `idx_workspace_type` | `workspaceId = ? AND transactionType = ?` |
| Transaction list sorted by date | transactions | `idx_workspace_date` | `workspaceId = ?` ORDER BY `date` DESC |
| Transactions for specific bank | transactions | `idx_workspace_bank` | `workspaceId = ? AND bankId = ?` |
| Plaid sync duplicate check | transactions | `idx_external_ref` | `externalReference = ?` |
| Transaction search | transactions | `idx_search` | fulltext search on `title` |
| Category breakdown | transactions | `idx_workspace_category` | `workspaceId = ? AND category = ?` |
| Transfer list | transfers | `idx_workspace` | `workspaceId = ?` |
| Dwolla webhook lookup | transfers | `idx_provider_ref` | `providerReference = ?` |
| Session validation | sessions | `idx_token` | `token = ?` |
| Session cleanup | sessions | `idx_expires` | `expiresAt < now()` |
| User login | users | `idx_email` | `email = ?` |

---

## Migration

Run the setup script to create the database, collections, attributes, and indexes:

```bash
npx tsx scripts/db-setup.ts
```

## Seeding

Populate collections with mock data for development:

```bash
npx tsx scripts/db-seed.ts
```

Both scripts require the following environment variables:
- `APPWRITE_ENDPOINT` — Appwrite API endpoint (default: `https://cloud.appwrite.io/v1`)
- `APPWRITE_PROJECT_ID` — Appwrite project ID
- `APPWRITE_API_KEY` — Server API key with `databases.read` and `databases.write` scopes
