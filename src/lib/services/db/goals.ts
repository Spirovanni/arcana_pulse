import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import { generateId } from "@/lib/utils";
import type {
  SavingsGoal,
  GoalPriority,
  GoalStatus,
} from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toSavingsGoal(
  doc: Models.Document & Record<string, any>
): SavingsGoal {
  return {
    goalId: doc.$id,
    workspaceId: doc.workspaceId,
    name: doc.name,
    targetAmount: doc.targetAmount,
    currentAmount: doc.currentAmount ?? 0,
    targetDate: doc.targetDate,
    monthlyContribution: doc.monthlyContribution ?? 0,
    priority: (doc.priority ?? "medium") as GoalPriority,
    status: (doc.status ?? "active") as GoalStatus,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getGoalsByWorkspace(
  workspaceId: string
): Promise<SavingsGoal[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.goals,
    [
      Query.equal("workspaceId", workspaceId),
      Query.limit(100),
    ]
  );

  return result.documents.map((doc) =>
    toSavingsGoal(doc as Models.Document & Record<string, any>)
  );
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createGoal(
  workspaceId: string,
  name: string,
  targetAmount: number,
  targetDate: string,
  priority: GoalPriority = "medium",
  monthlyContribution: number = 0
): Promise<SavingsGoal> {
  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.goals,
    generateId("goal"),
    {
      workspaceId,
      name,
      targetAmount,
      currentAmount: 0,
      targetDate,
      monthlyContribution,
      priority,
      status: "active",
    }
  );

  return toSavingsGoal(doc as Models.Document & Record<string, any>);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateGoal(
  goalId: string,
  updates: Partial<
    Pick<
      SavingsGoal,
      | "name"
      | "targetAmount"
      | "currentAmount"
      | "targetDate"
      | "monthlyContribution"
      | "priority"
      | "status"
    >
  >
): Promise<SavingsGoal> {
  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.goals,
    goalId,
    updates
  );

  return toSavingsGoal(doc as Models.Document & Record<string, any>);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteGoal(goalId: string): Promise<void> {
  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.goals,
    goalId
  );
}
