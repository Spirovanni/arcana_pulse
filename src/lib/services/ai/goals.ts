import { getAnthropicClient } from "@/lib/anthropic";
import { getMonthlyFlow, sumByType } from "@/lib/services/db/transactions";
import { detectRecurringPatterns } from "@/lib/services/db/forecasting";
import { getGoalsByWorkspace } from "@/lib/services/db/goals";
import { formatCurrency } from "@/lib/utils";
import type { GoalProjection, SavingsGoal } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types (internal)
// ---------------------------------------------------------------------------

interface GoalContext {
  goals: SavingsGoal[];
  avgMonthlySavings: number;
  totalMonthlyIncome: number;
  totalMonthlyExpense: number;
  recurringIncomeSources: { title: string; amount: number; frequency: string }[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a financial planning advisor for a banking app. Given a user's savings goals and their financial context (monthly income, expenses, savings rate), generate projections for each goal.

For each goal, provide:
1. projectedCompletionDate — ISO date string of estimated completion
2. suggestedMonthlyContribution — recommended monthly amount to stay on track
3. onTrack — boolean, whether current savings rate meets the goal deadline
4. narrative — 1 sentence explaining the projection

RULES:
1. Base projections on the user's average monthly savings (income - expenses)
2. If a goal has a monthlyContribution set, factor that into the projection
3. Be realistic — if a goal is unreachable, say so in the narrative
4. Output ONLY a JSON array, no markdown fences, no explanation
5. Each object: { "goalId": string, "projectedCompletionDate": string, "suggestedMonthlyContribution": number, "onTrack": boolean, "narrative": string }`;

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

async function gatherGoalContext(workspaceId: string): Promise<GoalContext> {
  const [goals, monthlyFlow, totalIncome, totalExpense, recurringPatterns] =
    await Promise.all([
      getGoalsByWorkspace(workspaceId),
      getMonthlyFlow(workspaceId),
      sumByType(workspaceId, "income"),
      sumByType(workspaceId, "expense"),
      detectRecurringPatterns(workspaceId),
    ]);

  const monthCount = Math.max(monthlyFlow.length, 1);
  const totalMonthlyIncome = totalIncome / monthCount;
  const totalMonthlyExpense = totalExpense / monthCount;
  const avgMonthlySavings = Math.max(totalMonthlyIncome - totalMonthlyExpense, 0);

  const recurringIncomeSources = recurringPatterns
    .filter((p) => p.transactionType === "income")
    .map((p) => ({
      title: p.title,
      amount: p.averageAmount,
      frequency: p.frequency,
    }));

  return {
    goals: goals.filter((g) => g.status === "active"),
    avgMonthlySavings,
    totalMonthlyIncome,
    totalMonthlyExpense,
    recurringIncomeSources,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateProjections(
  raw: string,
  goalIds: Set<string>
): GoalProjection[] | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const results: GoalProjection[] = [];

  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.goalId !== "string" ||
      typeof item.projectedCompletionDate !== "string" ||
      typeof item.suggestedMonthlyContribution !== "number" ||
      typeof item.onTrack !== "boolean" ||
      typeof item.narrative !== "string" ||
      !goalIds.has(item.goalId) ||
      item.suggestedMonthlyContribution < 0
    ) {
      continue;
    }

    results.push({
      goalId: item.goalId,
      projectedCompletionDate: item.projectedCompletionDate,
      suggestedMonthlyContribution:
        Math.round(item.suggestedMonthlyContribution * 100) / 100,
      onTrack: item.onTrack,
      narrative: item.narrative,
    });
  }

  return results.length > 0 ? results : null;
}

// ---------------------------------------------------------------------------
// Rule-based fallback
// ---------------------------------------------------------------------------

function generateFallbackProjections(
  goals: SavingsGoal[],
  avgMonthlySavings: number
): GoalProjection[] {
  const now = new Date();

  return goals.map((goal) => {
    const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
    const targetDate = new Date(goal.targetDate);
    const monthsRemaining = Math.max(
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
        (targetDate.getMonth() - now.getMonth()),
      1
    );

    // Required monthly contribution to meet target date
    const requiredMonthly = remaining / monthsRemaining;

    // How long at current savings rate
    const effectiveMonthlySavings = Math.max(
      goal.monthlyContribution > 0 ? goal.monthlyContribution : avgMonthlySavings * 0.5,
      1
    );
    const monthsToComplete = Math.ceil(remaining / effectiveMonthlySavings);
    const projectedDate = new Date(now);
    projectedDate.setMonth(projectedDate.getMonth() + monthsToComplete);

    const onTrack = projectedDate <= targetDate;

    let narrative: string;
    if (remaining <= 0) {
      narrative = `You've reached your ${goal.name} goal!`;
    } else if (onTrack) {
      narrative = `At your current rate of ${formatCurrency(effectiveMonthlySavings)}/month, you're on track to reach ${goal.name} by ${projectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}.`;
    } else {
      narrative = `To reach ${goal.name} by ${targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}, you'd need to save ${formatCurrency(requiredMonthly)}/month — consider increasing your contribution.`;
    }

    return {
      goalId: goal.goalId,
      projectedCompletionDate: projectedDate.toISOString().split("T")[0],
      suggestedMonthlyContribution: Math.round(requiredMonthly * 100) / 100,
      onTrack,
      narrative,
    };
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateGoalProjections(
  workspaceId: string
): Promise<GoalProjection[]> {
  const context = await gatherGoalContext(workspaceId);

  if (context.goals.length === 0) {
    return [];
  }

  const goalIds = new Set(context.goals.map((g) => g.goalId));

  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate savings goal projections based on this financial data:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const validated = validateProjections(text, goalIds);
    if (validated) return validated;

    return generateFallbackProjections(context.goals, context.avgMonthlySavings);
  } catch {
    return generateFallbackProjections(context.goals, context.avgMonthlySavings);
  }
}
