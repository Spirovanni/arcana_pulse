import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import { generateId } from "@/lib/utils";
import type { Budget, BudgetSource, Category } from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toBudget(doc: Models.Document & Record<string, any>): Budget {
  return {
    budgetId: doc.$id,
    workspaceId: doc.workspaceId,
    category: doc.category as Category,
    amount: doc.amount,
    source: doc.source as BudgetSource,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getBudgetsByWorkspace(
  workspaceId: string
): Promise<Budget[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.budgets,
    [
      Query.equal("workspaceId", workspaceId),
      Query.limit(100),
    ]
  );

  return result.documents.map((doc) =>
    toBudget(doc as Models.Document & Record<string, any>)
  );
}

// ---------------------------------------------------------------------------
// Upsert (create or update by workspace + category)
// ---------------------------------------------------------------------------

export async function upsertBudget(
  workspaceId: string,
  category: Category,
  amount: number,
  source: BudgetSource
): Promise<Budget> {
  // Check if budget already exists for this workspace + category
  const existing = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.budgets,
    [
      Query.equal("workspaceId", workspaceId),
      Query.equal("category", category),
      Query.limit(1),
    ]
  );

  if (existing.documents.length > 0) {
    // Update existing
    const doc = await getDatabase().updateDocument(
      DATABASE_ID,
      COLLECTIONS.budgets,
      existing.documents[0].$id,
      { amount, source }
    );
    return toBudget(doc as Models.Document & Record<string, any>);
  }

  // Create new
  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.budgets,
    generateId("bdg"),
    {
      workspaceId,
      category,
      amount,
      source,
    }
  );

  return toBudget(doc as Models.Document & Record<string, any>);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteBudget(budgetId: string): Promise<void> {
  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.budgets,
    budgetId
  );
}
