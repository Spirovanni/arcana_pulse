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
export type UserRole = "owner" | "admin" | "member";

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
  createdAt: string;
  updatedAt: string;
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

// ─── Navigation ─────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
