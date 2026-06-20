# Market Data Providers

**Status:** Active integration (Alpaca) + candidate providers for evaluation
**Related:** `docs/MARKET_INTELLIGENCE_PRD.md`, `docs/STRATEGY_ENGINE_SPEC.md`, `src/lib/alpaca.ts`

---

## 1. Purpose

Catalog where Arcana Pulse's Market Intelligence layer gets market data from today, and what's being considered for the gaps (news, fundamentals, broader historical depth). Per `CLAUDE.md` §3 rule 5, nothing in this layer may show a number that didn't come from one of the sources below — if a provider isn't listed here and integrated, the app must say "data unavailable," not estimate.

## 2. Currently integrated

### Alpaca Market Data + Trading API

- **Client:** `src/lib/alpaca.ts` (server-only; keys never sent to the browser)
- **Used by:** `src/app/api/alpaca/{account,assets,orders,portfolio-history,positions}/route.ts`, `src/app/(root)/portfolio`
- **Auth:** `ALPACA_API_KEY` / `ALPACA_API_SECRET` headers (`APCA-API-KEY-ID` / `APCA-API-SECRET-KEY`)
- **Environment:** trading base URL switches on `ALPACA_ENV` (`paper-api.alpaca.markets` vs `api.alpaca.markets`); market data base is `data.alpaca.markets` regardless of env
- **Plan in use:** Alpaca's free "Basic" market data plan, which is the default for paper accounts. Per Alpaca's documentation, Basic includes real-time data limited to the **IEX** exchange feed for equities only (not full SIP consolidated tape), and a free-tier rate limit (historically documented around 200 calls/minute, though Alpaca has changed this over time — **confirm current limits at `docs/about-market-data-api` before relying on a specific number**; do not hardcode an assumed limit into product copy). [Alpaca data plans](https://alpaca.markets/data) · [About Market Data API](https://docs.alpaca.markets/us/docs/about-market-data-api) · [Paper Trading docs](https://docs.alpaca.markets/us/docs/paper-trading)
- **Coverage:** US equities/ETFs, options (indicative feed on Basic), crypto. No FX, no international equities.
- **Known limitation:** IEX-only feed means quotes can lag/differ from the full consolidated tape — fine for paper trading and education, **must be disclosed** anywhere Market Watch shows a "live" price, since it isn't the full-market price.

## 3. Resilience requirements

Every call to Alpaca (or any future provider) must go through `src/lib/resilience/circuit-breaker.ts` and `retry.ts` rather than a bare `fetch`, consistent with how Plaid/Dwolla calls are expected to be wrapped elsewhere in the codebase. Specifically:

- Wrap market-data reads in a circuit breaker so a provider outage degrades to "data unavailable" instead of hanging requests or retry storms.
- Do not retry order-submission POSTs blindly (see `docs/TRADING_RISK_POLICY.md` §4 on idempotency) — retries are safe for read-only market-data calls, not for writes.

## 4. Candidate providers (not yet integrated — evaluate before adding)

These are options to evaluate for filling gaps Alpaca's Basic plan doesn't cover (full SIP tape, news, fundamentals, deeper history). None are wired into the codebase. Treat every figure below as "verify at procurement time," not a committed spec — provider pricing and limits change frequently and this table must not be quoted as current fact without re-checking.

| Provider | Would fill | Notes |
|---|---|---|
| Alpaca paid market data plans (Algo Trader Plus / unlimited) | Full SIP tape, higher throughput | Same vendor, same client code — lowest integration cost if Basic's IEX-only feed proves limiting |
| Polygon.io | News, fundamentals, deeper historical bars, options chains | Separate API key/secret; would need its own client module mirroring `src/lib/alpaca.ts`'s pattern (server-only, env-validated) |
| Finnhub | News, earnings calendar, basic fundamentals | Has a free tier historically aimed at hobby use; confirm current terms before any production use |
| Twelve Data | Broader asset classes (forex, some international) | Relevant only if Market Watch scope grows beyond US equities |

**Before integrating any of these:** confirm current pricing/rate limits directly with the provider, add the new secret to `.env.example` as a placeholder only, add a client module under `src/lib/` following the `alpaca.ts` pattern (custom error classes, server-only, `requireEnv`-validated), and wrap calls in the existing resilience layer. Do not add a dependency or key to the repo speculatively.

## 5. Disclosure requirements

Anywhere a price, quote, or chart is shown to a member:

- Label the source feed (e.g., "IEX feed via Alpaca, may be delayed vs. consolidated tape") if it isn't the full market.
- Never blend data from two providers into a single number without saying so (e.g., a price from Alpaca and a fundamental ratio from a different provider shown together should each be individually attributed).

## 6. Environment variables

| Variable | Provider | Status |
|---|---|---|
| `ALPACA_API_KEY`, `ALPACA_API_SECRET`, `ALPACA_ENV` | Alpaca | Active — see `.env.example`, `SECURITY.md` §5 |
| *(none yet)* | Polygon/Finnhub/Twelve Data/etc. | Not configured — add only alongside an actual integration PR |
