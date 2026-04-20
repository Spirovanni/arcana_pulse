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
  { investmentTransactionId: "itxn-001", investmentAccountId: "inv-acct-001", securityId: "sec-vti", security: SECURITIES[1], type: "buy",  name: "Buy VTI", amount: 2418.20, quantity: 10, price: 241.82, fees: 0, date: "2026-04-10" },
  { investmentTransactionId: "itxn-002", investmentAccountId: "inv-acct-001", securityId: "sec-aapl", security: SECURITIES[0], type: "buy", name: "Buy AAPL", amount: 1067.45, quantity: 5, price: 213.49, fees: 0, date: "2026-04-05" },
  { investmentTransactionId: "itxn-003", investmentAccountId: "inv-acct-001", securityId: "sec-aapl", security: SECURITIES[0], type: "dividend", name: "AAPL Dividend", amount: 24.36, date: "2026-03-15" },
  { investmentTransactionId: "itxn-004", investmentAccountId: "inv-acct-001", securityId: "sec-bnd",  security: SECURITIES[2], type: "buy",  name: "Buy BND", amount: 3715.50, quantity: 50, price: 74.31, fees: 0, date: "2026-03-01" },
  { investmentTransactionId: "itxn-005", investmentAccountId: "inv-acct-002", securityId: "sec-fxaix", security: SECURITIES[5], type: "buy", name: "Buy FXAIX", amount: 991.70, quantity: 5, price: 198.34, fees: 0, date: "2026-04-01" },
];

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

export const ACCOUNT_TYPE_LABELS: Record<InvestmentAccountType, string> = {
  brokerage: "Brokerage",
  ira: "Traditional IRA",
  roth: "Roth IRA",
  "401k": "401(k)",
  "403b": "403(b)",
  "529": "529 Plan",
  other: "Investment",
};
