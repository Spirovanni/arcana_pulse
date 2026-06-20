# Agent Operating Model — Market Intelligence Layer

**Scope:** Defines what AI agents (Claude/Cursor coding agents, scheduled jobs, in-app AI features) are allowed to do, build, and run within the Market Intelligence layer of Arcana Pulse. Applies to both **build-time agents** (writing the code) and **run-time agents** (code that itself calls an LLM or acts autonomously once shipped).

**Status:** Draft — governs all Market Intelligence work until superseded.
**Related:** `CLAUDE.md`, `docs/TRADING_RISK_POLICY.md`, `docs/MARKET_INTELLIGENCE_PRD.md`

---

## 1. Agent roles in this layer

| Role | What it does | Run-time or build-time | Can touch real money? |
|---|---|---|---|
| **Research Agent** | Summarizes market data, news, fundamentals for a workspace; answers natural-language questions | Run-time | No |
| **Strategy/Backtest Agent** | Defines strategy rules, runs historical simulations, reports metrics (see `docs/STRATEGY_ENGINE_SPEC.md`) | Run-time | No — simulated only |
| **Paper Execution Agent ("Paperclip")** | Submits/cancels orders against Alpaca's **paper** endpoint on behalf of a strategy or user action | Run-time | No — paper account only, never live |
| **Alerts Agent ("Hermes")** | Watches thresholds/signals and delivers notifications (in-app, email) | Run-time | No |
| **Education Agent** | Explains concepts, strategy mechanics, risk terminology | Run-time | No |
| **Coding Agent** (you) | Implements the above under human direction | Build-time | No — never has standing permission to deploy, migrate, or place orders |

No role in this table is authorized to initiate a live trade, move funds, or operate without the boundaries in §2.

## 2. Hard boundaries (apply to every role above)

These map directly to the ten non-negotiable rules in `CLAUDE.md` §3:

1. **No autonomous live trading, ever.** There is no "live mode" toggle a run-time agent can flip. `ALPACA_ENV` changes are a human, out-of-band decision (env var change + redeploy), never something an agent edits or recommends editing via code.
2. **No agent moves real money.** This rules out agent-initiated Dwolla transfers and any live Alpaca order. Paper orders are the ceiling.
3. **Secrets are off-limits as context.** Agents must read `ALPACA_API_KEY`/`ALPACA_API_SECRET` only through `src/lib/alpaca.ts` server-side; never echo them into chat, logs, tickets, or generated code comments.
4. **No secrets in artifacts.** Generated tickets, PRs, commit messages, and screenshots must not contain key values, even partially masked-but-real ones.
5. **No fabricated numbers.** A Research or Strategy agent must cite the tool call or query that produced a figure. If a number can't be sourced from `src/lib/alpaca.ts`, a database query, or an uploaded file, the agent says so instead of estimating.
6. **Workspace scoping is mandatory.** Every read/write a run-time agent performs is filtered by the requesting user's `workspaceId`. An agent must refuse a request that would read or act across workspaces.
7. **Output labeling is mandatory.** Every strategy result, backtest report, or alert must carry one of `educational`, `simulated`, or `paper-trading` — never presented as live performance or investment advice.
8. **Approval gates.** See §3 — order placement, prod deploys, DB migrations, and auth/security changes require an explicit human approval step, not an agent's own judgment that it's "probably fine."
9. **PR-sized changes.** A coding agent should not combine a Market Intelligence feature with unrelated refactors in the same PR.
10. **Observability.** Any new run-time agent action must write to `logAuditEvent()` (`src/lib/services/db/auditLog.ts`) and be visible in Sentry on failure.

## 3. Human-approval checkpoints

| Action | Who approves | Evidence required |
|---|---|---|
| Placing/canceling a paper order | Workspace member explicitly confirms in-app (not silently triggered by a background job) | UI confirmation event + audit log entry (`paper_order_submit`) |
| Enabling a new alert rule that can page/email the user | User opt-in per rule | `alert_rule_created` audit entry |
| Production deployment | Human reviewer (per `SECURITY.md` §12 change management) | Merged PR + passing CI security gates |
| Database migration (new collection/attribute) | Human reviewer | Migration script reviewed, rollback documented |
| Auth/security code change | Human reviewer, no exceptions | PR review approval |
| Any change to `ALPACA_ENV` or live-trading capability | Out of scope for this repo today — requires a separate, explicit authorization project | N/A |

A run-time agent that reaches one of these checkpoints must stop and surface a confirmation request to the user rather than proceeding.

## 4. Data provenance rules

- Market prices, quotes, positions, and account data: must come from `src/lib/alpaca.ts` (or a provider documented in `docs/MARKET_DATA_PROVIDERS.md`), never invented.
- Backtest performance metrics: must come from the strategy engine's actual simulation run (`docs/STRATEGY_ENGINE_SPEC.md`), never estimated or extrapolated by the agent narrating the result.
- If a tool call fails or a provider is unconfigured, the agent reports "data unavailable" — it does not fill the gap with a plausible-looking number.

## 5. Escalation

If an agent (build-time or run-time) is asked to do something that conflicts with §2:

1. State which rule blocks the request.
2. Explain what it can do instead (e.g., "I can draft the paper order for you to confirm, but I can't submit it automatically").
3. Do not proceed on the assumption that the user "probably meant" something compliant — ask.

## 6. Definition of done for any Market Intelligence PR

- [ ] Acceptance criteria stated in the ticket
- [ ] Tests added/updated
- [ ] Rollback note included
- [ ] Workspace scoping verified on every new query/route
- [ ] Output labeled `educational` / `simulated` / `paper-trading` where applicable
- [ ] `logAuditEvent()` call added for new state-changing actions
- [ ] No secrets in the diff, ticket, or PR description
- [ ] Existing services reused where they exist (no duplicate ORM/auth/notification path)
