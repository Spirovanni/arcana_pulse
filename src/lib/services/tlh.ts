// ─── Tax-Loss Harvesting engine ───────────────────────────────────────────────
//
// Identifies positions with unrealized losses, calculates estimated tax
// savings, warns on wash-sale exposure, and suggests replacement securities.

import type { Holding, InvestmentTransaction } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TLHOpportunity {
  holdingId: string;
  ticker: string;
  securityName: string;
  securityType: string;
  quantity: number;
  currentValue: number;
  costBasis: number;
  unrealizedLoss: number;        // negative
  unrealizedLossPct: number;     // negative %
  holdingPeriodDays: number;
  isLongTerm: boolean;           // held ≥ 365 days
  estimatedTaxSavings: {
    shortTermRate: number;       // e.g. 0.32
    longTermRate: number;        // e.g. 0.15
    savingsAtShortTerm: number;
    savingsAtLongTerm: number;
  };
  washSaleRisk: boolean;
  washSaleWarning?: string;
  suggestedReplacement: { ticker: string; name: string; rationale: string } | null;
}

export interface TLHSummary {
  opportunities: TLHOpportunity[];
  totalHarvestableLoss: number;
  estimatedSavingsShortTerm: number;
  estimatedSavingsLongTerm: number;
  longTermCount: number;
  shortTermCount: number;
  washSaleWarningCount: number;
  totalUnrealizedGains: number;  // for context: how much loss can offset
}

// ─── Tax rate assumptions ─────────────────────────────────────────────────────

const SHORT_TERM_RATE = 0.32;  // federal + state blended assumption
const LONG_TERM_RATE  = 0.15;  // most common long-term cap gains bracket

// ─── Wash-sale window ─────────────────────────────────────────────────────────

const WASH_SALE_DAYS = 30;

// ─── Replacement map (wash-sale safe alternatives) ───────────────────────────
// Keys are tickers; values are suggested alternatives that are similar but
// NOT "substantially identical" under IRS rules.

