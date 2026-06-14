# Security Architecture — Arcana Pulse

**Last updated:** June 2026  
**Scope:** Arcana Pulse consumer application (arcanacu.org)  
**Status:** Sandbox / pre-charter — not a regulated financial institution

---

## 1. Reporting Vulnerabilities

If you discover a security vulnerability, **do not open a public GitHub issue**.  
Email the security team at **security@arcanacu.org** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested mitigations

You will receive an acknowledgement within 48 hours. We aim to triage and patch critical issues within 7 days.

---

## 2. Authentication Architecture

### 2.1 Session model

Arcana Pulse uses **NextAuth.js** with a **JWT session strategy**:

- Tokens are signed with `NEXTAUTH_SECRET` (HS256 via `next-auth/jwt`)
- Session TTL: 24 hours
- Tokens are validated cryptographically in `middleware.ts` via `getToken()` before any protected route is served
- Sessions are stateless — no server-side session store; revocation relies on token expiry

### 2.2 Credential storage

- Passwords are hashed with **bcrypt** (cost factor 12) before persistence
- Raw passwords are never logged or stored
- Password reset tokens are single-use UUIDs with a 1-hour TTL

### 2.3 Multi-Factor Authentication (MFA)

- TOTP-based MFA implemented via `otplib`
- TOTP secrets are **AES-256-GCM encrypted** before storage in Appwrite using a key derived from `ENCRYPTION_KEY`
- 8 single-use recovery codes are generated at MFA enrollment
- Recovery codes are invalidated (burned) on use

### 2.4 OAuth (Google)

- Google OAuth 2.0 via NextAuth `GoogleProvider`
- Users authenticated via OAuth are matched to existing Appwrite user documents by email
- New OAuth users are provisioned into the default workspace automatically

---

## 3. Authorization — Role-Based Access Control (RBAC)

### 3.1 Role hierarchy

| Role     | Rank | Description                              |
|----------|------|------------------------------------------|
| `viewer` | 1    | Read-only access to workspace data       |
| `member` | 2    | Can create/edit transactions, goals, budgets |
| `admin`  | 3    | Can manage members, roles, and invites   |
| `owner`  | 4    | Full control; can delete the workspace   |

Roles are stored in the `users` collection in Appwrite and encoded into the JWT session token at sign-in.

### 3.2 Enforcement layer

All protected API routes use the `requireAuth()` helper (`src/lib/auth/withAuth.ts`):

```typescript
const auth = await requireAuth(request, { requiredRole: "member" });
if (!auth.ok) return auth.response; // 401 or 403
```

The helper enforces:
1. **Authentication** — returns 401 if no valid JWT session exists
2. **Role check** — returns 403 if the user's role rank is below the required minimum
3. **Workspace boundary** — returns 403 if the requested `workspaceId` does not match the session user's `workspaceId` (except for `admin`/`owner` roles that may span workspaces)

### 3.3 Minimum required roles by operation type

| Operation type          | Minimum role |
|-------------------------|--------------|
| Read own workspace data | `viewer`     |
| Create/edit records     | `member`     |
| Link bank accounts      | `member`     |
| Initiate transfers      | `member`     |
| Manage team members     | `admin`      |
| Delete workspace        | `owner`      |
| Admin dashboard         | `admin`      |

### 3.4 Workspace isolation

Every data record in Appwrite includes a `workspaceId` field. All queries are scoped to the authenticated user's `workspaceId`. Cross-workspace reads are blocked at the API layer — no query can return records from a workspace the requester does not belong to.

---

## 4. Rate Limiting

Rate limiting is applied in `middleware.ts` **before** authentication is evaluated:

| Endpoint group              | Limit           |
|-----------------------------|-----------------|
| Sign-in, OAuth callbacks    | 5 req / minute  |
| Sign-up, password reset     | 10 req / minute |
| All other `/api/` routes    | 100 req / minute|

Limits are tracked in an in-memory sliding-window counter keyed on `label:ip`. For multi-instance deployments, migrate this to Redis or Upstash for distributed consistency.

