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
}

// ─── Navigation ─────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
