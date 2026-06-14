// ─── Enums ──────────────────────────────────────────────────────────

export type SourceType = "synced" | "manual" | "transfer";
export type TransactionType = "income" | "expense" | "transfer";
export type TransferStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "posted"
  | "failed"
  | "reversed";
export type TransactionStatus = "pending" | "posted" | "failed" | "cancelled";
export type WorkspacePlan = "starter" | "pro" | "team";
export type WorkspaceStatus = "active" | "suspended";
export type UserRole = "owner" | "admin" | "member" | "viewer";
export type MembershipType = "standard" | "student" | "employer";

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

// ─── Workspace Collaboration ─────────────────────────────────────────

export interface WorkspaceMember {
  memberId: string;
  workspaceId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  joinedAt: string;
}

export interface WorkspaceInvite {
  inviteId: string;
  workspaceId: string;
  invitedByUserId: string;
  email: string;
  role: UserRole;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

// ─── Category ───────────────────────────────────────────────────────

export type Category =
  | "salary"
  | "freelance"
  | "investment"
  | "refund"
  | "other_income"
  | "housing"
  | "transportation"
  | "food"
  | "utilities"
  | "healthcare"
  | "entertainment"
  | "shopping"
  | "education"
  | "subscriptions"
  | "travel"
  | "transfer"
  | "other";

// ─── Core Entities ──────────────────────────────────────────────────

export interface Workspace {
  workspaceId: string;
  name: string;
  ownerUserId: string;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  workspaceId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  role: UserRole;
  membershipType: MembershipType;
  createdAt: string;
  updatedAt: string;
}

// ─── Recruitment Funnel ──────────────────────────────────────────────

export type PipelineStatus = "sourced" | "interviewing" | "offer_pending" | "hired" | "rejected";

export interface Candidate {
  candidateId: string;
  workspaceId: string;
  firstName: string;
  lastName: string;
  targetRole: string;
  matchScore: number;
  status: PipelineStatus;
  avatarUrl?: string;
  appliedDate: string;
  lastActionDate: string;
}

export interface Bank {
  bankId: string;
  workspaceId: string;
  institutionName: string;
  accountId: string;
  displayMask: string;
  accessTokenRef?: string;
  fundingSourceUrl?: string;
  shareableId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  workspaceId: string;
  bankId: string | null;
  sourceType: SourceType;
  transactionType: TransactionType;
  title: string;
  category: Category;
  amount: number;
  date: string;
  status: TransactionStatus;
  note: string;
  externalReference?: string;
  aiCategory?: Category;
  aiConfidence?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transfer {
  transferId: string;
  workspaceId: string;
  senderBankId: string;
  receiverShareableId: string;
  recipientEmail?: string;
  amount: number;
  note: string;
  status: TransferStatus;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Service Types ──────────────────────────────────────────────────

export interface TransactionFilter {
  workspaceId: string;
  bankId?: string;
  transactionType?: TransactionType;
  sourceType?: SourceType;
  category?: Category;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateTransactionInput {
  workspaceId: string;
  bankId?: string | null;
  transactionType: TransactionType;
  title: string;
  category: Category;
  amount: number;
  date: string;
  note?: string;
}

export interface UpdateTransactionInput {
  title?: string;
  category?: Category;
  amount?: number;
  date?: string;
  note?: string;
  status?: TransactionStatus;
}

export interface CategoryBreakdown {
  category: Category;
  label: string;
  amount: number;
  percentage: number;
}

export interface AccountDistribution {
  bankId: string;
  institutionName: string;
  displayMask: string;
  balance: number;
  percentage: number;
}

export interface MonthlyFlow {
  month: string;
  income: number;
  expense: number;
}

// ─── Dashboard Metrics ──────────────────────────────────────────────

export interface DashboardMetrics {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalTransactionValue: number;
  savingsRate: number;
  spendingRate: number;
  topCategory: Category;
  accountCount: number;
  recentTransactions: Transaction[];
  categoryBreakdown: CategoryBreakdown[];
  accountDistribution: AccountDistribution[];
  monthlyFlow: MonthlyFlow[];
}

// ─── Spending Insights ──────────────────────────────────────────────

export type InsightType =
  | "spending_spike"
  | "savings_trend"
  | "recurring_charge"
  | "anomaly"
  | "tip";

export type InsightSeverity = "info" | "warning" | "success";

export interface SpendingInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  category?: Category;
  amount?: number;
  percentageChange?: number;
}

// ─── Cash Flow Forecasting ──────────────────────────────────────────

export type RecurrenceFrequency = "weekly" | "bi-weekly" | "monthly";

export interface RecurringPattern {
  id: string;
  title: string;
  category: Category;
  transactionType: "income" | "expense";
  frequency: RecurrenceFrequency;
  averageAmount: number;
  lastOccurrence: string;
  nextExpected: string;
  occurrenceCount: number;
  confidence: number;
}

export interface ForecastBucket {
  month: string;
  projectedIncome: number;
  projectedExpense: number;
  netCashFlow: number;
}

export interface FlaggedExpense {
  title: string;
  category: Category;
  expectedAmount: number;
  expectedDate: string;
  percentOfAvgIncome: number;
}

export interface CashFlowForecast {
  recurringPatterns: RecurringPattern[];
  forecast: ForecastBucket[];
  flaggedExpenses: FlaggedExpense[];
  aiSummary: string | null;
  generatedAt: string;
}

// ─── Budget Recommendations ─────────────────────────────────────────

export type BudgetSource = "ai" | "user";

export type BudgetStatus = "on_track" | "warning" | "over_budget";

export interface Budget {
  budgetId: string;
  workspaceId: string;
  category: Category;
  amount: number;
  source: BudgetSource;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRecommendation {
  category: Category;
  recommendedAmount: number;
  rationale: string;
  percentOfIncome: number;
}

// ─── Savings Goals ──────────────────────────────────────────────────

export type GoalPriority = "low" | "medium" | "high";

export type GoalStatus = "active" | "completed" | "paused";

export interface SavingsGoal {
  goalId: string;
  workspaceId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProjection {
  goalId: string;
  projectedCompletionDate: string;
  suggestedMonthlyContribution: number;
  onTrack: boolean;
  narrative: string;
}

// ─── Investments ────────────────────────────────────────────────────

export type InvestmentAccountType =
  | "brokerage"
  | "ira"
  | "roth"
  | "401k"
  | "403b"
  | "529"
  | "other";

export type InvestmentTransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "transfer"
  | "other";

export interface InvestmentAccount {
  investmentAccountId: string;
  workspaceId: string;
  bankId: string;
  accountId: string;
  institutionName: string;
  displayMask: string;
  accountType: InvestmentAccountType;
  balance: number;
  accessTokenRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Security {
  securityId: string;
  ticker?: string;
  name: string;
  type: "equity" | "etf" | "mutual_fund" | "fixed_income" | "cash" | "other";
  closePrice?: number;
  closePriceAsOf?: string;
  isin?: string;
}

export interface Holding {
  holdingId: string;
  investmentAccountId: string;
  securityId: string;
  security: Security;
  quantity: number;
  institutionValue: number;
  costBasis?: number;
  unrealizedGainLoss?: number;
  unrealizedGainLossPct?: number;
}

export interface InvestmentTransaction {
  investmentTransactionId: string;
  investmentAccountId: string;
  securityId?: string;
  security?: Security;
  type: InvestmentTransactionType;
  name: string;
  amount: number;
  quantity?: number;
  price?: number;
  fees?: number;
  date: string;
}

// ─── Navigation ─────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

// ─── Alpaca Markets ──────────────────────────────────────────────────

export interface AlpacaAccount {
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  dayPLAmount: number;
  dayPLPercent: number;
  totalPLAmount: number;
  totalPLPercent: number;
  status: string;
  accountNumber: string;
  currency: string;
  patternDayTrader: boolean;
}

export interface AlpacaPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPL: number;
  unrealizedPLPC: number;
  unrealizedIntradayPL: number;
  unrealizedIntradayPLPC: number;
  side: "long" | "short";
  assetClass: string;
}

export type AlpacaOrderSide = "buy" | "sell";
export type AlpacaOrderType = "market" | "limit" | "stop" | "stop_limit";
export type AlpacaTimeInForce = "day" | "gtc" | "ioc" | "fok";
export type AlpacaOrderStatus =
  | "new" | "partially_filled" | "filled" | "done_for_day"
  | "canceled" | "expired" | "replaced" | "pending_cancel"
  | "pending_replace" | "accepted" | "pending_new" | "accepted_for_bidding"
  | "stopped" | "rejected" | "suspended" | "calculated";

export interface AlpacaOrder {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: AlpacaOrderSide;
  type: AlpacaOrderType;
  timeInForce: AlpacaTimeInForce;
  qty: number;
  filledQty: number;
  filledAvgPrice: number | null;
  limitPrice: number | null;
  stopPrice: number | null;
  status: AlpacaOrderStatus;
  submittedAt: string;
  filledAt: string | null;
  canceledAt: string | null;
  notional: number | null;
  assetClass: string;
}

export interface PlaceOrderInput {
  symbol: string;
  qty: number;
  side: AlpacaOrderSide;
  type: AlpacaOrderType;
  timeInForce: AlpacaTimeInForce;
  limitPrice?: number;
  stopPrice?: number;
}

export interface PerformancePoint {
  date: string;        // ISO date string
  value: number;       // portfolio equity value
  percentReturn: number;
}

export interface AlpacaAsset {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  assetClass: string;
  tradable: boolean;
  fractionable: boolean;
}

// ─── Resource Vault ──────────────────────────────────────────────────

export type ResourceType =
  | "documentation"
  | "grant"
  | "writing"
  | "finance"
  | "code"
  | "reference"
  | "other";

export type ResourceSource = "manual" | "mcp" | "import";

export interface ArcanaResource {
  resourceId: string;
  userId: string;
  url: string;
  title: string;
  notes?: string;
  tags?: string[];
  resourceType?: ResourceType;
  projectKey?: string;
  source: ResourceSource;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceInput {
  url: string;
  title: string;
  notes?: string;
  tags?: string[];
  resourceType?: ResourceType;
  projectKey?: string;
  source?: ResourceSource;
}

// ─── MCP Personal Access Token ───────────────────────────────────────

export interface McpToken {
  tokenId: string;
  userId: string;
  tokenHash: string;
  label: string;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

// ─── Admin / Platform ─────────────────────────────────────────────────

export interface FeatureFlag {
  flagId: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  updatedAt: string;
  updatedBy: string;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeWorkspaces: number;
  totalTransactionVolume: number;
  totalTransactionCount: number;
  totalRevenue: number;
  newUsersLast30Days: number;
  generatedAt: string;
}

export interface AdminUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipType: MembershipType;
  workspaceId: string;
  createdAt: string;
  emailVerified: boolean;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userEmail: string;
  subject: string;
  body: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

