import { getAnthropicClient } from "@/lib/anthropic";
import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { Category } from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CategorizationInput {
  title: string;
  amount: number;
  transactionType: "income" | "expense";
}

export interface CategorizationResult {
  category: Category;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Valid categories (for validation)
// ---------------------------------------------------------------------------

const INCOME_CATEGORIES: Category[] = [
  "salary",
  "freelance",
  "investment",
  "refund",
  "other_income",
];

const EXPENSE_CATEGORIES: Category[] = [
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
];

const ALL_CATEGORIES = new Set<string>([
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
  "transfer",
]);

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a financial transaction categorizer. Given a list of transactions (title, amount, type), classify each into exactly one category.

INCOME categories (only for income transactions):
- salary: Regular employment wages, payroll deposits
- freelance: Contract work, gig income, side hustle payments
- investment: Dividends, interest, capital gains, stock sales
- refund: Returns, reimbursements, cashback rewards
- other_income: Any income not fitting above categories

EXPENSE categories (only for expense transactions):
- housing: Rent, mortgage, property tax, home repairs, HOA
- transportation: Gas, car payment, insurance, parking, rideshare, public transit
- food: Groceries, restaurants, coffee shops, food delivery
- utilities: Electric, water, gas, internet, phone bill
- healthcare: Doctor, pharmacy, insurance premiums, dental, vision
- entertainment: Movies, concerts, games, streaming, sports
- shopping: Clothing, electronics, Amazon, general retail
- education: Tuition, books, courses, student loans
- subscriptions: Monthly/annual recurring services (SaaS, memberships)
- travel: Flights, hotels, vacation expenses
- other: Anything that doesn't fit above categories

RULES:
1. Income transactions MUST use income categories. Expense transactions MUST use expense categories.
2. Return a JSON array with one object per transaction: { "category": string, "confidence": number }
3. Confidence is 0.0-1.0 where 1.0 = very confident.
4. Output ONLY the JSON array, no markdown fences, no explanation.`;

// ---------------------------------------------------------------------------
// Few-shot examples from user overrides
// ---------------------------------------------------------------------------

async function fetchFewShotExamples(
  workspaceId?: string
): Promise<string | null> {
  if (!workspaceId) return null;

  try {
    const db = getDatabase();
    // Find transactions where user overrode the AI category
    const result = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.transactions,
      [
        Query.equal("workspaceId", workspaceId),
        Query.isNotNull("aiCategory"),
        Query.limit(100),
      ]
    );

    // Filter to overrides: where category !== aiCategory
    const overrides = result.documents.filter(
      (doc: Models.Document & Record<string, any>) =>
        doc.aiCategory && doc.category !== doc.aiCategory
    );

    if (overrides.length === 0) return null;

    // Take up to 20 most recent overrides as examples
    const examples = overrides.slice(0, 20).map(
      (doc: Models.Document & Record<string, any>) => ({
        title: doc.title,
        amount: doc.amount,
        type: doc.transactionType,
        ai_suggested: doc.aiCategory,
        correct: doc.category,
      })
    );

    return `\nHere are examples of past corrections by the user. Learn from these:\n${JSON.stringify(examples, null, 2)}\n`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateAndMapResults(
  raw: string,
  inputs: CategorizationInput[]
): CategorizationResult[] {
  // Strip markdown fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // If JSON parse fails, fall back for all
    return inputs.map((input) => fallbackCategorize(input));
  }

  if (!Array.isArray(parsed) || parsed.length !== inputs.length) {
    return inputs.map((input) => fallbackCategorize(input));
  }

  return parsed.map((item: { category?: string; confidence?: number }, i) => {
    const cat = item?.category;
    const conf = item?.confidence;

    if (typeof cat !== "string" || !ALL_CATEGORIES.has(cat)) {
      return fallbackCategorize(inputs[i]);
    }

    // Enforce income/expense category alignment
    const input = inputs[i];
    if (input.transactionType === "income" && !INCOME_CATEGORIES.includes(cat as Category)) {
      return fallbackCategorize(input);
    }
    if (input.transactionType === "expense" && !EXPENSE_CATEGORIES.includes(cat as Category)) {
      return fallbackCategorize(input);
    }

    return {
      category: cat as Category,
      confidence: typeof conf === "number" ? Math.min(1, Math.max(0, conf)) : 0.5,
    };
  });
}

// ---------------------------------------------------------------------------
// Fallback (keyword-based)
// ---------------------------------------------------------------------------

const KEYWORD_MAP: [RegExp, Category][] = [
  // Income
  [/payroll|salary|wages|direct.?dep/i, "salary"],
  [/freelance|contract|upwork|fiverr/i, "freelance"],
  [/dividend|interest|capital.?gain|vanguard|fidelity/i, "investment"],
  [/refund|return|cashback|reimburse/i, "refund"],
  // Expense
  [/rent|mortgage|hoa|property/i, "housing"],
  [/uber|lyft|gas|fuel|parking|transit|metro/i, "transportation"],
  [/grocery|restaurant|starbucks|doordash|grubhub|mcdonald|chipotle|whole.?foods/i, "food"],
  [/electric|water|gas.?bill|internet|comcast|verizon|att|t-mobile/i, "utilities"],
  [/pharmacy|doctor|hospital|dental|health|cvs|walgreen/i, "healthcare"],
  [/netflix|spotify|hulu|disney|movie|concert|game/i, "entertainment"],
  [/amazon|target|walmart|costco|clothing|nike|apple.?store/i, "shopping"],
  [/tuition|university|course|udemy|student.?loan/i, "education"],
  [/subscription|membership|patreon|substack/i, "subscriptions"],
  [/airline|flight|hotel|airbnb|booking|expedia/i, "travel"],
];

export function fallbackCategorize(
  input: CategorizationInput
): CategorizationResult {
  for (const [regex, category] of KEYWORD_MAP) {
    if (regex.test(input.title)) {
      // Ensure category aligns with transaction type
      if (input.transactionType === "income" && INCOME_CATEGORIES.includes(category)) {
        return { category, confidence: 0.4 };
      }
      if (input.transactionType === "expense" && EXPENSE_CATEGORIES.includes(category)) {
        return { category, confidence: 0.4 };
      }
    }
  }

  // Default fallback
  return {
    category: input.transactionType === "income" ? "other_income" : "other",
    confidence: 0.1,
  };
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

export async function categorizeBatch(
  inputs: CategorizationInput[],
  workspaceId?: string
): Promise<CategorizationResult[]> {
  if (inputs.length === 0) return [];

  try {
    const client = getAnthropicClient();

    const fewShot = await fetchFewShotExamples(workspaceId);

    const userContent = inputs.map((t, i) => ({
      index: i,
      title: t.title,
      amount: t.amount,
      type: t.transactionType,
    }));

    const messages: { role: "user"; content: string }[] = [];

    if (fewShot) {
      messages.push({ role: "user", content: fewShot });
    }

    messages.push({
      role: "user",
      content: `Categorize these transactions:\n${JSON.stringify(userContent, null, 2)}`,
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return validateAndMapResults(text, inputs);
  } catch {
    // Graceful degradation: use keyword fallback
    return inputs.map((input) => fallbackCategorize(input));
  }
}

export async function categorizeTransaction(
  input: CategorizationInput,
  workspaceId?: string
): Promise<CategorizationResult> {
  const results = await categorizeBatch([input], workspaceId);
  return results[0];
}
