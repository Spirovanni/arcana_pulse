import { listTransactions, getMonthlyFlow } from "@/lib/services/db/transactions";
import { generateId } from "@/lib/utils";
import type {
  RecurringPattern,
  RecurrenceFrequency,
  ForecastBucket,
  FlaggedExpense,
  CashFlowForecast,
  Transaction,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Title normalization
// ---------------------------------------------------------------------------

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, "") // dates
    .replace(/#\d+/g, "") // order numbers
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Interval detection
// ---------------------------------------------------------------------------

interface IntervalMatch {
  frequency: RecurrenceFrequency;
  confidence: number;
}

function detectFrequency(dates: string[]): IntervalMatch | null {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort();
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
      (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }

  const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const stddev = Math.sqrt(
    intervals.reduce((s, v) => s + (v - avg) ** 2, 0) / intervals.length
  );
  const cv = avg > 0 ? stddev / avg : Infinity;

  if (avg >= 28 && avg <= 32 && cv < 0.3) {
    return { frequency: "monthly", confidence: Math.max(0.5, 1 - cv) };
  }
  if (avg >= 13 && avg <= 15 && cv < 0.3) {
    return { frequency: "bi-weekly", confidence: Math.max(0.5, 1 - cv) };
  }
  if (avg >= 6 && avg <= 8 && cv < 0.3) {
    return { frequency: "weekly", confidence: Math.max(0.5, 1 - cv) };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Next expected date
// ---------------------------------------------------------------------------

function computeNextDate(
  lastDate: string,
  frequency: RecurrenceFrequency
): string {
  const d = new Date(lastDate);
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "bi-weekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Detect recurring patterns
// ---------------------------------------------------------------------------

export async function detectRecurringPatterns(
  workspaceId: string
): Promise<RecurringPattern[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await listTransactions(
    { workspaceId, dateFrom: sixMonthsAgo.toISOString() },
    { page: 1, pageSize: 5000 }
  );

  const txns = result.items.filter(
    (t) => t.transactionType !== "transfer" && t.status === "posted"
  );

  // Group by normalized title + category + transactionType
  const groups = new Map<string, Transaction[]>();
  for (const txn of txns) {
    const key = `${normalizeTitle(txn.title)}|${txn.category}|${txn.transactionType}`;
    const group = groups.get(key) || [];
    group.push(txn);
    groups.set(key, group);
  }

  const patterns: RecurringPattern[] = [];

  for (const [, group] of Array.from(groups)) {
    if (group.length < 2) continue;

    const dates = group.map((t) => t.date);
    const match = detectFrequency(dates);
    if (!match) continue;

    const amounts = group.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const sortedDates = [...dates].sort();
    const lastDate = sortedDates[sortedDates.length - 1];

    patterns.push({
      id: generateId("rp"),
      title: group[0].title,
      category: group[0].category,
      transactionType: group[0].transactionType as "income" | "expense",
      frequency: match.frequency,
      averageAmount: Math.round(avgAmount * 100) / 100,
      lastOccurrence: lastDate,
      nextExpected: computeNextDate(lastDate, match.frequency),
      occurrenceCount: group.length,
      confidence: match.confidence,
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Build forecast
// ---------------------------------------------------------------------------

export function buildForecast(
  patterns: RecurringPattern[],
  days: 30 | 60 | 90 = 90
): ForecastBucket[] {
  const now = new Date();
  const buckets: Record<string, { income: number; expense: number }> = {};

  for (let m = 0; m < Math.ceil(days / 30); m++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + m + 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = { income: 0, expense: 0 };
  }

  for (const pattern of patterns) {
    let nextDate = new Date(pattern.nextExpected);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    while (nextDate <= endDate) {
      const monthKey = `${nextDate.getFullYear()}-${String(
        nextDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (buckets[monthKey]) {
        if (pattern.transactionType === "income") {
          buckets[monthKey].income += pattern.averageAmount;
        } else {
          buckets[monthKey].expense += pattern.averageAmount;
        }
      }

      nextDate = new Date(
        computeNextDate(nextDate.toISOString(), pattern.frequency)
      );
    }
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      projectedIncome: Math.round(data.income * 100) / 100,
      projectedExpense: Math.round(data.expense * 100) / 100,
      netCashFlow: Math.round((data.income - data.expense) * 100) / 100,
    }));
}

// ---------------------------------------------------------------------------
// Flag large upcoming expenses
// ---------------------------------------------------------------------------

export function flagUpcomingExpenses(
  patterns: RecurringPattern[],
  avgMonthlyIncome: number,
  thresholdPct: number = 20
): FlaggedExpense[] {
  if (avgMonthlyIncome <= 0) return [];

  const now = new Date();
  const thirtyDaysOut = new Date(now);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  return patterns
    .filter((p) => {
      if (p.transactionType !== "expense") return false;
      const pctOfIncome = (p.averageAmount / avgMonthlyIncome) * 100;
      if (pctOfIncome < thresholdPct) return false;
      const next = new Date(p.nextExpected);
      return next >= now && next <= thirtyDaysOut;
    })
    .map((p) => ({
      title: p.title,
      category: p.category,
      expectedAmount: p.averageAmount,
      expectedDate: p.nextExpected,
      percentOfAvgIncome:
        Math.round((p.averageAmount / avgMonthlyIncome) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.percentOfAvgIncome - a.percentOfAvgIncome);
}

// ---------------------------------------------------------------------------
// Generate full forecast (without AI summary)
// ---------------------------------------------------------------------------

export async function generateCashFlowForecast(
  workspaceId: string
): Promise<Omit<CashFlowForecast, "aiSummary">> {
  const [patterns, monthlyFlow] = await Promise.all([
    detectRecurringPatterns(workspaceId),
    getMonthlyFlow(workspaceId),
  ]);

  const forecast = buildForecast(patterns, 90);

  const avgMonthlyIncome =
    monthlyFlow.length > 0
      ? monthlyFlow.reduce((s, m) => s + m.income, 0) / monthlyFlow.length
      : 0;

  const flaggedExpenses = flagUpcomingExpenses(patterns, avgMonthlyIncome);

  return {
    recurringPatterns: patterns,
    forecast,
    flaggedExpenses,
    generatedAt: new Date().toISOString(),
  };
}
