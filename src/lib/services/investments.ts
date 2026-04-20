import type {
  InvestmentAccount,
  InvestmentAccountType,
  Holding,
  Security,
  InvestmentTransaction,
} from "@/lib/types";

// ─── Mock store ───────────────────────────────────────────────────────────────

const SECURITIES: Security[] = [
  { securityId: "sec-aapl", ticker: "AAPL", name: "Apple Inc.", type: "equity", closePrice: 213.49, closePriceAsOf: "2026-04-18" },
  { securityId: "sec-vti",  ticker: "VTI",  name: "Vanguard Total Stock Market ETF", type: "etf", closePrice: 241.82, closePriceAsOf: "2026-04-18" },
  { securityId: "sec-bnd",  ticker: "BND",  name: "Vanguard Total Bond Market ETF", type: "etf", closePrice: 74.31, closePriceAsOf: "2026-04-18" },
  { securityId: "sec-msft", ticker: "MSFT", name: "Microsoft Corporation", type: "equity", closePrice: 388.47, closePriceAsOf: "2026-04-18" },
  { securityId: "sec-vxus", ticker: "VXUS", name: "Vanguard Total International Stock ETF", type: "etf", closePrice: 57.92, closePriceAsOf: "2026-04-18" },
  { securityId: "sec-fxaix", ticker: "FXAIX", name: "Fidelity 500 Index Fund", type: "mutual_fund", closePrice: 198.34, closePriceAsOf: "2026-04-18" },
];

const INVESTMENT_ACCOUNTS: InvestmentAccount[] = [
  {
    investmentAccountId: "inv-acct-001",
    workspaceId: "ws-default",
    bankId: "bank-mock-001",
    accountId: "plaid-inv-001",
    institutionName: "Fidelity Investments",
    displayMask: "7821",
    accountType: "brokerage",
    balance: 48320.55,
    createdAt: new Date("2026-01-15").toISOString(),
    updatedAt: new Date("2026-04-18").toISOString(),
  },
  {
    investmentAccountId: "inv-acct-002",
    workspaceId: "ws-default",
    bankId: "bank-mock-001",
    accountId: "plaid-inv-002",
    institutionName: "Fidelity Investments",
    displayMask: "3345",
    accountType: "roth",
    balance: 22150.00,
    createdAt: new Date("2026-01-15").toISOString(),
    updatedAt: new Date("2026-04-18").toISOString(),
  },
];

