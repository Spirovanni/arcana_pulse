import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import { CATEGORY_LABELS } from "@/lib/constants";
import { generateId } from "@/lib/utils";
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
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toTransaction(doc: Models.Document & Record<string, any>): Transaction {
  return {
    transactionId: doc.$id,
    workspaceId: doc.workspaceId,
    bankId: doc.bankId ?? null,
    sourceType: doc.sourceType,
    transactionType: doc.transactionType,
    title: doc.title,
    category: doc.category as Category,
    amount: doc.amount,
    date: doc.date,
    status: doc.status,
    note: doc.note ?? "",
    externalReference: doc.externalReference ?? undefined,
    aiCategory: doc.aiCategory ?? undefined,
    aiConfidence: doc.aiConfidence ?? undefined,
    createdBy: doc.createdBy,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listTransactions(
  filter: TransactionFilter,
  pagination?: PaginationParams
): Promise<PaginatedResult<Transaction>> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;

  const queries: string[] = [
    Query.equal("workspaceId", filter.workspaceId),
    Query.orderDesc("date"),
    Query.limit(pageSize),
    Query.offset((page - 1) * pageSize),
  ];

  if (filter.bankId) queries.push(Query.equal("bankId", filter.bankId));
  if (filter.transactionType)
    queries.push(Query.equal("transactionType", filter.transactionType));
  if (filter.sourceType)
    queries.push(Query.equal("sourceType", filter.sourceType));
  if (filter.category) queries.push(Query.equal("category", filter.category));
  if (filter.status) queries.push(Query.equal("status", filter.status));
  if (filter.dateFrom)
    queries.push(Query.greaterThanEqual("date", filter.dateFrom));
  if (filter.dateTo)
    queries.push(Query.lessThanEqual("date", filter.dateTo));
  if (filter.search) queries.push(Query.search("title", filter.search));

  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    queries
  );

  // For total count, run a separate query without pagination
  const countQueries = queries.filter(
    (q) =>
      !q.startsWith('limit') &&
      !q.startsWith('offset') &&
      !q.startsWith('orderDesc')
  );
  countQueries.push(Query.limit(1));
  const countResult = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    countQueries
  );

  const total = countResult.total;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items: result.documents.map(toTransaction),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getTransaction(
  transactionId: string
): Promise<Transaction | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.transactions,
      transactionId
    );
    return toTransaction(doc);
  } catch {
    return null;
  }
}

export async function getRecentTransactions(
  workspaceId: string,
  limit: number = 5
): Promise<Transaction[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    [
      Query.equal("workspaceId", workspaceId),
      Query.orderDesc("date"),
      Query.limit(limit),
    ]
  );
  return result.documents.map(toTransaction);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createTransaction(
  input: CreateTransactionInput,
  userId: string
): Promise<Transaction> {
  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.transactions,
    generateId("txn"),
    {
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
    }
  );
  return toTransaction(doc);
}

// ---------------------------------------------------------------------------
// Sync (Plaid)
// ---------------------------------------------------------------------------

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
  aiCategory?: Category;
  aiConfidence?: number;
}

export async function insertSyncedTransaction(
  input: SyncedTransactionInput
): Promise<Transaction> {
  // Check for duplicate by externalReference
  const existing = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    [Query.equal("externalReference", input.externalReference), Query.limit(1)]
  );
  if (existing.documents.length > 0) {
    return toTransaction(existing.documents[0]);
  }

  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.transactions,
    generateId("txn"),
    {
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
      ...(input.aiCategory ? { aiCategory: input.aiCategory } : {}),
      ...(input.aiConfidence != null ? { aiConfidence: input.aiConfidence } : {}),
      createdBy: "system",
    }
  );
  return toTransaction(doc);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateTransaction(
  transactionId: string,
  updates: UpdateTransactionInput
): Promise<Transaction> {
  const existing = await getTransaction(transactionId);
  if (!existing) throw new Error(`Transaction ${transactionId} not found`);
  if (existing.sourceType !== "manual") {
    throw new Error("Cannot edit synced or transfer transactions");
  }

  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.transactions,
    transactionId,
    updates
  );
  return toTransaction(doc);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteTransaction(
  transactionId: string
): Promise<void> {
  const existing = await getTransaction(transactionId);
  if (!existing) throw new Error(`Transaction ${transactionId} not found`);
  if (existing.sourceType !== "manual") {
    throw new Error("Cannot delete synced or transfer transactions");
  }
  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.transactions,
    transactionId
  );
}

// ---------------------------------------------------------------------------
// Override category (synced transactions)
// ---------------------------------------------------------------------------

/**
 * Allows overriding the category on a synced transaction.
 * This is a narrow exception to the "synced = read-only" rule.
 * The original AI suggestion is preserved in `aiCategory`.
 */
export async function overrideCategory(
  transactionId: string,
  newCategory: Category
): Promise<Transaction> {
  const existing = await getTransaction(transactionId);
  if (!existing) throw new Error(`Transaction ${transactionId} not found`);
  if (existing.sourceType !== "synced") {
    throw new Error("Category override is only for synced transactions");
  }

  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.transactions,
    transactionId,
    { category: newCategory }
  );
  return toTransaction(doc);
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

export async function sumByType(
  workspaceId: string,
  type: "income" | "expense"
): Promise<number> {
  // Fetch all matching transactions (up to 5000)
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    [
      Query.equal("workspaceId", workspaceId),
      Query.equal("transactionType", type),
      Query.limit(5000),
      Query.select(["amount"]),
    ]
  );
  return result.documents.reduce(
    (sum: number, doc: Models.Document & Record<string, any>) => sum + doc.amount,
    0
  );
}

export async function totalTransactionValue(
  workspaceId: string
): Promise<number> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    [
      Query.equal("workspaceId", workspaceId),
      Query.limit(5000),
      Query.select(["amount"]),
    ]
  );
  return result.documents.reduce(
    (sum: number, doc: Models.Document & Record<string, any>) => sum + doc.amount,
    0
  );
}

export async function getCategoryBreakdown(
  workspaceId: string,
  type?: "income" | "expense"
): Promise<CategoryBreakdown[]> {
  const queries: string[] = [
    Query.equal("workspaceId", workspaceId),
    Query.limit(5000),
    Query.select(["category", "amount", "transactionType"]),
  ];
  if (type) queries.push(Query.equal("transactionType", type));

  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    queries
  );

  const relevant = result.documents.filter(
    (doc: Models.Document & Record<string, any>) => doc.transactionType !== "transfer"
  );

  const totals: Record<string, number> = {};
  for (const doc of relevant) {
    totals[doc.category] = (totals[doc.category] || 0) + doc.amount;
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amount]) => ({
      category: cat as Category,
      label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat,
      amount,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
    }));
}

export async function getTopCategory(
  workspaceId: string
): Promise<Category> {
  const breakdown = await getCategoryBreakdown(workspaceId, "expense");
  return breakdown.length > 0 ? breakdown[0].category : "other";
}

export async function getMonthlyFlow(
  workspaceId: string
): Promise<{ month: string; income: number; expense: number }[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transactions,
    [
      Query.equal("workspaceId", workspaceId),
      Query.limit(5000),
      Query.select(["date", "amount", "transactionType"]),
    ]
  );

  const byMonth: Record<string, { income: number; expense: number }> = {};

  for (const doc of result.documents) {
    if (doc.transactionType === "transfer") continue;
    const month = doc.date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
    if (doc.transactionType === "income") byMonth[month].income += doc.amount;
    if (doc.transactionType === "expense")
      byMonth[month].expense += doc.amount;
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}