Responses include `Retry-After` and `X-RateLimit-Reset` headers per [RFC 6585](https://datatracker.ietf.org/doc/html/rfc6585).

---

## 5. Secrets and Environment Variables

All secrets are stored in environment variables and never committed to version control:

| Variable                    | Purpose                                  |
|-----------------------------|------------------------------------------|
| `NEXTAUTH_SECRET`           | JWT signing key (≥ 32 random bytes)      |
| `ENCRYPTION_KEY`            | AES-256-GCM key for TOTP secrets at rest |
| `APPWRITE_API_KEY`          | Server-side Appwrite SDK key             |
| `PLAID_SECRET`              | Plaid API secret                         |
| `DWOLLA_APP_SECRET`         | Dwolla API secret                        |
| `STRIPE_SECRET_KEY`         | Stripe secret key                        |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signature secret          |
| `ALPACA_API_SECRET`         | Alpaca trading API secret                |

**Rules:**
- `.env` and `.env.local` are in `.gitignore`
- `.env.example` contains only placeholder values — never real credentials
- Production secrets are set in Vercel's encrypted environment variable store
- `ENCRYPTION_KEY` must be exactly 32 bytes (256 bits) encoded as hex or base64

---

## 6. Encryption at Rest

### 6.1 TOTP secrets

TOTP secrets are encrypted with AES-256-GCM before storing in Appwrite using `src/lib/crypto.ts`. A unique IV is generated per encryption operation. The ciphertext and IV are stored together as a base64-encoded string.

### 6.2 Sensitive Plaid and Dwolla tokens

Plaid `access_token` values are referenced via `accessTokenRef` in bank records. For production deployments, these should be encrypted at rest using the same AES-256-GCM pattern as TOTP secrets.

### 6.3 Database-level encryption

Appwrite Cloud applies encryption at rest for all stored documents.

---

## 7. Audit Logging

Every security-relevant user action is logged via `logAuditEvent()` (`src/lib/services/db/auditLog.ts`):

| Event type           | Logged fields                              |
|----------------------|--------------------------------------------|
| `sign_in`            | userId, email, IP address, user agent      |
| `sign_out`           | userId, email                              |
| `mfa_enable`         | userId, email                              |
| `mfa_disable`        | userId, email                              |
| `password_reset`     | userId, email                              |
| `transaction_create` | userId, workspaceId, amount, type          |
| `transaction_update` | userId, workspaceId, transactionId         |
| `transaction_delete` | userId, workspaceId, transactionId         |
| `transfer_create`    | userId, workspaceId, amount                |
| `bank_link`          | userId, workspaceId, institutionName       |
| `bank_remove`        | userId, workspaceId, bankId                |
| `settings_change`    | userId, workspaceId, changed fields        |
| `export_data`        | userId, workspaceId                        |

Audit logs are append-only and scoped to a workspace. Logs are never deleted as part of normal operations. Under GDPR/CCPA account deletion, audit logs for the userId are removed as part of the cascade delete.

**Monitoring:** Sentry is configured (`sentry.server.config.ts`) for error and performance monitoring. Session replay is enabled with privacy masking on input fields — raw member inputs are never captured.

---

## 8. Security Headers

The following HTTP security headers are recommended and should be set in `next.config.mjs` or at the Vercel/CDN level for production:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 9. CI/CD Security Gates

The `.github/workflows/security.yml` pipeline runs on every push to `main` and `develop`, on pull requests to `main`, and weekly on a schedule:

| Gate                    | Tool                      | Trigger                |
|-------------------------|---------------------------|------------------------|
| Dependency audit        | `npm audit`               | Push, PR, weekly       |
| Static analysis         | GitHub CodeQL             | Push, PR, weekly       |
| Dependency review       | `actions/dependency-review-action` | PR only     |
| Secret scanning         | Gitleaks                  | Push, PR, weekly       |
| OWASP dependency check  | OWASP Dependency Check    | Push to main, weekly   |

PRs introducing high or critical CVEs, or packages with GPL/AGPL licenses, are blocked automatically.

---

## 10. SOC 2 Type II Controls Checklist

| Control area              | Status       | Notes                                                             |
|---------------------------|--------------|-------------------------------------------------------------------|
| Access control (CC6.1)    | ✅ Implemented | RBAC with 4 roles; `requireAuth()` on all API routes             |
| Least privilege (CC6.3)   | ✅ Implemented | Viewer/member/admin/owner role matrix enforced per route         |
| Multi-factor auth         | ✅ Implemented | TOTP-based MFA with encrypted secrets and recovery codes         |
| Audit logging (CC7.2)     | ✅ Implemented | All security events written to append-only audit log             |
| Encryption at rest        | ✅ Implemented | TOTP secrets: AES-256-GCM; DB: Appwrite Cloud encryption         |
| Encryption in transit     | ✅ Implemented | HTTPS enforced via Vercel / HSTS header                          |
| Secrets management        | ✅ Implemented | All secrets in env vars; `.env` gitignored; Vercel secret store  |
| Vulnerability monitoring  | ✅ Implemented | `npm audit` in CI; CodeQL static analysis; Gitleaks secret scan  |
| Rate limiting (CC6.6)     | ✅ Implemented | Per-IP sliding-window rate limits in middleware                  |
| Workspace isolation       | ✅ Implemented | All queries scoped by `workspaceId`; cross-tenant reads blocked  |
| Monitoring / alerting     | ✅ Implemented | Sentry error tracking with session replay + privacy masking      |
| Password policy           | ✅ Implemented | Minimum 8 chars; bcrypt cost 12; secure reset flow               |
| GDPR right to delete      | ✅ Implemented | Cascade delete across all collections via `deleteAccount()`      |
| GDPR data export          | ✅ Implemented | Full data export (sans secrets) via `exportUserData()`           |
| Penetration testing prep  | 🔜 Planned    | See `arcana_pulse-vr3` (OWASP hardening + CSP + CORS config)    |
| CORS configuration        | 🔜 Planned    | Properly scope CORS to production domains                        |
| Change management docs    | 🔜 Planned    | Define PR review requirements and deployment approval gates      |

---

## 11. Sandbox / Pre-Charter Disclaimer

Arcana Pulse is presented as the consumer application for **Arcana Credit Union** but operates in a **sandbox / pre-charter environment**. It does not hold real deposits, does not conduct regulated money movement, and has not completed:

- KYC / AML program design
- OFAC / sanctions screening
- Regulatory charter review
- Licensed money transmission authorization

These are prerequisites for any real public financial product launch.

---

## 12. Change Management

All code changes follow this process:

1. Feature branches are created from `develop`
2. Pull requests require at least one peer review approval
3. Security-scanning CI gates must pass before merge
4. `main` is the production-deployment branch — merges to `main` are restricted to releases only
5. Hotfixes for security vulnerabilities follow an expedited patch process with immediate deployment

Dependency updates are reviewed via Dependabot or `npm audit fix` with CI validation before merging.
