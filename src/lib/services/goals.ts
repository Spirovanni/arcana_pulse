import { generateId } from "@/lib/utils";
import type {
  SavingsGoal,
  GoalPriority,
  GoalStatus,
  GoalType,
} from "@/lib/types";

let goalsStore: SavingsGoal[] = [];

export function getGoalsByWorkspace(workspaceId: string): SavingsGoal[] {
  return goalsStore
    .filter((goal) => goal.workspaceId === workspaceId)
    .map((goal) => ({ ...goal }));
}

export function createGoal(
  workspaceId: string,
  name: string,
  targetAmount: number,
  targetDate: string,
  priority: GoalPriority = "medium",
  monthlyContribution = 0,
  options?: {
    goalType?: GoalType;
    questionnaireResponses?: Record<string, string>;
    aiPlan?: string;
  }
): SavingsGoal {
  const now = new Date().toISOString();
  const goal: SavingsGoal = {
    goalId: generateId("goal"),
    workspaceId,
    name,
    targetAmount,
    currentAmount: 0,
    targetDate,
    monthlyContribution,
    priority,
    status: "active",
    goalType: options?.goalType,
    questionnaireResponses: options?.questionnaireResponses,
    aiPlan: options?.aiPlan,
    createdAt: now,
    updatedAt: now,
  };
  goalsStore.push(goal);
  return { ...goal };
}

export function updateGoal(
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
): SavingsGoal {
  const idx = goalsStore.findIndex((goal) => goal.goalId === goalId);
  if (idx < 0) throw new Error("Goal not found");

  goalsStore[idx] = {
    ...goalsStore[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return { ...goalsStore[idx] };
}

export function deleteGoal(goalId: string): void {
  goalsStore = goalsStore.filter((goal) => goal.goalId !== goalId);
}

export function seedGoals(goals: SavingsGoal[]): void {
  goalsStore = goals.map((goal) => ({ ...goal }));
}
