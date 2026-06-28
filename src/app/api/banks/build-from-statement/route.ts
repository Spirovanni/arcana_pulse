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
// Use Appwrite DB services for real persistence
import { getOrCreateBank } from "@/lib/services/db/banks";
import { insertSyncedTransaction } from "@/lib/services/db/transactions";
import { isAppwriteConfigured, getDatabase, DATABASE_ID, COLLECTIONS, Query } from "@/lib/appwrite";
import { completeForFeature } from "@/lib/ai-router";
import type { Category, AccountType } from "@/lib/types";
import fs from "fs";
import path from "path";

const STATEMENTS_ROOT = path.join(process.cwd(), "public", "statements");

const VALID_CATEGORIES: Category[] = [
  // Income
  "salary", "freelance", "business_income", "investments", "gov_benefits",
  "refunds", "gifts", "other_income",
  // Expense
  "housing", "transportation", "food_dining", "utilities", "healthcare",
  "personal_care", "entertainment", "shopping", "education", "family_childcare",
  "pets", "subscriptions", "travel", "insurance", "financial_fees", "taxes",
  "charity", "debt_payments", "business_expenses", "other_expenses",
  // Transfer
  "savings_investments", "account_transfers", "pay_person",
  // Legacy fallback
  "other",
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

INCOME: salary, freelance, business_income, investments, gov_benefits, refunds, gifts, other_income
EXPENSE: housing, transportation, food_dining, utilities, healthcare, personal_care, entertainment, shopping, education, family_childcare, pets, subscriptions, travel, insurance, financial_fees, taxes, charity, debt_payments, business_expenses, other_expenses
TRANSFER: savings_investments, account_transfers, pay_person

Rules:
- Direct deposits / payroll / wages → salary
- Freelance contracts, gig work (Uber driver, Fiverr) → freelance
- Business revenue, product sales → business_income
- Dividends, interest, capital gains → investments
- Social Security, unemployment, disability benefits → gov_benefits
- Tax refunds, purchase refunds, reimbursements → refunds
- Cash gifts, prizes → gifts
- Rent, mortgage, HOA, home maintenance → housing
- Gas stations, parking, Uber/Lyft rides, public transit, car payments → transportation
- Grocery stores, restaurants, fast food, cafes, food delivery → food_dining
- Electric, water, gas, internet, phone bills → utilities
- Doctors, dentists, pharmacies, gyms, therapy → healthcare
- Haircuts, salons, spa, beauty products → personal_care
- Movies, concerts, video games, hobbies → entertainment
- Retail stores, Amazon, clothing, online shopping → shopping
- Tuition, books, online courses → education
- Childcare, daycare, baby supplies → family_childcare
- Pet food, vet, pet grooming → pets
- Netflix, Spotify, SaaS subscriptions, memberships → subscriptions
- Flights, hotels, vacation rentals → travel
- Life, disability, umbrella insurance (not health/auto) → insurance
- Bank fees, ATM fees, overdraft, wire fees → financial_fees
- IRS, tax payments, estimated quarterly taxes → taxes
- Donations, charitable giving, tithing → charity
- Credit card payments, loan payments → debt_payments
- Office supplies, marketing, business software → business_expenses
- ATM cash withdrawals, Zelle/Venmo/PayPal payments to people → pay_person
- Transfers to savings, investments, retirement accounts → savings_investments
- Internal bank transfers, moving money between own accounts → account_transfers
- Return the JSON array and NOTHING else.`;

async function aiCategorise(
  descriptions: string[],
  workspaceId: string
): Promise<Category[]> {
  if (descriptions.length === 0) return [];

  // Gemini Flash can handle 1500 descriptions in one shot — build the payload
  const prompt = JSON.stringify(descriptions);

  try {
    const raw = await completeForFeature(
      "categorize",
      SYSTEM_PROMPT,
      prompt,
      8192,
      { workspaceId }
    );
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

  try {
    return await handlePost(request, auth);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : String(err);
    // Log the full error server-side so it appears in Vercel logs
    console.error("[build-from-statement] Unhandled error:", err);
    return NextResponse.json(
      { error: msg || "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Extracted handler (throws — outer catch converts to 500 JSON) ────────────

async function handlePost(
  request: NextRequest,
  auth: Awaited<ReturnType<typeof requireAuth>> & { ok: true }
) {
  const body = await request.json().catch(() => ({})) as {
    csvContent?: string;
    username?: string;
    filename?: string;
    institutionName?: string;
    accountMask?: string;
    workspaceId?: string;
    accountType?: AccountType;
  };

  const workspaceId = body.workspaceId ?? auth.workspaceId;
  let content: string;
  let filenameForHints: string;

  if (body.csvContent) {
    content = body.csvContent;
    filenameForHints = body.filename ?? "statement.csv";
  } else {
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
  const balanceMatch = content.split("\n")
    .filter((l) => l.includes(","))
    .slice(1, 3)
    .map((l) => {
      const cols = l.split(",");
      return parseFloat(cols[5] ?? "");
    })
    .find((n) => !isNaN(n));
  const currentBalance = balanceMatch ?? 0;

  // ── AI Categorisation ──────────────────────────────────────────────────────
  const descriptions = parsed.transactions.map((t) => t.title);
  const aiCategories = await aiCategorise(descriptions, workspaceId);

  const transactions = parsed.transactions.map((t, i) => ({
    ...t,
    category: (aiCategories[i] ?? t.category) as Category,
  }));

  // ── Category breakdown ─────────────────────────────────────────────────────
  const categoryBreakdown: Record<string, { count: number; total: number }> = {};
  for (const txn of transactions) {
    if (!categoryBreakdown[txn.category]) {
      categoryBreakdown[txn.category] = { count: 0, total: 0 };
    }
    categoryBreakdown[txn.category].count++;
    categoryBreakdown[txn.category].total += txn.amount;
  }

  // ── ARC ID ─────────────────────────────────────────────────────────────────
  const { makeArcId } = await import("@/lib/utils");
  const shareableId = makeArcId(institutionName, accountMask);

  // ── Client-side dedup ──────────────────────────────────────────────────────
  const seen = new Map<string, typeof transactions[0]>();
  for (const txn of transactions) {
    if (!seen.has(txn.externalReference)) seen.set(txn.externalReference, txn);
  }
  const uniqueTxns = Array.from(seen.values());
  const clientDups = transactions.length - uniqueTxns.length;

  // ── Persist ────────────────────────────────────────────────────────────────
  const useAppwrite = isAppwriteConfigured();
  console.log(`[build-from-statement] useAppwrite=${useAppwrite} workspaceId=${workspaceId} txns=${uniqueTxns.length}`);
  console.log(`[build-from-statement] COLLECTIONS.banks=${process.env.APPWRITE_BANK_COLLECTION_ID ?? "banks"} COLLECTIONS.transactions=${process.env.APPWRITE_TRANSACTION_COLLECTION_ID ?? "transactions"}`);

  let bank: Awaited<ReturnType<typeof getOrCreateBank>>;
  let imported = 0;
  let dbDuplicates = 0;

  if (useAppwrite) {
    // Create the bank
    console.log("[build-from-statement] Creating bank in Appwrite…");
    bank = await getOrCreateBank({
      workspaceId,
      institutionName,
      accountId: `stmt-${accountMask}-${Date.now()}`,
      displayMask: accountMask,
      shareableId,
      balance: currentBalance,
      accountType: body.accountType ?? "bank",
    });
    console.log(`[build-from-statement] Bank created: ${bank.bankId}`);

    // Fetch existing refs for dedup
    const existingRefs = new Set<string>();
    try {
      const existing = await getDatabase().listDocuments(
        DATABASE_ID,
        COLLECTIONS.transactions,
        [Query.equal("bankId", bank.bankId), Query.limit(5000)]
      );
      for (const doc of existing.documents) {
        if (doc.externalReference) existingRefs.add(doc.externalReference as string);
      }
    } catch { /* New bank — no existing refs */ }

    const toInsert = uniqueTxns.filter((t) => !existingRefs.has(t.externalReference));
    dbDuplicates = uniqueTxns.length - toInsert.length;

    console.log(`[build-from-statement] Inserting ${toInsert.length} transactions…`);

    // Parallel batch insert (50 concurrent)
    const BATCH = 50;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        chunk.map((txn) =>
          insertSyncedTransaction({
            workspaceId,
            bankId: bank.bankId,
            title: txn.title,
            amount: txn.amount,
            transactionType: txn.transactionType === "income" ? "income" : "expense",
            category: txn.category,
            aiCategory: txn.category,
            date: txn.date,
            externalReference: txn.externalReference,
          })
        )
      );
      imported += results.filter((r) => r.status === "fulfilled").length;
    }
  } else {
    // Fallback: in-memory
    const { addBank: addBankMock } = await import("@/lib/services/banks");
    const { insertSyncedTransaction: insertMock } = await import("@/lib/services/transactions");

    bank = addBankMock({
      workspaceId,
      institutionName,
      accountId: `stmt-${accountMask}-${Date.now()}`,
      displayMask: accountMask,
      shareableId,
      balance: currentBalance,
    });

    for (const txn of uniqueTxns) {
      insertMock({
        workspaceId,
        bankId: bank.bankId,
        title: txn.title,
        amount: txn.amount,
        transactionType: txn.transactionType === "income" ? "income" : "expense",
        category: txn.category,
        date: txn.date,
        externalReference: txn.externalReference,
      });
      imported++;
    }
  }

  return NextResponse.json({
    bank: {
      bankId:          bank.bankId,
      institutionName: bank.institutionName,
      displayMask:     bank.displayMask,
      shareableId:     bank.shareableId,
      balance:         bank.balance,
    },
    imported,
    duplicates: clientDups + dbDuplicates,
    skipped: parsed.skipped,
    totalTransactions: transactions.length,
    periodStart,
    periodEnd,
    currentBalance,
    categoryBreakdown,
    persistedTo: useAppwrite ? "appwrite" : "memory",
    filename: filenameForHints,
    username: (body.username ?? "").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 64),
    message: `Created ${institutionName} ···${accountMask} and imported ${imported} transactions into Appwrite (${periodStart} → ${periodEnd}).`,
  });
}


