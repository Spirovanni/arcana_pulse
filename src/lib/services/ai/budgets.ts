import { completeForFeature } from "@/lib/ai-router";
import * as DbTx from "@/lib/services/db/transactions";
import * as DbFc from "@/lib/services/db/forecasting";
import * as MockTx from "@/lib/services/transactions";
import { CATEGORY_LABELS } from "@/lib/constants";
import type {
  BudgetRecommendation,
  Category,
  CategoryBreakdown,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Types (internal)
// ---------------------------------------------------------------------------

interface BudgetContext {
  categoryBreakdown: { category: string; label: string; amount: number; percentage: number }[];
  monthlyFlow: { month: string; income: number; expense: number }[];
  totalMonthlyIncome: number;
  totalMonthlyExpense: number;
  recurringExpenses: { title: string; category: string; amount: number; frequency: string }[];
}

// ---------------------------------------------------------------------------
// Category classification (50/30/20 rule)
// ---------------------------------------------------------------------------

const NEEDS: Set<string> = new Set([
  "housing",
  "utilities",
  "healthcare",
  "transportation",
  "food",
]);

const VALID_EXPENSE_CATEGORIES: Set<string> = new Set([
  "housing",
  "transportation",
  "food",
  "utilities",
  "healthcare",
  "entertainment",
  "shopping",
  "education",
  "subscriptions",
  "travel",
  "other",
]);

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a personal finance budget advisor for a banking app. Given a user's spending history, generate monthly budget recommendations per expense category.

APPROACH:
- Base recommendations on the 50/30/20 rule: 50% needs, 30% wants, 20% savings
- Adjust based on actual spending patterns — don't recommend drastic cuts
- If a category is already well-managed, recommend near current spending
- If over-spending in discretionary categories, recommend moderate reductions

CATEGORIES (expense only):
housing, transportation, food, utilities, healthcare, entertainment, shopping, education, subscriptions, travel, other

NEEDS (50%): housing, utilities, healthcare, transportation, food
WANTS (30%): entertainment, shopping, education, subscriptions, travel, other

RULES:
1. Generate one recommendation per expense category that has spending data
2. Each recommendation: category (exact enum), recommendedAmount (number), rationale (1 sentence), percentOfIncome (number, 0-100)
3. Total recommended budget should not exceed 80% of monthly income (leaving 20% for savings)
4. Be realistic — don't recommend zero for any active category
5. Output ONLY a JSON array, no markdown fences, no explanation
6. Each object: { "category": string, "recommendedAmount": number, "rationale": string, "percentOfIncome": number }`;

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

async function gatherBudgetContext(
  workspaceId: string
): Promise<BudgetContext> {
  let categoryBreakdown: Awaited<ReturnType<typeof DbTx.getCategoryBreakdown>>;
  let monthlyFlow: Awaited<ReturnType<typeof DbTx.getMonthlyFlow>>;
  let totalIncome: number;
  let totalExpense: number;
  let recurringPatterns: Awaited<ReturnType<typeof DbFc.detectRecurringPatterns>>;

  try {
    [categoryBreakdown, monthlyFlow, totalIncome, totalExpense, recurringPatterns] =
      await Promise.all([
        DbTx.getCategoryBreakdown(workspaceId, "expense"),
        DbTx.getMonthlyFlow(workspaceId),
        DbTx.sumByType(workspaceId, "income"),
        DbTx.sumByType(workspaceId, "expense"),
        DbFc.detectRecurringPatterns(workspaceId),
      ]);
  } catch {
    categoryBreakdown = MockTx.getCategoryBreakdown(workspaceId, "expense");
    monthlyFlow = MockTx.getMonthlyFlow(workspaceId);
    totalIncome = MockTx.sumByType(workspaceId, "income");
    totalExpense = MockTx.sumByType(workspaceId, "expense");
    recurringPatterns = [];
  }

  const monthCount = Math.max(monthlyFlow.length, 1);
  const totalMonthlyIncome = totalIncome / monthCount;
  const totalMonthlyExpense = totalExpense / monthCount;

  const recurringExpenses = recurringPatterns
    .filter((p) => p.transactionType === "expense")
    .map((p) => ({
      title: p.title,
      category: CATEGORY_LABELS[p.category as Category] || p.category,
      amount: p.averageAmount,
      frequency: p.frequency,
    }));

  return {
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      label: c.label,
      amount: c.amount,
      percentage: c.percentage,
    })),
    monthlyFlow: monthlyFlow.slice(-6),
    totalMonthlyIncome,
    totalMonthlyExpense,
    recurringExpenses,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateRecommendations(raw: string): BudgetRecommendation[] | null {
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

  const results: BudgetRecommendation[] = [];

  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.category !== "string" ||
      typeof item.recommendedAmount !== "number" ||
      typeof item.rationale !== "string" ||
      typeof item.percentOfIncome !== "number" ||
      !VALID_EXPENSE_CATEGORIES.has(item.category) ||
      item.recommendedAmount < 0
    ) {
      continue;
    }

    results.push({
      category: item.category as Category,
      recommendedAmount: Math.round(item.recommendedAmount * 100) / 100,
      rationale: item.rationale,
      percentOfIncome: Math.round(item.percentOfIncome * 10) / 10,
    });
  }

  return results.length > 0 ? results : null;
}

// ---------------------------------------------------------------------------
// Rule-based fallback (50/30/20)
// ---------------------------------------------------------------------------

function generateFallbackRecommendations(
  context: BudgetContext
): BudgetRecommendation[] {
  const { categoryBreakdown, totalMonthlyIncome } = context;

  if (totalMonthlyIncome <= 0 || categoryBreakdown.length === 0) {
    return [];
  }

  const needsBudget = totalMonthlyIncome * 0.5;
  const wantsBudget = totalMonthlyIncome * 0.3;

  // Split categories into needs and wants
  const needsCategories = categoryBreakdown.filter((c) =>
    NEEDS.has(c.category)
  );
  const wantsCategories = categoryBreakdown.filter(
    (c) => !NEEDS.has(c.category)
  );

  // Total actual spending in each group
  const needsTotal = needsCategories.reduce((s, c) => s + c.amount, 0);
  const wantsTotal = wantsCategories.reduce((s, c) => s + c.amount, 0);

  const recommendations: BudgetRecommendation[] = [];

  // Allocate needs budget proportionally
  for (const cat of needsCategories) {
    const proportion = needsTotal > 0 ? cat.amount / needsTotal : 1 / needsCategories.length;
    const recommended = Math.round(needsBudget * proportion * 100) / 100;
    const pct = Math.round((recommended / totalMonthlyIncome) * 100 * 10) / 10;

    recommendations.push({
      category: cat.category as Category,
      recommendedAmount: recommended,
      rationale: `Based on the 50/30/20 rule, allocating ${pct}% of income for ${cat.label}.`,
      percentOfIncome: pct,
    });
  }

  // Allocate wants budget proportionally
  for (const cat of wantsCategories) {
    const proportion = wantsTotal > 0 ? cat.amount / wantsTotal : 1 / wantsCategories.length;
    const recommended = Math.round(wantsBudget * proportion * 100) / 100;
    const pct = Math.round((recommended / totalMonthlyIncome) * 100 * 10) / 10;

    recommendations.push({
      category: cat.category as Category,
      recommendedAmount: recommended,
      rationale: `Based on the 50/30/20 rule, allocating ${pct}% of income for ${cat.label}.`,
      percentOfIncome: pct,
    });
  }

  return recommendations.sort((a, b) => b.recommendedAmount - a.recommendedAmount);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateBudgetRecommendations(
  workspaceId: string
): Promise<BudgetRecommendation[]> {
  const context = await gatherBudgetContext(workspaceId);

  // If no spending data, return empty
  if (context.categoryBreakdown.length === 0) {
    return [];
  }

  try {
    const text = await completeForFeature(
      "budgets",
      SYSTEM_PROMPT,
      `Generate budget recommendations based on this financial data:\n${JSON.stringify(context, null, 2)}`,
      1024
    );

    const validated = validateRecommendations(text);
    if (validated) return validated;

    return generateFallbackRecommendations(context);
  } catch {
    return generateFallbackRecommendations(context);
  }
}
