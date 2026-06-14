# Arcana Pulse — Bug Bounty Program

**Status:** Private / Invite-Only (MVP stage)  
**Scope:** arcanacu.org and associated APIs  
**Contact:** security@arcanacu.org  
**Last updated:** June 2026

---

## Program Overview

Arcana Pulse takes security seriously. We invite security researchers to help us find and fix vulnerabilities in our platform responsibly. We recognize good-faith security research and aim to acknowledge and remediate reports promptly.

> **Note:** This program is currently **invite-only** during the pre-launch phase. Public launch will be announced via arcanacu.org. Until then, please contact security@arcanacu.org before testing.

---

## Scope

### In-Scope Targets

| Target | Description |
|---|---|
| `arcanacu.org` | Production web application |
| `arcanacu.org/api/*` | All API routes |
| `arcanacu.org/api/mcp` | MCP server endpoint |
| `arcanacu.org/.well-known/*` | OAuth metadata endpoints |

### Out-of-Scope

The following are explicitly **not in scope**:

- Appwrite Cloud console or Appwrite infrastructure (not operated by Arcana Pulse)
- Vercel deployment infrastructure
- Plaid, Dwolla, Stripe, or Alpaca platforms and their own APIs
- Google OAuth infrastructure
- Social engineering attacks on Arcana Pulse team members
- Physical security attacks
- Denial-of-service attacks (DoS/DDoS) — do not perform load testing without written permission
- Automated scanning that generates high request volume (may trigger rate limits and IP blocks)
- Reports from automated scanners without manual validation

---

## Eligibility

To be eligible for recognition:

1. You must be the **first** to report a specific vulnerability.
2. You must not have **violated any applicable laws** in the course of your research.
3. You must **not have exploited** the vulnerability beyond what is necessary to demonstrate impact.
4. You must **not have accessed, modified, or deleted** user data in production.
5. You must **follow responsible disclosure** — give us reasonable time to remediate before public disclosure (minimum 90 days from acknowledgement, or as agreed).
6. You must **contact us before testing** if you are unsure whether a test is in scope.

---

## Severity Definitions

### Critical (P0)

Examples:
- Remote code execution (RCE) on Arcana Pulse servers
- Authentication bypass allowing unauthorized account access
- SQL/NoSQL injection allowing arbitrary data read or write
- IDOR granting full access to another user's financial data
- Mass data exposure (PII, account credentials)

### High (P1)

Examples:
- Stored XSS in a path accessible to other users
- Broken access control allowing partial data leakage between tenants
- SSRF to internal services with significant impact
- Privilege escalation (e.g., viewer to owner)
- MFA bypass

### Medium (P2)

Examples:
- Reflected XSS requiring user interaction
- CSRF on a state-changing action not protected by token
- Sensitive data exposure in error messages (non-critical)
- Missing rate limiting on a secondary endpoint
- Insecure direct object reference with limited impact

### Low (P3)

Examples:
- Missing security headers on specific routes
- Information disclosure (server version, framework headers)
- Self-XSS (only exploitable by the logged-in user)
- Clickjacking without demonstrated impact
- Open redirect to non-malicious destination

### Informational

Examples:
- Best-practice recommendations not exploitable in current form
- Non-security bugs or UX issues
- Known and accepted limitations documented in SECURITY.md

---

## What We Ask Researchers To Do

1. **Do not access or modify production user data.** Use test accounts provided by us or self-registered sandbox accounts.
2. **Do not disrupt service.** Do not run automated scans that generate high request rates without prior written permission.
3. **Do not test out-of-scope targets.** Focus only on arcanacu.org.
4. **Do not publicly disclose** until we have confirmed a fix is deployed or 90 days have passed.
5. **Report promptly.** Once you find a vulnerability, report it before continuing further testing of related attack surfaces.
6. **Provide clear reproduction steps.** Incomplete reports slow triage and may be deprioritized.

---

## How to Report

Send a report to **security@arcanacu.org** with:

```
Subject: [Bug Bounty] <short title>

Severity: Critical / High / Medium / Low / Informational
CWE: <CWE number if applicable>
OWASP Category: <A01–A10 if applicable>
Affected Endpoint: <URL and method>

Description:
<What is the vulnerability?>

Steps to Reproduce:
1.
2.
3.

Expected Behavior:
<What should happen>

Actual Behavior:
<What does happen>

Impact:
<What can an attacker do with this?>

Proof of Concept:
<Code, screenshots, or curl commands>
```

---

## Response Timeline

| Stage | Target time |
|---|---|
| Initial acknowledgement | 48 hours |
| Triage and severity assignment | 5 business days |
| Status update | 10 business days |
| Remediation target (Critical) | 7 days |
| Remediation target (High) | 30 days |
| Remediation target (Medium/Low) | 90 days |
| Public disclosure (researcher-initiated after 90 days) | With prior coordination |

We will keep you informed as we remediate the issue.

---

## Recognition

At this stage of the program, we offer:

- **Public acknowledgement** on our Hall of Fame page (with researcher consent)
- **Written recognition letter** for portfolio use
- Future monetary rewards will be considered as the platform scales

We are committed to treating researchers fairly and transparently.

---

## Safe Harbour

Arcana Pulse will not pursue legal action against researchers who:

- Follow the eligibility rules above
- Act in good faith
- Do not access, exfiltrate, or corrupt production user data
- Report findings promptly and responsibly

This safe harbour is limited to good-faith testing of in-scope targets using the guidance in this document.

---

## Hall of Fame

*No entries yet. Be the first responsible researcher to report a valid finding.*

---

## Contact

**Security team:** security@arcanacu.org  
**PGP key:** Available upon request  
**Response language:** English
