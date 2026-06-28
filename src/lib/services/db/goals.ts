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
  GoalType,
} from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toSavingsGoal(
  doc: Models.Document & Record<string, any>
): SavingsGoal {
  let questionnaireResponses: Record<string, string> | undefined;
  if (typeof doc.questionnaireResponsesJson === "string") {
    try {
      questionnaireResponses = JSON.parse(doc.questionnaireResponsesJson);
    } catch {
      questionnaireResponses = undefined;
    }
  }

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
    goalType:
      typeof doc.goalType === "string"
        ? (doc.goalType as GoalType)
        : undefined,
    questionnaireResponses,
    aiPlan: typeof doc.aiPlan === "string" ? doc.aiPlan : undefined,
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
  monthlyContribution: number = 0,
  options?: {
    goalType?: GoalType;
    questionnaireResponses?: Record<string, string>;
    aiPlan?: string;
  }
): Promise<SavingsGoal> {
  const payload = {
    workspaceId,
    name,
    targetAmount,
    currentAmount: 0,
    targetDate,
    monthlyContribution,
    priority,
    status: "active",
    ...(options?.goalType ? { goalType: options.goalType } : {}),
    ...(options?.questionnaireResponses
      ? {
          questionnaireResponsesJson: JSON.stringify(
            options.questionnaireResponses
          ),
        }
      : {}),
    ...(options?.aiPlan ? { aiPlan: options.aiPlan } : {}),
  };

  let doc: Models.Document & Record<string, any>;
  try {
    doc = (await getDatabase().createDocument(
      DATABASE_ID,
      COLLECTIONS.goals,
      generateId("goal"),
      payload
    )) as Models.Document & Record<string, any>;
  } catch {
    doc = (await getDatabase().createDocument(
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
    )) as Models.Document & Record<string, any>;
  }

  return toSavingsGoal(doc);
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
      | "goalType"
      | "questionnaireResponses"
      | "aiPlan"
    >
  >
): Promise<SavingsGoal> {
  const payload: Record<string, unknown> = {
    ...updates,
    ...(updates.questionnaireResponses
      ? {
          questionnaireResponsesJson: JSON.stringify(
            updates.questionnaireResponses
          ),
        }
      : {}),
  };
  delete payload.questionnaireResponses;

  let doc: Models.Document & Record<string, any>;
  try {
    doc = (await getDatabase().updateDocument(
      DATABASE_ID,
      COLLECTIONS.goals,
      goalId,
      payload
    )) as Models.Document & Record<string, any>;
  } catch {
    // Graceful fallback for older schemas that do not yet have new goal fields.
    const { goalType, aiPlan, questionnaireResponsesJson, ...legacyPayload } =
      payload;
    doc = (await getDatabase().updateDocument(
      DATABASE_ID,
      COLLECTIONS.goals,
      goalId,
      legacyPayload
    )) as Models.Document & Record<string, any>;
  }

  return toSavingsGoal(doc);
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
