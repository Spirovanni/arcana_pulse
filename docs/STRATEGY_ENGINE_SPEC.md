# Strategy Engine Spec — Backtesting & Strategy Definitions

**Status:** Draft technical spec, no implementation yet
**Related:** `docs/MARKET_INTELLIGENCE_PRD.md` §7B/C, `docs/TRADING_RISK_POLICY.md`, `docs/MARKET_DATA_PROVIDERS.md`, `SCHEMA.md` (conventions followed below)

---

## 1. Purpose

Let a member define a rule-based strategy, run it against historical data (backtest), and — only after the gating work in `docs/TRADING_RISK_POLICY.md` §3 is done — deploy it to paper execution. This spec covers the strategy data model and the backtest engine. It does **not** cover order execution mechanics (that's `docs/PAPERCLIP_SETUP.md`) or alert delivery (`docs/HERMES_SETUP.md`).

## 2. Relationship to the existing `algo-strategies` page

`src/app/(root)/algo-strategies/page.tsx` today renders a static, hardcoded `CURATED_EAS` array — a third-party MetaTrader EA marketplace catalog with mock ratings/reviews. It has no connection to Arcana's own data, Appwrite, or the member's workspace. This spec proposes a **separate, additive** in-house strategy system rather than rewriting that page outright:

- Keep the curated catalog as inspiration/marketing content.
- Add a new "My Strategies" surface backed by the data model below, where a member defines and backtests their own rules.
- Decide later (open question in the PRD) whether the two merge.

## 3. Strategy definition model

```typescript
// src/lib/types/index.ts additions

export type StrategyStatus = "draft" | "backtested" | "paper_deployed" | "archived";

export type IndicatorType = "sma" | "ema" | "rsi" | "macd" | "bollinger_bands";

export interface IndicatorConfig {
  type: IndicatorType;
  period: number;
  params?: Record<string, number>; // e.g. { stdDev: 2 } for Bollinger Bands
}

export type ComparisonOperator = "crosses_above" | "crosses_below" | "greater_than" | "less_than";

export interface StrategyRule {
  left: { indicator: IndicatorType; period: number } | { price: "close" | "open" | "high" | "low" };
  operator: ComparisonOperator;
  right: { indicator: IndicatorType; period: number } | { value: number };
}

export interface Strategy {
  id: string;               // strat-*
  workspaceId: string;
  name: string;
  symbol: string;            // single symbol v1; multi-symbol is a later iteration
  timeframe: "1Min" | "5Min" | "15Min" | "1H" | "1D";
  entryRules: StrategyRule[]; // AND-combined for v1
  exitRules: StrategyRule[];
  positionSizing: { type: "fixed_notional"; value: number } | { type: "fixed_qty"; value: number };
  status: StrategyStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

This follows the existing typed-interface convention in `src/lib/types/index.ts` (compare `AlpacaOrder`, `PlaceOrderInput`).

## 4. Appwrite schema additions

Following `SCHEMA.md`'s conventions (prefixed `$id`, `workspaceId` on every collection, indexes for tenant isolation):

### `strategies`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | Document ID | auto | `strat-*` |
| `workspaceId` | string | yes | Tenant scope |
| `name` | string | yes | max 128 |
| `symbol` | string | yes | max 16 |
| `timeframe` | enum | yes | `1Min`,`5Min`,`15Min`,`1H`,`1D` |
| `entryRules` | string (JSON) | yes | Serialized `StrategyRule[]` |
| `exitRules` | string (JSON) | yes | Serialized `StrategyRule[]` |
| `positionSizing` | string (JSON) | yes | Serialized sizing config |
| `status` | enum | yes | `draft`,`backtested`,`paper_deployed`,`archived` |
| `createdBy` | string | yes | userId |

Indexes: `idx_workspace` (`[workspaceId]`), `idx_workspace_status` (`[workspaceId, status]`).

### `backtestRuns`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | Document ID | auto | `bt-*` |
| `workspaceId` | string | yes | Tenant scope |
| `strategyId` | string | yes | FK to `strategies` |
| `dateRangeStart` / `dateRangeEnd` | datetime | yes | Backtest window |
| `status` | enum | yes | `running`,`completed`,`failed` |
| `metrics` | string (JSON) | no | Populated on completion — see §6 |
| `resultLabel` | enum | yes | Always `simulated` (`docs/TRADING_RISK_POLICY.md` §7) |

Indexes: `idx_workspace` (`[workspaceId]`), `idx_strategy` (`[strategyId]`).

### `backtestTrades`

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `$id` | Document ID | auto | `btt-*` |
| `backtestRunId` | string | yes | FK to `backtestRuns` |
| `workspaceId` | string | yes | Denormalized for query scoping |
| `side` | enum | yes | `buy`,`sell` |
| `qty` | float | yes | |
| `entryPrice` / `exitPrice` | float | yes | |
| `entryTime` / `exitTime` | datetime | yes | |
| `pnl` | float | yes | Computed, never estimated |

Indexes: `idx_run` (`[backtestRunId]`).

## 5. API routes (proposed)

Following the existing `src/app/api/<domain>/` pattern:

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/strategies` | GET, POST | List/create strategies for the workspace | `requireAuth({ requiredRole: "member" })` |
| `/api/strategies/[id]` | GET, PUT, DELETE | Manage a single strategy | `requireAuth` + workspace ownership check |
| `/api/strategies/[id]/backtest` | POST | Kick off a backtest run | `requireAuth` |
| `/api/strategies/[id]/backtest/[runId]` | GET | Poll/fetch backtest results | `requireAuth` + workspace check |
| `/api/strategies/[id]/paper-deploy` | POST | Hand off to Paperclip (see `docs/PAPERCLIP_SETUP.md`) — **blocked until `docs/TRADING_RISK_POLICY.md` §3 remediation ships** | `requireAuth` + explicit confirmation |

Every handler must filter by the session's `workspaceId` exactly like `src/lib/services/db/transactions.ts` does — no exceptions for "it's just a backtest."

## 6. Backtest engine approach

1. **Data ingestion:** pull historical bars for `symbol`/`timeframe`/date range from the active market data provider (`docs/MARKET_DATA_PROVIDERS.md`), through the resilience-wrapped client.
2. **Indicator computation:** compute each `IndicatorConfig` over the bar series (SMA/EMA/RSI/MACD/Bollinger — standard formulas, no proprietary math to invent).
3. **Simulation loop:** walk bars in order; evaluate `entryRules`/`exitRules`; on a rule match, record a simulated fill at the next bar's open (avoids look-ahead bias) using `positionSizing` to size the trade.
4. **Slippage/fees model:** v1 assumes zero slippage and zero commission, clearly stated in the UI as a simplification — do not present backtest P&L as a prediction of paper or live results.
5. **Metrics computed from actual simulated trades** (never invented): total return, win rate, max drawdown, Sharpe ratio (using a stated risk-free rate input, not a hardcoded assumption), trade count. Store in `backtestRuns.metrics`.
6. **Output labeling:** every result rendered with `resultLabel = "simulated"` per `docs/TRADING_RISK_POLICY.md` §7.

## 7. Integration points

- **Paperclip** (`docs/PAPERCLIP_SETUP.md`): consumes a `Strategy` with `status = "backtested"` to generate orders against the (remediated) `/api/alpaca/orders` route. Blocked until the `docs/TRADING_RISK_POLICY.md` §3 gating ships — see `docs/PAPERCLIP_SETUP.md` §2.
- **Hermes** (`docs/HERMES_SETUP.md`): subscribes to strategy signal events (`strategy_signal`, `risk_limit_breach`) to fire alerts — see `docs/HERMES_SETUP.md` §4.
- **Education Agent** (`docs/AGENT_OPERATING_MODEL.md` §1): explains a given backtest's metrics in plain language on request — reads `backtestRuns.metrics`, never recomputes or estimates them independently.

## 8. Testing requirements

- Unit tests for each indicator calculation against known reference values.
- Unit tests for the simulation loop covering: no-trade case, entry-without-exit-in-range case, multiple overlapping signals.
- Integration test confirming a backtest run is rejected if `workspaceId` doesn't match the requester.
- Snapshot test confirming every API response includes a `resultLabel`.

## 9. Rollout as PR-sized tickets

1. Add `Strategy`/`StrategyRule`/`IndicatorConfig` types + Appwrite collections (schema-only PR, no UI)
2. Indicator calculation utilities + unit tests
3. Backtest simulation loop + unit tests (no API route yet)
4. `/api/strategies` CRUD routes + workspace-scoping tests
5. `/api/strategies/[id]/backtest` route + `backtestRuns`/`backtestTrades` persistence
6. "My Strategies" UI surface (list, create, view backtest results)
7. Paper-deploy route — **blocked on `docs/TRADING_RISK_POLICY.md` §3**

Each ticket gets its own Beads issue (`AGENTS.md` workflow) with acceptance criteria and a rollback note before work starts.
