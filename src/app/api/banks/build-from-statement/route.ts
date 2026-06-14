/**
 * POST /api/banks/build-from-statement
 *
 * Creates a bank account from a saved statement file in public/statements/{username}/.
 * Uses AI (Gemini Flash via the categorize feature) to classify every transaction
 * description, then imports all rows with accurate categories.
 *
 * Body: {
 *   username: string        — folder name under public/statements/
 *   filename: string        — e.g. Chase8016_Activity_20260614.CSV
 *   institutionName?: string — defaults to institution name parsed from filename
 *   accountMask?: string    — last 4 digits, parsed from filename if omitted
 *   workspaceId?: string    — defaults to session workspace
 * }
 *
 * Response:
 *   { bank, imported, duplicates, skipped, categories, statementPeriod }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { parseStatement } from "@/lib/services/statementParser";
import { insertSyncedTransaction } from "@/lib/services/transactions";
import { addBank } from "@/lib/services/banks";
import { completeForFeature } from "@/lib/ai-router";
import type { Category } from "@/lib/types";
import fs from "fs";
import path from "path";

const STATEMENTS_ROOT = path.join(process.cwd(), "public", "statements");

const VALID_CATEGORIES: Category[] = [
  "salary", "freelance", "investment", "refund", "other_income",
  "housing", "transportation", "food", "utilities", "healthcare",
  "entertainment", "shopping", "education", "subscriptions",
  "travel", "transfer", "other",
];

// ── Extract institution name + account mask from filename ───────────────────

function parseFilenameHints(filename: string): { institution: string; mask: string } {
  // e.g. Chase8016_Activity_20260614.CSV
  const base = path.basename(filename, path.extname(filename));
  const maskMatch = base.match(/(\d{4,6})/);
  const mask = maskMatch ? maskMatch[1].slice(-4) : "????";

  // Known institution prefixes
  const institutions: [RegExp, string][] = [
    [/^chase/i,       "Chase"],
    [/^bofa|^boa|^bank.?of.?america/i, "Bank of America"],
    [/^wells.?fargo|^wf/i, "Wells Fargo"],
    [/^citi/i,        "Citi"],
    [/^usaa/i,        "USAA"],
    [/^navy.?fed/i,   "Navy Federal"],
    [/^pnc/i,         "PNC Bank"],
    [/^us.?bank/i,    "U.S. Bank"],
    [/^cap.?one|^capital.?one/i, "Capital One"],
    [/^amex|^american.?express/i, "American Express"],
    [/^discover/i,    "Discover"],
  ];

  for (const [re, name] of institutions) {
    if (re.test(base)) return { institution: name, mask };
  }

  // Use the first non-numeric word segment as institution
  const word = base.split(/\d/)[0].replace(/_/g, " ").trim();
  return { institution: word || "Unknown Bank", mask };
}

// ── AI Batch categoriser ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial transaction categoriser. Given a JSON array of transaction descriptions, return ONLY a JSON array of category strings (same length, same order). Choose the most accurate category for each transaction from this list:

salary, freelance, investment, refund, other_income, housing, transportation, food, utilities, healthcare, entertainment, shopping, education, subscriptions, travel, transfer, other

Rules:
- Direct deposits / payroll → salary
- Gas stations, parking, Uber, Lyft, airlines → transportation
- Restaurants, cafes, fast food, grocery stores → food
- Netflix, Spotify, Hulu, Amazon Prime, Apple → subscriptions
- Rent, mortgage, HOA → housing
- Electric, water, internet, phone → utilities
- Doctors, dentists, gyms, pharmacies → healthcare
- Retail stores, Amazon, online shopping → shopping
- ATM, Zelle, Venmo, wire transfer → transfer
- Return the JSON array and NOTHING else.`;

async function aiCategorise(descriptions: string[]): Promise<Category[]> {
  if (descriptions.length === 0) return [];

  // Gemini Flash can handle 1500 descriptions in one shot — build the payload
  const prompt = JSON.stringify(descriptions);

  try {
    const raw = await completeForFeature("categorize", SYSTEM_PROMPT, prompt, 8192);
    // Extract JSON array from response (strip any surrounding text)
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array in AI response");
    const parsed: unknown[] = JSON.parse(match[0]);

    return parsed.map((c) => {
      const s = String(c).toLowerCase().replace(/[^a-z_]/g, "");
      return VALID_CATEGORIES.includes(s as Category) ? (s as Category) : "other";
    });
  } catch {
    // Fallback: return "other" for all
    return descriptions.map(() => "other");
  }
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as {
    // Mode A — inline CSV content sent directly from the browser (Vercel-safe)
    csvContent?: string;
    // Mode B — read from public/statements/{username}/{filename} (Saved Statements panel)
    username?: string;
    filename?: string;
    // Common
    institutionName?: string;
    accountMask?: string;
    workspaceId?: string;
  };

  const workspaceId = body.workspaceId ?? auth.workspaceId;
  let content: string;
  let filenameForHints: string;

  if (body.csvContent) {
    // ── Mode A: inline content ──────────────────────────────────────────
    content = body.csvContent;
    filenameForHints = body.filename ?? "statement.csv";
  } else {
    // ── Mode B: read from disk ──────────────────────────────────────────
    const username = (body.username ?? "").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 64);
    const filename = body.filename ?? "";

    if (!username || !filename) {
      return NextResponse.json(
        { error: "Provide either csvContent or both username and filename" },
        { status: 400 }
      );
    }

    filenameForHints = path.basename(filename);
    const filePath = path.join(STATEMENTS_ROOT, username, filenameForHints);

    if (!filePath.startsWith(STATEMENTS_ROOT) || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Statement file not found: ${filenameForHints}` }, { status: 404 });
    }

    content = fs.readFileSync(filePath, "utf-8");
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "File is empty" }, { status: 422 });
  }

  // Parse the CSV
  const parsed = parseStatement(content, filenameForHints);
  if (parsed.transactions.length === 0) {
    return NextResponse.json({ error: "No transactions could be parsed from this file" }, { status: 422 });
  }

  // Infer bank details
  const hints = parseFilenameHints(filenameForHints);
  const institutionName = body.institutionName ?? hints.institution;
  const accountMask     = body.accountMask     ?? hints.mask;

  // Determine statement period for display
  const dates = parsed.transactions.map((t) => t.date).sort();
  const periodStart = dates[0];
  const periodEnd   = dates[dates.length - 1];

  // Derive current balance from the last known balance in the CSV
  // Chase includes a "Balance" column — extract from raw content
  const balanceMatch = content.split("\n")
    .filter((l) => l.includes(","))
    .slice(1, 3) // second line (first data row = most recent)
    .map((l) => {
      const cols = l.split(",");
      return parseFloat(cols[5] ?? "");
    })
    .find((n) => !isNaN(n));
  const currentBalance = balanceMatch ?? 0;

  // ── AI Categorisation ─────────────────────────────────────────────────────
  // Send all descriptions to Gemini Flash in one call (it handles large payloads)
  // Fall back to regex categories from the parser if AI fails
  const descriptions = parsed.transactions.map((t) => t.title);
  const aiCategories = await aiCategorise(descriptions);

  // Merge AI categories back (fallback to parser's regex category if AI didn't provide one)
  const transactions = parsed.transactions.map((t, i) => ({
    ...t,
    category: (aiCategories[i] ?? t.category) as Category,
  }));

  // ── Create the bank account ───────────────────────────────────────────────
  const bank = addBank({
    workspaceId,
    institutionName,
    accountId: `stmt-${accountMask}-${Date.now()}`,
    displayMask: accountMask,
    shareableId: `${institutionName.toLowerCase().replace(/\s+/g, "-")}-${accountMask}`,
    balance: currentBalance,
  });

  // ── Import transactions ──────────────────────────────────────────────────
  const seen = new Set<string>();
  let imported = 0;
  let duplicates = 0;

  for (const txn of transactions) {
    if (seen.has(txn.externalReference)) { duplicates++; continue; }
    seen.add(txn.externalReference);

    const syncType: "income" | "expense" =
      txn.transactionType === "income" ? "income" : "expense";

    insertSyncedTransaction({
      workspaceId,
      bankId: bank.bankId,
      title: txn.title,
      amount: txn.amount,
      transactionType: syncType,
      category: txn.category,
      date: txn.date,
      externalReference: txn.externalReference,
    });
    imported++;
  }

  // ── Build category breakdown for UI ──────────────────────────────────────
  const categoryBreakdown: Record<string, { count: number; total: number }> = {};
  for (const txn of transactions) {
    if (!categoryBreakdown[txn.category]) {
      categoryBreakdown[txn.category] = { count: 0, total: 0 };
    }
    categoryBreakdown[txn.category].count++;
    categoryBreakdown[txn.category].total += txn.amount;
  }

  return NextResponse.json({
    bank,
    imported,
    duplicates,
    skipped: parsed.skipped,
    totalTransactions: transactions.length,
    periodStart,
    periodEnd,
    currentBalance,
    categoryBreakdown,
    filename: filenameForHints,
    username: (body.username ?? "").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 64),
    message: `Created ${institutionName} ···${accountMask} and imported ${imported} transactions (${periodStart} → ${periodEnd}).`,
  });
}
