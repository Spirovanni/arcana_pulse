import type {
  Transaction,
  TransactionFilter,
  PaginationParams,
  PaginatedResult,
  CreateTransactionInput,
  UpdateTransactionInput,
  Category,
  CategoryBreakdown,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import { generateId } from "@/lib/utils";
import { mockTransactions } from "@/lib/mock/data";

// ─── In-memory store (mock persistence) ─────────────────────────────
// Structured for future replacement with Appwrite document operations.

let transactions: Transaction[] = [...mockTransactions];

// ─── Helpers ────────────────────────────────────────────────────────

function matchesFilter(txn: Transaction, filter: TransactionFilter): boolean {
  if (txn.workspaceId !== filter.workspaceId) return false;
  if (filter.bankId && txn.bankId !== filter.bankId) return false;
  if (filter.transactionType && txn.transactionType !== filter.transactionType)
    return false;
  if (filter.sourceType && txn.sourceType !== filter.sourceType) return false;
  if (filter.category && txn.category !== filter.category) return false;
  if (filter.status && txn.status !== filter.status) return false;
  if (filter.dateFrom && txn.date < filter.dateFrom) return false;
  if (filter.dateTo && txn.date > filter.dateTo) return false;
  if (
    filter.search &&
    !txn.title.toLowerCase().includes(filter.search.toLowerCase()) &&
    !txn.note.toLowerCase().includes(filter.search.toLowerCase())
  )
    return false;
  return true;
}

// ─── Read ───────────────────────────────────────────────────────────

export function listTransactions(
  filter: TransactionFilter,
  pagination?: PaginationParams
): PaginatedResult<Transaction> {
  const filtered = transactions
    .filter((t) => matchesFilter(t, filter))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

export function getTransaction(transactionId: string): Transaction | null {
  const txn = transactions.find((t) => t.transactionId === transactionId);
  return txn ? { ...txn } : null;
}

export function getRecentTransactions(
  workspaceId: string,
  limit: number = 5
): Transaction[] {
  return transactions
    .filter((t) => t.workspaceId === workspaceId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

// ─── Create ─────────────────────────────────────────────────────────

export function createTransaction(
  input: CreateTransactionInput,
  userId: string
): Transaction {
  const now = new Date().toISOString();
  const txn: Transaction = {
    transactionId: generateId("txn"),
    workspaceId: input.workspaceId,
    bankId: input.bankId ?? null,
    sourceType: "manual",
    transactionType: input.transactionType,
    title: input.title,
    category: input.category,
    amount: input.amount,
    date: input.date,
    status: "posted",
    note: input.note ?? "",
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  transactions = [txn, ...transactions];
  return { ...txn };
}

// ─── Sync (Plaid) ───────────────────────────────────────────────────

export interface SyncedTransactionInput {
  workspaceId: string;
  bankId: string;
  transactionType: "income" | "expense";
  title: string;
  category: Category;
  amount: number;
  date: string;
  externalReference: string;
  note?: string;
}

export function insertSyncedTransaction(
  input: SyncedTransactionInput
): Transaction {
  // Skip duplicates by externalReference
  const existing = transactions.find(
    (t) => t.externalReference === input.externalReference
  );
  if (existing) return { ...existing };

  const now = new Date().toISOString();
  const txn: Transaction = {
    transactionId: generateId("txn"),
    workspaceId: input.workspaceId,
    bankId: input.bankId,
    sourceType: "synced",
    transactionType: input.transactionType,
    title: input.title,
    category: input.category,
    amount: input.amount,
    date: input.date,
    status: "posted",
    note: input.note ?? "",
    externalReference: input.externalReference,
    createdBy: "system",
    createdAt: now,
    updatedAt: now,
  };
  transactions = [txn, ...transactions];
  return { ...txn };
}

// ─── Update ─────────────────────────────────────────────────────────

export function updateTransaction(
  transactionId: string,
  updates: UpdateTransactionInput
): Transaction {
  const idx = transactions.findIndex(
    (t) => t.transactionId === transactionId
  );
  if (idx === -1) throw new Error(`Transaction ${transactionId} not found`);

  const existing = transactions[idx];
  if (existing.sourceType !== "manual") {
    throw new Error("Cannot edit synced or transfer transactions");
  }

  const updated: Transaction = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  transactions = [
    ...transactions.slice(0, idx),
    updated,
    ...transactions.slice(idx + 1),
  ];
  return { ...updated };
}

// ─── Delete ─────────────────────────────────────────────────────────

export function deleteTransaction(transactionId: string): void {
  const idx = transactions.findIndex(
    (t) => t.transactionId === transactionId
  );
  if (idx === -1) throw new Error(`Transaction ${transactionId} not found`);

  const existing = transactions[idx];
  if (existing.sourceType !== "manual") {
    throw new Error("Cannot delete synced or transfer transactions");
  }

  transactions = [
    ...transactions.slice(0, idx),
    ...transactions.slice(idx + 1),
  ];
}

// ─── Aggregations ───────────────────────────────────────────────────

export function sumByType(
  workspaceId: string,
  type: "income" | "expense",
  sourceType?: "synced" | "manual" | "transfer"
): number {
  return transactions
    .filter(
      (t) =>
        t.workspaceId === workspaceId &&
        t.transactionType === type &&
        (sourceType ? t.sourceType === sourceType : true)
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

export function totalTransactionValue(workspaceId: string): number {
  return transactions
    .filter((t) => t.workspaceId === workspaceId)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getCategoryBreakdown(
  workspaceId: string,
  type?: "income" | "expense",
  sourceType?: "synced" | "manual" | "transfer"
): CategoryBreakdown[] {
  const relevant = transactions.filter(
    (t) =>
      t.workspaceId === workspaceId &&
      (type ? t.transactionType === type : true) &&
      (sourceType ? t.sourceType === sourceType : true) &&
      t.transactionType !== "transfer"
  );

  const totals: Record<string, number> = {};
  for (const t of relevant) {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => ({
      category: cat as Category,
      label:
        CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat,
      amount,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
    }));
}

export function getTopCategory(workspaceId: string): Category {
  const breakdown = getCategoryBreakdown(workspaceId, "expense");
  return breakdown.length > 0 ? breakdown[0].category : "other";
}

export function getMonthlyFlow(
  workspaceId: string,
  sourceType?: "synced" | "manual" | "transfer"
): { month: string; income: number; expense: number }[] {
  const byMonth: Record<string, { income: number; expense: number }> = {};

  for (const t of transactions) {
    if (t.workspaceId !== workspaceId) continue;
    if (sourceType && t.sourceType !== sourceType) continue;
    if (t.transactionType === "transfer") continue;
    const month = t.date.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
    if (t.transactionType === "income") byMonth[month].income += t.amount;
    if (t.transactionType === "expense") byMonth[month].expense += t.amount;
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