const REPLACEMENT_MAP: Record<string, { ticker: string; name: string; rationale: string }> = {
  BND:   { ticker: "AGG",   name: "iShares Core US Aggregate Bond ETF",         rationale: "Similar US bond market exposure, different fund family — not substantially identical." },
  BNDX:  { ticker: "IAGG",  name: "iShares Core International Aggregate Bond",  rationale: "International bond equivalent, avoids wash-sale on BND/BNDX." },
  VTI:   { ticker: "SCHB",  name: "Schwab US Broad Market ETF",                 rationale: "Tracks a different index (Dow Jones vs CRSP) — broadly similar exposure." },
  VXUS:  { ticker: "IXUS",  name: "iShares Core MSCI Total International",      rationale: "Similar ex-US equity exposure, different provider." },
  FXAIX: { ticker: "VFIAX", name: "Vanguard 500 Index Fund Admiral",            rationale: "Both track S&P 500 but different fund families; IRS guidance is ambiguous — consult a tax advisor." },
  PYPL:  { ticker: "SQ",    name: "Block Inc. (Square)",                        rationale: "Fintech peer — different company, avoids wash-sale. Similar digital payments exposure." },
  INTC:  { ticker: "AMD",   name: "Advanced Micro Devices Inc.",                rationale: "Semiconductor peer — different company. Similar chip-sector exposure without wash-sale risk." },
  MSFT:  { ticker: "GOOGL", name: "Alphabet Inc.",                              rationale: "Large-cap tech peer — different company, maintains sector exposure." },
  AAPL:  { ticker: "MSFT",  name: "Microsoft Corporation",                      rationale: "Large-cap tech peer — different company, maintains sector exposure." },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

function mostRecentBuyDate(transactions: InvestmentTransaction[], securityId: string): string | null {
  const buys = transactions
    .filter((t) => t.securityId === securityId && t.type === "buy")
    .sort((a, b) => b.date.localeCompare(a.date));
  return buys.length > 0 ? buys[0].date : null;
}

function checkWashSaleRisk(
  transactions: InvestmentTransaction[],
  securityId: string,
  asOf: string
): { risk: boolean; warning?: string } {
  // Flag if there's a buy within 30 days before today (would need to sell today)
  // — the rule also covers 30 days AFTER, but we can't predict future buys.
  const recent = transactions.filter(
    (t) =>
      t.securityId === securityId &&
      t.type === "buy" &&
      daysBetween(t.date, asOf) <= WASH_SALE_DAYS &&
      daysBetween(t.date, asOf) >= 0
  );
  if (recent.length > 0) {
    return {
      risk: true,
      warning: `You purchased this security ${daysBetween(recent[0].date, asOf)} days ago (${recent[0].date}). Selling now may trigger the wash-sale rule — the loss could be disallowed if you repurchase within 30 days.`,
    };
  }
  return { risk: false };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeTaxLossHarvesting(
  holdings: Holding[],
  transactions: InvestmentTransaction[],
  asOf = "2026-04-20"
): TLHSummary {
  const opportunities: TLHOpportunity[] = [];

  const totalUnrealizedGains = holdings
    .filter((h) => (h.unrealizedGainLoss ?? 0) > 0)
    .reduce((s, h) => s + (h.unrealizedGainLoss ?? 0), 0);

  for (const holding of holdings) {
    const loss = holding.unrealizedGainLoss ?? 0;
    if (loss >= 0) continue; // only flag losers

    const ticker = holding.security.ticker ?? "—";
    const buyDate = mostRecentBuyDate(transactions, holding.securityId);
    const holdingPeriodDays = buyDate ? daysBetween(buyDate, asOf) : 365;
    const isLongTerm = holdingPeriodDays >= 365;

    const absLoss = Math.abs(loss);
    const savingsAtShortTerm = Math.round(absLoss * SHORT_TERM_RATE * 100) / 100;
    const savingsAtLongTerm  = Math.round(absLoss * LONG_TERM_RATE  * 100) / 100;

    const { risk: washSaleRisk, warning: washSaleWarning } =
      checkWashSaleRisk(transactions, holding.securityId, asOf);

    const suggestedReplacement = REPLACEMENT_MAP[ticker] ?? null;

    opportunities.push({
      holdingId:        holding.holdingId,
      ticker,
      securityName:     holding.security.name,
      securityType:     holding.security.type ?? "other",
      quantity:         holding.quantity,
      currentValue:     holding.institutionValue,
      costBasis:        holding.costBasis ?? 0,
      unrealizedLoss:   loss,
      unrealizedLossPct: holding.unrealizedGainLossPct ?? 0,
      holdingPeriodDays,
      isLongTerm,
      estimatedTaxSavings: {
        shortTermRate:     SHORT_TERM_RATE,
        longTermRate:      LONG_TERM_RATE,
        savingsAtShortTerm,
        savingsAtLongTerm,
      },
      washSaleRisk,
      washSaleWarning,
      suggestedReplacement,
    });
  }

  // Sort by largest harvestable loss first
  opportunities.sort((a, b) => a.unrealizedLoss - b.unrealizedLoss);

  const totalHarvestableLoss = opportunities.reduce((s, o) => s + o.unrealizedLoss, 0);
  const estimatedSavingsShortTerm = opportunities.reduce(
    (s, o) => s + o.estimatedTaxSavings.savingsAtShortTerm, 0
  );
  const estimatedSavingsLongTerm = opportunities.reduce(
    (s, o) => s + o.estimatedTaxSavings.savingsAtLongTerm, 0
  );

  return {
    opportunities,
    totalHarvestableLoss,
    estimatedSavingsShortTerm,
    estimatedSavingsLongTerm,
    longTermCount:  opportunities.filter((o) => o.isLongTerm).length,
    shortTermCount: opportunities.filter((o) => !o.isLongTerm).length,
    washSaleWarningCount: opportunities.filter((o) => o.washSaleRisk).length,
    totalUnrealizedGains,
  };
}
