import { completeForFeature } from "@/lib/ai-router";
import * as DbTx from "@/lib/services/db/transactions";
import * as MockTx from "@/lib/services/transactions";
import { CATEGORY_LABELS } from "@/lib/constants";
import { generateId } from "@/lib/utils";
import type {
  SpendingInsight,
  InsightType,
  InsightSeverity,
  Category,
  CategoryBreakdown,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Types (internal)
// ---------------------------------------------------------------------------

interface FinancialContext {
  categoryBreakdown: { category: Category; label: string; amount: number; percentage: number }[];
  monthlyFlow: { month: string; income: number; expense: number }[];
  recentTransactions: { title: string; category: string; amount: number; date: string; type: string }[];
  totalIncome: number;
  totalExpense: number;
  currentMonth: string;
}

// ---------------------------------------------------------------------------
// Valid enums (for validation)
// ---------------------------------------------------------------------------

const VALID_TYPES = new Set<string>([
  "spending_spike",
  "savings_trend",
  "recurring_charge",
  "anomaly",
  "tip",
]);

const VALID_SEVERITIES = new Set<string>(["info", "warning", "success"]);

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a financial insights analyst for a personal banking app. Given a user's financial data, generate 3-5 actionable spending insights.

INSIGHT TYPES:
- spending_spike: A category where spending is notably higher than average
- savings_trend: Positive or negative savings trend over time
- recurring_charge: Detection of recurring subscriptions or charges
- anomaly: Unusual transaction or pattern
- tip: Actionable financial advice based on the data

SEVERITY:
- success: Positive trends (savings improving, spending down)
- warning: Concerning patterns (spending spikes, declining savings)
- info: Neutral observations or tips

RULES:
1. Generate 3-5 insights, ordered by importance (most actionable first)
2. Each insight: type, severity, title (under 60 chars), description (1-2 natural sentences)
3. Include category, amount, and percentageChange where relevant
4. Use conversational, helpful tone ("You spent 40% more on dining this month...")
5. Reference specific numbers from the data
6. Output ONLY a JSON array, no markdown fences, no explanation
7. Each object: { "type": string, "severity": string, "title": string, "description": string, "category"?: string, "amount"?: number, "percentageChange"?: number }`;

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

async function gatherFinancialContext(
  workspaceId: string
): Promise<FinancialContext> {
  let categoryBreakdown: Awaited<ReturnType<typeof DbTx.getCategoryBreakdown>>;
  let monthlyFlow: Awaited<ReturnType<typeof DbTx.getMonthlyFlow>>;
  let recentTxns: Awaited<ReturnType<typeof DbTx.getRecentTransactions>>;
  let totalIncome: number;
  let totalExpense: number;

  try {
    [categoryBreakdown, monthlyFlow, recentTxns, totalIncome, totalExpense] =
      await Promise.all([
        DbTx.getCategoryBreakdown(workspaceId, "expense"),
        DbTx.getMonthlyFlow(workspaceId),
        DbTx.getRecentTransactions(workspaceId, 50),
        DbTx.sumByType(workspaceId, "income"),
        DbTx.sumByType(workspaceId, "expense"),
      ]);
  } catch {
    categoryBreakdown = MockTx.getCategoryBreakdown(workspaceId, "expense");
    monthlyFlow = MockTx.getMonthlyFlow(workspaceId);
    recentTxns = MockTx.getRecentTransactions(workspaceId, 50);
    totalIncome = MockTx.sumByType(workspaceId, "income");
    totalExpense = MockTx.sumByType(workspaceId, "expense");
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return {
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      label: c.label,
      amount: c.amount,
      percentage: c.percentage,
    })),
    monthlyFlow: monthlyFlow.slice(-6),
    recentTransactions: recentTxns.map((t) => ({
      title: t.title,
      category: CATEGORY_LABELS[t.category] || t.category,
      amount: t.amount,
      date: t.date,
      type: t.transactionType,
    })),
    totalIncome,
    totalExpense,
    currentMonth,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInsights(raw: string): SpendingInsight[] | null {
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

  const results: SpendingInsight[] = [];

  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.type !== "string" ||
      typeof item.severity !== "string" ||
      typeof item.title !== "string" ||
      typeof item.description !== "string" ||
      !VALID_TYPES.has(item.type) ||
      !VALID_SEVERITIES.has(item.severity)
    ) {
      continue;
    }

    results.push({
      id: generateId("ins"),
      type: item.type as InsightType,
      severity: item.severity as InsightSeverity,
      title: item.title,
      description: item.description,
      category: typeof item.category === "string" ? item.category : undefined,
      amount: typeof item.amount === "number" ? item.amount : undefined,
      percentageChange:
        typeof item.percentageChange === "number"
          ? item.percentageChange
          : undefined,
    });
  }

  return results.length > 0 ? results.slice(0, 5) : null;
}

// ---------------------------------------------------------------------------
// Rule-based fallback
// ---------------------------------------------------------------------------

function generateFallbackInsights(
  context: FinancialContext
): SpendingInsight[] {
  const insights: SpendingInsight[] = [];

  const { monthlyFlow, categoryBreakdown, totalIncome, totalExpense } = context;

  // 1. Spending spike: compare current month to prior average
  if (monthlyFlow.length >= 2) {
    const current = monthlyFlow[monthlyFlow.length - 1];
    const prior = monthlyFlow.slice(0, -1);
    const avgExpense =
      prior.reduce((s, m) => s + m.expense, 0) / prior.length;

    if (avgExpense > 0 && current.expense > avgExpense * 1.25) {
      const pctChange = Math.round(
        ((current.expense - avgExpense) / avgExpense) * 100
      );
      insights.push({
        id: generateId("ins"),
        type: "spending_spike",
        severity: "warning",
        title: "Spending is up this month",
        description: `Your expenses this month are ${pctChange}% higher than your ${prior.length}-month average. Consider reviewing recent purchases.`,
        percentageChange: pctChange,
      });
    }
  }

  // 2. Savings trend
  if (totalIncome > 0) {
    const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
    if (savingsRate >= 20) {
      insights.push({
        id: generateId("ins"),
        type: "savings_trend",
        severity: "success",
        title: "Great savings rate",
        description: `You're saving ${Math.round(savingsRate)}% of your income. Keep it up!`,
        percentageChange: Math.round(savingsRate),
      });
    } else if (savingsRate < 10) {
      insights.push({
        id: generateId("ins"),
        type: "savings_trend",
        severity: "warning",
        title: "Low savings rate",
        description: `You're only saving ${Math.round(Math.max(0, savingsRate))}% of your income. Try to identify areas where you can cut back.`,
        percentageChange: Math.round(savingsRate),
      });
    }
  }

  // 3. Top category concentration
  if (categoryBreakdown.length > 0) {
    const top = categoryBreakdown[0];
    if (top.percentage > 40) {
      insights.push({
        id: generateId("ins"),
        type: "tip",
        severity: "info",
        title: `${top.label} dominates spending`,
        description: `${top.label} accounts for ${Math.round(top.percentage)}% of your expenses. Diversifying spending can help with budgeting.`,
        category: top.category,
        amount: top.amount,
        percentageChange: Math.round(top.percentage),
      });
    }
  }

  // 4. Subscription awareness
  const subCategory = categoryBreakdown.find(
    (c: CategoryBreakdown) => c.category === "subscriptions"
  );
  if (subCategory && subCategory.amount > 0) {
    insights.push({
      id: generateId("ins"),
      type: "recurring_charge",
      severity: "info",
      title: "Review your subscriptions",
      description: `You're spending $${subCategory.amount.toFixed(2)} on subscriptions. Review them periodically to cancel unused services.`,
      category: "subscriptions",
      amount: subCategory.amount,
    });
  }

  // 5. Default tip if we have few insights
  if (insights.length < 2) {
    insights.push({
      id: generateId("ins"),
      type: "tip",
      severity: "info",
      title: "Track your spending regularly",
      description:
        "Checking your finances weekly helps you stay on top of unexpected charges and maintain healthy spending habits.",
    });
  }

  return insights.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateInsights(
  workspaceId: string
): Promise<SpendingInsight[]> {
  const context = await gatherFinancialContext(workspaceId);

  // If there's very little data, skip AI and use fallback
  if (
    context.recentTransactions.length === 0 &&
    context.monthlyFlow.length === 0
  ) {
    return [
      {
        id: generateId("ins"),
        type: "tip",
        severity: "info",
        title: "Start adding transactions",
        description:
          "Add transactions or link a bank account to get personalized spending insights.",
      },
    ];
  }

  try {
    const text = await completeForFeature(
      "insights",
      SYSTEM_PROMPT,
      `Analyze this financial data and generate spending insights:\n${JSON.stringify(context, null, 2)}`,
      1024,
      { workspaceId }
    );

    const validated = validateInsights(text);
    if (validated) return validated;

    return generateFallbackInsights(context);
  } catch {
    return generateFallbackInsights(context);
  }
}
