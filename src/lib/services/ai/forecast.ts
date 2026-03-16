import { getAnthropicClient } from "@/lib/anthropic";
import { generateCashFlowForecast } from "@/lib/services/db/forecasting";
import { getMonthlyFlow } from "@/lib/services/db/transactions";
import { CATEGORY_LABELS } from "@/lib/constants";
import type {
  CashFlowForecast,
  ForecastBucket,
  Category,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Context type (internal)
// ---------------------------------------------------------------------------

interface ForecastContext {
  recurringPatterns: {
    title: string;
    category: string;
    type: string;
    frequency: string;
    avgAmount: number;
    nextExpected: string;
  }[];
  projectedMonths: ForecastBucket[];
  historicalFlow: { month: string; income: number; expense: number }[];
  flaggedExpenseCount: number;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a financial forecasting analyst for a personal banking app. Given detected recurring transactions and projected cash flow, generate a brief narrative summary.

RULES:
1. Write 2-4 sentences summarizing the cash flow outlook
2. Mention key recurring patterns (e.g., salary, rent)
3. Highlight any concerning trends (expenses exceeding income, large upcoming bills)
4. Use a helpful, conversational tone
5. Reference specific dollar amounts from the data
6. Output ONLY the narrative text, no JSON, no markdown`;

// ---------------------------------------------------------------------------
// Rule-based fallback summary
// ---------------------------------------------------------------------------

function generateFallbackSummary(
  forecastData: Omit<CashFlowForecast, "aiSummary">
): string {
  const { recurringPatterns, forecast, flaggedExpenses } = forecastData;

  const incomePatterns = recurringPatterns.filter(
    (p) => p.transactionType === "income"
  );

  const parts: string[] = [];

  if (incomePatterns.length > 0) {
    const totalMonthlyIncome = incomePatterns
      .filter((p) => p.frequency === "monthly")
      .reduce((s, p) => s + p.averageAmount, 0);
    if (totalMonthlyIncome > 0) {
      parts.push(
        `You have ${incomePatterns.length} recurring income source${incomePatterns.length > 1 ? "s" : ""} totaling approximately $${totalMonthlyIncome.toFixed(2)} per month.`
      );
    }
  }

  if (forecast.length > 0) {
    const nextMonth = forecast[0];
    if (nextMonth.netCashFlow >= 0) {
      parts.push(
        `Next month looks positive with projected net cash flow of $${nextMonth.netCashFlow.toFixed(2)}.`
      );
    } else {
      parts.push(
        `Next month projects a shortfall of $${Math.abs(nextMonth.netCashFlow).toFixed(2)} based on your recurring transactions.`
      );
    }
  }

  if (flaggedExpenses.length > 0) {
    const top = flaggedExpenses[0];
    parts.push(
      `Heads up: ${top.title} ($${top.expectedAmount.toFixed(2)}) is coming up and represents ${top.percentOfAvgIncome}% of your average monthly income.`
    );
  }

  if (parts.length === 0) {
    parts.push(
      "Not enough recurring transaction data yet to generate a detailed forecast. Keep tracking your transactions for better projections."
    );
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateForecastWithSummary(
  workspaceId: string
): Promise<CashFlowForecast> {
  const forecastData = await generateCashFlowForecast(workspaceId);

  // If minimal data, skip AI
  if (
    forecastData.recurringPatterns.length === 0 &&
    forecastData.forecast.length === 0
  ) {
    return {
      ...forecastData,
      aiSummary:
        "Add more transactions to enable cash flow forecasting. We need at least 2 months of history to detect recurring patterns.",
    };
  }

  const historicalFlow = await getMonthlyFlow(workspaceId);

  try {
    const client = getAnthropicClient();

    const context: ForecastContext = {
      recurringPatterns: forecastData.recurringPatterns.map((p) => ({
        title: p.title,
        category: CATEGORY_LABELS[p.category as Category] || p.category,
        type: p.transactionType,
        frequency: p.frequency,
        avgAmount: p.averageAmount,
        nextExpected: p.nextExpected,
      })),
      projectedMonths: forecastData.forecast,
      historicalFlow: historicalFlow.slice(-6),
      flaggedExpenseCount: forecastData.flaggedExpenses.length,
    };

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Summarize this cash flow forecast:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const trimmed = text.trim();
    if (
      trimmed.length > 10 &&
      trimmed.length < 2000 &&
      !trimmed.startsWith("[") &&
      !trimmed.startsWith("{")
    ) {
      return { ...forecastData, aiSummary: trimmed };
    }

    return { ...forecastData, aiSummary: generateFallbackSummary(forecastData) };
  } catch {
    return { ...forecastData, aiSummary: generateFallbackSummary(forecastData) };
  }
}
