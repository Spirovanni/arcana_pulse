import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import {
  getGoalsByWorkspace,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/services/db/goals";
import {
  getGoalsByWorkspace as getGoalsByWorkspaceLocal,
  createGoal as createGoalLocal,
  updateGoal as updateGoalLocal,
  deleteGoal as deleteGoalLocal,
} from "@/lib/services/goals";
import { generateGoalActionPlan } from "@/lib/services/ai/goals";
import { requireAuth } from "@/lib/auth/withAuth";
import type { GoalPriority, GoalStatus, GoalType } from "@/lib/types";
import { GOAL_TYPE_CONFIG } from "@/lib/goalQuestionnaires";
import { appwriteCircuit } from "@/lib/resilience/circuit-breaker";

const VALID_PRIORITIES: Set<string> = new Set(["low", "medium", "high"]);
const VALID_STATUSES: Set<string> = new Set(["active", "completed", "paused"]);
const VALID_GOAL_TYPES: Set<string> = new Set(Object.keys(GOAL_TYPE_CONFIG));

async function withAppwriteCircuitRecovery<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Appwrite error";
    if (message.includes("Circuit breaker is OPEN")) {
      appwriteCircuit.reset();
      return operation();
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  try {
    let goals;
    if (isAppwriteConfigured()) {
      try {
        goals = await withAppwriteCircuitRecovery(() =>
          getGoalsByWorkspace(workspaceId)
        );
      } catch {
        goals = getGoalsByWorkspaceLocal(workspaceId);
      }
    } else {
      goals = getGoalsByWorkspaceLocal(workspaceId);
    }

    return NextResponse.json({ goals });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  try {
    const body = await request.json();
    const { name, targetAmount, targetDate, priority, monthlyContribution } =
      body as {
        name?: string;
        targetAmount?: number;
        targetDate?: string;
        priority?: string;
        monthlyContribution?: number;
        goalType?: string;
        questionnaireResponses?: Record<string, string>;
      };
    const goalType = typeof body.goalType === "string" ? body.goalType : "custom";
    const rawQuestionnaireResponses =
      body.questionnaireResponses &&
      typeof body.questionnaireResponses === "object"
        ? (body.questionnaireResponses as Record<string, string>)
        : {};
    const questionnaireResponses = Object.fromEntries(
      Object.entries(rawQuestionnaireResponses).map(([key, value]) => [
        key,
        typeof value === "string" ? value : String(value ?? ""),
      ])
    );

    if (!workspaceId || !name || targetAmount == null || !targetDate) {
      return NextResponse.json(
        { error: "workspaceId, name, targetAmount, and targetDate are required" },
        { status: 400 }
      );
    }

    if (typeof targetAmount !== "number" || targetAmount <= 0) {
      return NextResponse.json(
        { error: "targetAmount must be a positive number" },
        { status: 400 }
      );
    }

    if (priority && !VALID_PRIORITIES.has(priority)) {
      return NextResponse.json(
        { error: `Invalid priority: ${priority}` },
        { status: 400 }
      );
    }

    if (!VALID_GOAL_TYPES.has(goalType)) {
      return NextResponse.json(
        { error: `Invalid goalType: ${goalType}` },
        { status: 400 }
      );
    }

    const requiredQuestions =
      GOAL_TYPE_CONFIG[goalType as GoalType].questions.filter((q) => q.required);
    for (const question of requiredQuestions) {
      if (!String(questionnaireResponses[question.id] ?? "").trim()) {
        return NextResponse.json(
          {
            error: `Question "${question.prompt}" is required for ${GOAL_TYPE_CONFIG[goalType as GoalType].label} goals.`,
          },
          { status: 400 }
        );
      }
    }

    let aiPlan = "";
    try {
      aiPlan = await generateGoalActionPlan({
        workspaceId,
        name,
        goalType: goalType as GoalType,
        targetAmount,
        targetDate,
        monthlyContribution: monthlyContribution ?? 0,
        priority: (priority as GoalPriority) ?? "medium",
        questionnaireResponses,
      });
    } catch {
      aiPlan = "";
    }

    let goal;
    const useDb = isAppwriteConfigured();
    if (useDb) {
      try {
        goal = await withAppwriteCircuitRecovery(() =>
          createGoal(
            workspaceId,
            name,
            targetAmount,
            targetDate,
            (priority as GoalPriority) ?? "medium",
            monthlyContribution ?? 0,
            {
              goalType: goalType as GoalType,
              questionnaireResponses,
              aiPlan,
            }
          )
        );
      } catch {
        // Backward-compatible fallback if goal schema is not yet migrated.
        try {
          goal = await withAppwriteCircuitRecovery(() =>
            createGoal(
              workspaceId,
              name,
              targetAmount,
              targetDate,
              (priority as GoalPriority) ?? "medium",
              monthlyContribution ?? 0
            )
          );
        } catch {
          goal = createGoalLocal(
            workspaceId,
            name,
            targetAmount,
            targetDate,
            (priority as GoalPriority) ?? "medium",
            monthlyContribution ?? 0,
            {
              goalType: goalType as GoalType,
              questionnaireResponses,
              aiPlan,
            }
          );
        }
      }
    } else {
      goal = createGoalLocal(
        workspaceId,
        name,
        targetAmount,
        targetDate,
        (priority as GoalPriority) ?? "medium",
        monthlyContribution ?? 0,
        {
          goalType: goalType as GoalType,
          questionnaireResponses,
          aiPlan,
        }
      );
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { goalId, ...updates } = body as {
      goalId?: string;
      name?: string;
      targetAmount?: number;
      currentAmount?: number;
      targetDate?: string;
      monthlyContribution?: number;
      priority?: string;
      status?: string;
      goalType?: string;
      questionnaireResponses?: Record<string, string>;
      aiPlan?: string;
    };

    if (!goalId) {
      return NextResponse.json(
        { error: "goalId is required" },
        { status: 400 }
      );
    }

    if (updates.priority && !VALID_PRIORITIES.has(updates.priority)) {
      return NextResponse.json(
        { error: `Invalid priority: ${updates.priority}` },
        { status: 400 }
      );
    }

    if (updates.status && !VALID_STATUSES.has(updates.status)) {
      return NextResponse.json(
        { error: `Invalid status: ${updates.status}` },
        { status: 400 }
      );
    }
    if (updates.goalType && !VALID_GOAL_TYPES.has(updates.goalType)) {
      return NextResponse.json(
        { error: `Invalid goalType: ${updates.goalType}` },
        { status: 400 }
      );
    }

    let aiPlan = updates.aiPlan;
    const hasQuestionnaire =
      updates.questionnaireResponses &&
      typeof updates.questionnaireResponses === "object";
    if (updates.goalType && hasQuestionnaire) {
      const requiredQuestions =
        GOAL_TYPE_CONFIG[updates.goalType as GoalType].questions.filter(
          (q) => q.required
        );
      for (const question of requiredQuestions) {
        if (
          !String(updates.questionnaireResponses?.[question.id] ?? "").trim()
        ) {
          return NextResponse.json(
            {
              error: `Question "${question.prompt}" is required for ${GOAL_TYPE_CONFIG[updates.goalType as GoalType].label} goals.`,
            },
            { status: 400 }
          );
        }
      }
      aiPlan = await generateGoalActionPlan({
        workspaceId: auth.workspaceId,
        name: updates.name ?? "Savings Goal",
        goalType: updates.goalType as GoalType,
        targetAmount: updates.targetAmount ?? 1,
        targetDate: updates.targetDate ?? new Date().toISOString().split("T")[0],
        monthlyContribution: updates.monthlyContribution ?? 0,
        priority: (updates.priority as GoalPriority) ?? "medium",
        questionnaireResponses: updates.questionnaireResponses ?? {},
      });
    }

    const {
      priority: rawPriority,
      status: rawStatus,
      goalType: rawGoalType,
      questionnaireResponses: rawQuestionnaireResponses,
      ...rest
    } = updates;
    const typedUpdates: Parameters<typeof updateGoal>[1] = {
      ...rest,
      ...(rawPriority ? { priority: rawPriority as GoalPriority } : {}),
      ...(rawStatus ? { status: rawStatus as GoalStatus } : {}),
      ...(rawGoalType ? { goalType: rawGoalType as GoalType } : {}),
      ...(rawQuestionnaireResponses
        ? { questionnaireResponses: rawQuestionnaireResponses }
        : {}),
      ...(aiPlan ? { aiPlan } : {}),
    };

    let goal;
    if (isAppwriteConfigured()) {
      try {
        goal = await withAppwriteCircuitRecovery(() =>
          updateGoal(goalId, typedUpdates)
        );
      } catch {
        goal = updateGoalLocal(goalId, typedUpdates);
      }
    } else {
      goal = updateGoalLocal(goalId, typedUpdates);
    }

    return NextResponse.json({ goal });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

  try {
    const goalId = request.nextUrl.searchParams.get("goalId");

    if (!goalId) {
      return NextResponse.json(
        { error: "goalId query parameter is required" },
        { status: 400 }
      );
    }

    if (isAppwriteConfigured()) {
      try {
        await withAppwriteCircuitRecovery(() => deleteGoal(goalId));
      } catch {
        deleteGoalLocal(goalId);
      }
    } else {
      deleteGoalLocal(goalId);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete goal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