const HOLDINGS: Holding[] = [
  // Brokerage holdings
  { holdingId: "hld-001", investmentAccountId: "inv-acct-001", securityId: "sec-aapl", security: SECURITIES[0], quantity: 42, institutionValue: 8966.58, costBasis: 7200.00, unrealizedGainLoss: 1766.58, unrealizedGainLossPct: 24.54 },
  { holdingId: "hld-002", investmentAccountId: "inv-acct-001", securityId: "sec-vti",  security: SECURITIES[1], quantity: 80, institutionValue: 19345.60, costBasis: 16800.00, unrealizedGainLoss: 2545.60, unrealizedGainLossPct: 15.15 },
  { holdingId: "hld-003", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",  security: SECURITIES[2], quantity: 100, institutionValue: 7431.00, costBasis: 7800.00, unrealizedGainLoss: -369.00, unrealizedGainLossPct: -4.73 },
  { holdingId: "hld-004", investmentAccountId: "inv-acct-001", securityId: "sec-msft", security: SECURITIES[3], quantity: 32, institutionValue: 12431.04, costBasis: 9920.00, unrealizedGainLoss: 2511.04, unrealizedGainLossPct: 25.31 },
  // Roth IRA holdings
  { holdingId: "hld-005", investmentAccountId: "inv-acct-002", securityId: "sec-fxaix", security: SECURITIES[5], quantity: 55, institutionValue: 10908.70, costBasis: 9500.00, unrealizedGainLoss: 1408.70, unrealizedGainLossPct: 14.83 },
  { holdingId: "hld-006", investmentAccountId: "inv-acct-002", securityId: "sec-vxus",  security: SECURITIES[4], quantity: 195, institutionValue: 11294.40, costBasis: 10200.00, unrealizedGainLoss: 1094.40, unrealizedGainLossPct: 10.73 },
];

const INVESTMENT_TRANSACTIONS: InvestmentTransaction[] = [
  // Buy orders
  { investmentTransactionId: "itxn-001", investmentAccountId: "inv-acct-001", securityId: "sec-vti",   security: SECURITIES[1], type: "buy",      name: "Buy VTI",   amount: 2418.20, quantity: 10, price: 241.82, fees: 0, date: "2026-04-10" },
  { investmentTransactionId: "itxn-002", investmentAccountId: "inv-acct-001", securityId: "sec-aapl",  security: SECURITIES[0], type: "buy",      name: "Buy AAPL",  amount: 1067.45, quantity: 5,  price: 213.49, fees: 0, date: "2026-04-05" },
  { investmentTransactionId: "itxn-004", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "buy",      name: "Buy BND",   amount: 3715.50, quantity: 50, price: 74.31,  fees: 0, date: "2026-03-01" },
  { investmentTransactionId: "itxn-005", investmentAccountId: "inv-acct-002", securityId: "sec-fxaix", security: SECURITIES[5], type: "buy",      name: "Buy FXAIX", amount: 991.70,  quantity: 5,  price: 198.34, fees: 0, date: "2026-04-01" },
  // Dividends — AAPL (quarterly)
  { investmentTransactionId: "itxn-d01", investmentAccountId: "inv-acct-001", securityId: "sec-aapl",  security: SECURITIES[0], type: "dividend", name: "AAPL Dividend",  amount: 24.36,  date: "2026-03-15" },
  { investmentTransactionId: "itxn-d02", investmentAccountId: "inv-acct-001", securityId: "sec-aapl",  security: SECURITIES[0], type: "dividend", name: "AAPL Dividend",  amount: 23.94,  date: "2025-12-15" },
  { investmentTransactionId: "itxn-d03", investmentAccountId: "inv-acct-001", securityId: "sec-aapl",  security: SECURITIES[0], type: "dividend", name: "AAPL Dividend",  amount: 23.52,  date: "2025-09-13" },
  { investmentTransactionId: "itxn-d04", investmentAccountId: "inv-acct-001", securityId: "sec-aapl",  security: SECURITIES[0], type: "dividend", name: "AAPL Dividend",  amount: 22.68,  date: "2025-06-14" },
  // Dividends — VTI (quarterly)
  { investmentTransactionId: "itxn-d05", investmentAccountId: "inv-acct-001", securityId: "sec-vti",   security: SECURITIES[1], type: "dividend", name: "VTI Dividend",   amount: 112.40, date: "2026-03-28" },
  { investmentTransactionId: "itxn-d06", investmentAccountId: "inv-acct-001", securityId: "sec-vti",   security: SECURITIES[1], type: "dividend", name: "VTI Dividend",   amount: 108.20, date: "2025-12-27" },
  { investmentTransactionId: "itxn-d07", investmentAccountId: "inv-acct-001", securityId: "sec-vti",   security: SECURITIES[1], type: "dividend", name: "VTI Dividend",   amount: 104.60, date: "2025-09-26" },
  { investmentTransactionId: "itxn-d08", investmentAccountId: "inv-acct-001", securityId: "sec-vti",   security: SECURITIES[1], type: "dividend", name: "VTI Dividend",   amount: 98.80,  date: "2025-06-27" },
  // Dividends — BND (monthly)
  { investmentTransactionId: "itxn-d09", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "dividend", name: "BND Interest",   amount: 22.41,  date: "2026-04-05" },
  { investmentTransactionId: "itxn-d10", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "dividend", name: "BND Interest",   amount: 22.41,  date: "2026-03-05" },
  { investmentTransactionId: "itxn-d11", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "dividend", name: "BND Interest",   amount: 22.41,  date: "2026-02-05" },
  { investmentTransactionId: "itxn-d12", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "dividend", name: "BND Interest",   amount: 21.95,  date: "2026-01-05" },
  { investmentTransactionId: "itxn-d13", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "dividend", name: "BND Interest",   amount: 21.95,  date: "2025-12-05" },
  { investmentTransactionId: "itxn-d14", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "dividend", name: "BND Interest",   amount: 21.95,  date: "2025-11-05" },
  // Dividends — MSFT (quarterly)
  { investmentTransactionId: "itxn-d15", investmentAccountId: "inv-acct-001", securityId: "sec-msft",  security: SECURITIES[3], type: "dividend", name: "MSFT Dividend",  amount: 26.24,  date: "2026-03-13" },
  { investmentTransactionId: "itxn-d16", investmentAccountId: "inv-acct-001", securityId: "sec-msft",  security: SECURITIES[3], type: "dividend", name: "MSFT Dividend",  amount: 24.96,  date: "2025-12-12" },
  { investmentTransactionId: "itxn-d17", investmentAccountId: "inv-acct-001", securityId: "sec-msft",  security: SECURITIES[3], type: "dividend", name: "MSFT Dividend",  amount: 24.32,  date: "2025-09-11" },
  // Dividends — FXAIX (semi-annual, Roth IRA)
  { investmentTransactionId: "itxn-d18", investmentAccountId: "inv-acct-002", securityId: "sec-fxaix", security: SECURITIES[5], type: "dividend", name: "FXAIX Distribution", amount: 48.60, date: "2025-12-30" },
  { investmentTransactionId: "itxn-d19", investmentAccountId: "inv-acct-002", securityId: "sec-fxaix", security: SECURITIES[5], type: "dividend", name: "FXAIX Distribution", amount: 21.45, date: "2025-06-28" },
  // DRIP reinvestments
  { investmentTransactionId: "itxn-r01", investmentAccountId: "inv-acct-001", securityId: "sec-vti",   security: SECURITIES[1], type: "buy",      name: "DRIP: VTI Reinvestment",  amount: 108.20, quantity: 0.45, price: 240.44, fees: 0, date: "2025-12-27" },
  { investmentTransactionId: "itxn-r02", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",   security: SECURITIES[2], type: "buy",      name: "DRIP: BND Reinvestment",  amount: 21.95,  quantity: 0.30, price: 73.17, fees: 0, date: "2025-12-05" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DividendRecord {
  investmentTransactionId: string;
  investmentAccountId: string;
  ticker: string;
  name: string;
  securityName: string;
  amount: number;
  date: string;
  isDRIP: boolean;
}

export interface DividendYield {
  holdingId: string;
  ticker: string;
  securityName: string;
  annualIncome: number;
  yieldOnCost: number;
  currentYield: number;
  frequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  isDRIPEnrolled: boolean;
  nextEstimatedDate: string;
  nextEstimatedAmount: number;
}

export interface DividendSummary {
  totalReceivedYTD: number;
  totalReceivedLTM: number;
  projectedAnnual: number;
  portfolioYield: number;
  yieldOnCost: number;
  monthlyBreakdown: { month: string; amount: number }[];
  byTicker: { ticker: string; securityName: string; amount: number; pct: number }[];
  dripTickers: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DRIP_TRANSACTIONS = new Set(
  INVESTMENT_TRANSACTIONS.filter((t) => t.name.startsWith("DRIP:")).map((t) => t.securityId)
);

const DIVIDEND_FREQUENCIES: Record<string, DividendYield["frequency"]> = {
  "sec-bnd":   "monthly",
  "sec-vti":   "quarterly",
  "sec-aapl":  "quarterly",
  "sec-msft":  "quarterly",
  "sec-fxaix": "semi-annual",
  "sec-vxus":  "quarterly",
};

const NEXT_DIV_DATES: Record<string, string> = {
  "sec-aapl":  "2026-06-14",
  "sec-vti":   "2026-06-27",
  "sec-bnd":   "2026-05-05",
  "sec-msft":  "2026-06-12",
  "sec-fxaix": "2026-06-28",
};

// Annualized dividend per share (mock)
const ANNUAL_DPS: Record<string, number> = {
  "sec-aapl":  0.99,
  "sec-vti":   3.20,
  "sec-bnd":   2.69,
  "sec-msft":  3.32,
  "sec-fxaix": 3.60,
  "sec-vxus":  1.68,
};

// ─── Service functions ────────────────────────────────────────────────────────

export function getInvestmentAccountsByWorkspace(workspaceId: string): InvestmentAccount[] {
  return INVESTMENT_ACCOUNTS.filter((a) => a.workspaceId === workspaceId || workspaceId === "ws-default");
}

export function getHoldingsByAccount(investmentAccountId: string): Holding[] {
  return HOLDINGS.filter((h) => h.investmentAccountId === investmentAccountId);
}

export function getInvestmentTransactionsByAccount(investmentAccountId: string): InvestmentTransaction[] {
  return INVESTMENT_TRANSACTIONS.filter((t) => t.investmentAccountId === investmentAccountId);
}

export function getTotalInvestmentBalance(workspaceId: string): number {
  return getInvestmentAccountsByWorkspace(workspaceId).reduce((sum, a) => sum + a.balance, 0);
}

export function getDividendHistory(workspaceId: string): DividendRecord[] {
  const accountIds = new Set(
    getInvestmentAccountsByWorkspace(workspaceId).map((a) => a.investmentAccountId)
  );
  return INVESTMENT_TRANSACTIONS
    .filter((t) => accountIds.has(t.investmentAccountId) && t.type === "dividend")
    .map((t) => ({
      investmentTransactionId: t.investmentTransactionId,
      investmentAccountId: t.investmentAccountId,
      ticker: t.security?.ticker ?? "—",
      name: t.name,
      securityName: t.security?.name ?? "Unknown",
      amount: t.amount,
      date: t.date,
      isDRIP: DRIP_TRANSACTIONS.has(t.securityId ?? ""),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDividendYields(workspaceId: string): DividendYield[] {
  const accounts = getInvestmentAccountsByWorkspace(workspaceId);
  const holdings = accounts.flatMap((a) => getHoldingsByAccount(a.investmentAccountId));
  const dividendHistory = getDividendHistory(workspaceId);

  return holdings
    .filter((h) => ANNUAL_DPS[h.securityId])
    .map((h) => {
      const annualDps = ANNUAL_DPS[h.securityId] ?? 0;
      const annualIncome = annualDps * h.quantity;
      const costPerShare = h.costBasis != null ? h.costBasis / h.quantity : 0;
      const currentPrice = h.security.closePrice ?? 0;
      const yieldOnCost = costPerShare > 0 ? (annualDps / costPerShare) * 100 : 0;
      const currentYield = currentPrice > 0 ? (annualDps / currentPrice) * 100 : 0;
      const frequency = DIVIDEND_FREQUENCIES[h.securityId] ?? "quarterly";

      // Next estimated payment
      const nextDate = NEXT_DIV_DATES[h.securityId] ?? "2026-07-01";
      const freqDivisor = frequency === "monthly" ? 12 : frequency === "semi-annual" ? 2 : 4;
      const nextAmount = (annualDps * h.quantity) / freqDivisor;

      // DRIP: check if recent reinvestment exists for this security
      const isDRIPEnrolled = dividendHistory.some(
        (d) => d.ticker === h.security.ticker && d.isDRIP
      );

      return {
        holdingId: h.holdingId,
        ticker: h.security.ticker ?? "—",
        securityName: h.security.name,
        annualIncome,
        yieldOnCost,
        currentYield,
        frequency,
        isDRIPEnrolled,
        nextEstimatedDate: nextDate,
        nextEstimatedAmount: nextAmount,
      };
    })
    .sort((a, b) => b.annualIncome - a.annualIncome);
}

export function getDividendSummary(workspaceId: string): DividendSummary {
  const history = getDividendHistory(workspaceId);
  const yields = getDividendYields(workspaceId);
  const totalPortfolioValue = getTotalInvestmentBalance(workspaceId);
  const accounts = getInvestmentAccountsByWorkspace(workspaceId);
  const allHoldings = accounts.flatMap((a) => getHoldingsByAccount(a.investmentAccountId));
  const totalCostBasis = allHoldings.reduce((s, h) => s + (h.costBasis ?? 0), 0);

  const now = new Date("2026-04-20");
  const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
  const ltmStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const totalReceivedYTD = history
    .filter((d) => d.date >= ytdStart)
    .reduce((s, d) => s + d.amount, 0);

  const totalReceivedLTM = history
    .filter((d) => d.date >= ltmStart)
    .reduce((s, d) => s + d.amount, 0);

  const projectedAnnual = yields.reduce((s, y) => s + y.annualIncome, 0);
  const portfolioYield = totalPortfolioValue > 0 ? (projectedAnnual / totalPortfolioValue) * 100 : 0;
  const yieldOnCost = totalCostBasis > 0 ? (projectedAnnual / totalCostBasis) * 100 : 0;

  // Monthly breakdown for the last 6 months
  const monthlyMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, 0);
  }
  for (const d of history) {
    const key = d.date.slice(0, 7);
    if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + d.amount);
  }
  const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month: new Date(month + "-01").toLocaleString("en-US", { month: "short" }),
    amount,
  }));

  // By ticker breakdown
  const tickerMap = new Map<string, { securityName: string; amount: number }>();
  for (const d of history.filter((h) => h.date >= ltmStart)) {
    const prev = tickerMap.get(d.ticker) ?? { securityName: d.securityName, amount: 0 };
    tickerMap.set(d.ticker, { securityName: d.securityName, amount: prev.amount + d.amount });
  }
  const total = Array.from(tickerMap.values()).reduce((s, v) => s + v.amount, 0);
  const byTicker = Array.from(tickerMap.entries())
    .map(([ticker, { securityName, amount }]) => ({
      ticker, securityName, amount, pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const dripTickers = yields.filter((y) => y.isDRIPEnrolled).map((y) => y.ticker);

  return {
    totalReceivedYTD,
    totalReceivedLTM,
    projectedAnnual,
    portfolioYield,
    yieldOnCost,
    monthlyBreakdown,
    byTicker,
    dripTickers,
  };
}

export const ACCOUNT_TYPE_LABELS: Record<InvestmentAccountType, string> = {
  brokerage: "Brokerage",
  ira: "Traditional IRA",
  roth: "Roth IRA",
  "401k": "401(k)",
  "403b": "403(b)",
  "529": "529 Plan",
  other: "Investment",
};
