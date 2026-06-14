/**
 * GET /api/banks/statement-data?username=xavier_martinez&filename=Chase8016_...
 *
 * Parses a saved statement file and returns the full transaction list plus
 * aggregated summary data for the statement viewer page.
 * Uses the regex-based categoriser from statementParser (fast, no AI call needed
 * since the statement viewer is read-only / display-only).
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { parseStatement } from "@/lib/services/statementParser";
import fs from "fs";
import path from "path";
import type { Category } from "@/lib/types";

const STATEMENTS_ROOT = path.join(process.cwd(), "public", "statements");

function parseFilenameHints(filename: string): { institution: string; mask: string } {
  const base = path.basename(filename, path.extname(filename));
  const maskMatch = base.match(/(\d{4,6})/);
  const mask = maskMatch ? maskMatch[1].slice(-4) : "????";
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
  ];
  for (const [re, name] of institutions) {
    if (re.test(base)) return { institution: name, mask };
  }
  const word = base.split(/\d/)[0].replace(/_/g, " ").trim();
  return { institution: word || "Unknown Bank", mask };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const sp = request.nextUrl.searchParams;
  const username = (sp.get("username") ?? "").replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 64);
  const filename = sp.get("filename") ?? "";

  if (!username || !filename) {
    return NextResponse.json({ error: "username and filename are required" }, { status: 400 });
  }

  const safeFile = path.basename(filename);
  const filePath = path.join(STATEMENTS_ROOT, username, safeFile);
  if (!filePath.startsWith(STATEMENTS_ROOT) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: `File not found: ${safeFile}` }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = parseStatement(content, safeFile);

  const hints = parseFilenameHints(safeFile);

  // Extract current balance from first data line (Chase puts most-recent first)
  const lines = content.split("\n").filter((l) => l.includes(",")).slice(1, 3);
  const balanceMatch = lines.map((l) => parseFloat(l.split(",")[5] ?? "")).find((n) => !isNaN(n));
  const currentBalance = balanceMatch ?? 0;

  const dates = parsed.transactions.map((t) => t.date).sort();
  const periodStart = dates[0] ?? "";
  const periodEnd   = dates[dates.length - 1] ?? "";

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryBreakdown: Record<string, { count: number; total: number }> = {};

  for (const txn of parsed.transactions) {
    if (txn.transactionType === "income") totalIncome += txn.amount;
    else totalExpenses += txn.amount;

    const cat = txn.category as string;
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, total: 0 };
    categoryBreakdown[cat].count++;
    categoryBreakdown[cat].total += txn.amount;
  }

  return NextResponse.json({
    filename: safeFile,
    username,
    institutionName: hints.institution,
    accountMask: hints.mask,
    periodStart,
    periodEnd,
    currentBalance,
    totalIncome,
    totalExpenses,
    transactions: parsed.transactions.map((t) => ({
      date: t.date,
      title: t.title,
      amount: t.amount,
      transactionType: t.transactionType,
      category: t.category as Category,
      externalReference: t.externalReference,
    })),
    categoryBreakdown,
  });
}
