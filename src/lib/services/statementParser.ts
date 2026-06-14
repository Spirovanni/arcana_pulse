/**
 * Bank statement parser.
 *
 * Supports two formats:
 *   1. CSV — auto-detects common column layouts from major banks
 *   2. Plain-text (from PDF extraction) — heuristic line-by-line parsing
 *
 * Returns a list of ParsedTransaction rows ready to be inserted via
 * insertSyncedTransaction().
 */

import type { Category, TransactionType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface ParsedTransaction {
  date: string;           // ISO date string YYYY-MM-DD
  title: string;
  amount: number;         // always positive; type field carries direction
  transactionType: TransactionType;
  category: Category;
  externalReference: string; // deduplification key
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  skipped: number;        // rows that couldn't be parsed
  format: "csv" | "text";
}

// ---------------------------------------------------------------------------
// Category heuristics (keyword → category)
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ pattern: RegExp; category: Category }> = [
  { pattern: /salary|payroll|direct.?dep|wages|ach.credit/i, category: "salary" },
  { pattern: /freelance|invoice|consulting|upwork|fiverr/i, category: "freelance" },
  { pattern: /dividend|interest.income|robinhood|fidelity|vanguard|schwab|etrade/i, category: "investment" },
  { pattern: /refund|reversal|return|chargeback/i, category: "refund" },
  { pattern: /rent|mortgage|hoa|lease|landlord/i, category: "housing" },
  { pattern: /uber|lyft|taxi|transit|metro|bart|mta|parking|gas.station|fuel|shell|chevron|exxon|bp\b/i, category: "transportation" },
  { pattern: /grubhub|doordash|ubereats|instacart|whole.foods|trader.joe|safeway|kroger|restaurant|cafe|coffee|starbucks|mcdonald|chipotle|subway\b/i, category: "food" },
  { pattern: /electric|water|gas\b|internet|comcast|xfinity|at&t|verizon|t-mobile|utility/i, category: "utilities" },
  { pattern: /pharmacy|cvs|walgreens|doctor|hospital|dental|medical|health|insurance.health/i, category: "healthcare" },
  { pattern: /netflix|hulu|spotify|disney|hbo|prime.video|apple.tv|youtube.premium|cinema|movie|theater/i, category: "entertainment" },
  { pattern: /amazon|walmart|target|best.buy|ebay|etsy|shopify|shopping|store/i, category: "shopping" },
  { pattern: /tuition|university|college|coursera|udemy|udacity|education|school|textbook/i, category: "education" },
  { pattern: /subscription|saas|monthly.fee|annual.fee|membership/i, category: "subscriptions" },
  { pattern: /airline|flight|hotel|airbnb|vrbo|travel|expedia|booking\.com|kayak/i, category: "travel" },
  { pattern: /transfer|zelle|venmo|paypal|wire|ach/i, category: "transfer" },
];

function inferCategory(title: string): Category {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(title)) return rule.category;
  }
  return "other";
}

function inferType(amount: number, title: string): TransactionType {
  if (/transfer|zelle|venmo|wire|ach/i.test(title)) return "transfer";
  return amount >= 0 ? "income" : "expense";
}

// ---------------------------------------------------------------------------
// Date normalisation
// ---------------------------------------------------------------------------

function parseDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/\./g, "/");
  // Try native Date parsing (handles ISO, MM/DD/YYYY, YYYY-MM-DD, etc.)
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  // MM/DD/YY
  const mmddyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mmddyy) {
    const year = parseInt(mmddyy[3]) < 50 ? 2000 + parseInt(mmddyy[3]) : 1900 + parseInt(mmddyy[3]);
    return `${year}-${mmddyy[1].padStart(2, "0")}-${mmddyy[2].padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function makeRef(date: string, title: string, amount: number): string {
  return `stmt:${date}:${title.slice(0, 30).toLowerCase().replace(/\s+/g, "_")}:${amount}`;
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/**
 * Detect which column indices hold date, description, and amount values.
 * Handles common layouts from Chase, BoA, Wells Fargo, Citi, etc.
 */
function detectCsvColumns(header: string[]): {
  dateIdx: number;
  descIdx: number;
  amountIdx: number;
  creditIdx?: number;
  debitIdx?: number;
} | null {
  const h = header.map((s) => s.toLowerCase().trim().replace(/['"]/g, ""));

  const dateIdx = h.findIndex((c) => /^date|^transaction.?date|^posted|^trans\.?date/i.test(c));
  const descIdx = h.findIndex((c) => /description|memo|payee|merchant|narrative|details/i.test(c));

  // Single "amount" column
  const amountIdx = h.findIndex((c) => /^amount$|^transaction.?amount|^debit\/credit/i.test(c));

  // Separate debit/credit columns (e.g., some BoA/Chase formats)
  const debitIdx = h.findIndex((c) => /^debit|^withdrawals?|^amount.?debit/i.test(c));
  const creditIdx = h.findIndex((c) => /^credit|^deposits?|^amount.?credit/i.test(c));

  if (dateIdx === -1 || descIdx === -1) return null;
  if (amountIdx === -1 && (debitIdx === -1 || creditIdx === -1)) return null;

  return { dateIdx, descIdx, amountIdx, creditIdx, debitIdx };
}

function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { transactions: [], skipped: 0, format: "csv" };

  // Split respecting quoted fields
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { result.push(cur); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur);
    return result;
  };

  const header = splitLine(lines[0]);
  const cols = detectCsvColumns(header);
  if (!cols) return { transactions: [], skipped: lines.length - 1, format: "csv" };

  const txns: ParsedTransaction[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = splitLine(lines[i]);
    const dateStr = row[cols.dateIdx]?.trim();
    const title = row[cols.descIdx]?.trim() ?? "";
    if (!dateStr || !title) { skipped++; continue; }

    const date = parseDate(dateStr);
    if (!date) { skipped++; continue; }

    let amount: number | null = null;

    if (cols.amountIdx >= 0) {
      amount = parseAmount(row[cols.amountIdx] ?? "");
    } else if (cols.creditIdx !== undefined && cols.debitIdx !== undefined) {
      const credit = parseAmount(row[cols.creditIdx] ?? "");
      const debit = parseAmount(row[cols.debitIdx] ?? "");
      if (credit !== null && credit !== 0) amount = Math.abs(credit);
      else if (debit !== null && debit !== 0) amount = -Math.abs(debit);
    }

    if (amount === null) { skipped++; continue; }

    const transactionType = inferType(amount, title);
    const category = inferCategory(title);

    txns.push({
      date,
      title,
      amount: Math.abs(amount),
      transactionType,
      category,
      externalReference: makeRef(date, title, amount),
    });
  }

  return { transactions: txns, skipped, format: "csv" };
}

// ---------------------------------------------------------------------------
// Plain-text parser (for copy-pasted or PDF-extracted text)
// ---------------------------------------------------------------------------

// Match lines like:  "01/15/2025   STARBUCKS #1234    -$5.40"
// or:                "Jan 15      Venmo Transfer      +1,200.00"
// Group 1: date, Group 2: description, Group 3: amount
const TEXT_LINE_RE =
  /^(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\w{3,9}\s+\d{1,2}(?:,?\s+\d{4})?)\s+(.+?)\s+([-+]?\$?[\d,]+\.\d{2})\s*$/;

function parseText(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const txns: ParsedTransaction[] = [];
  let skipped = 0;

  for (const line of lines) {
    const m = line.trim().match(TEXT_LINE_RE);
    if (!m) { skipped++; continue; }

    const date = parseDate(m[1]);
    if (!date) { skipped++; continue; }

    const title = m[2].trim();
    const amount = parseAmount(m[3]);
    if (amount === null) { skipped++; continue; }

    const transactionType = inferType(amount, title);
    const category = inferCategory(title);

    txns.push({
      date,
      title,
      amount: Math.abs(amount),
      transactionType,
      category,
      externalReference: makeRef(date, title, amount),
    });
  }

  return { transactions: txns, skipped, format: "text" };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Auto-detect format and parse statement text.
 * Pass the raw file content as a string (UTF-8 decoded).
 */
export function parseStatement(content: string, filename: string): ParseResult {
  const lower = filename.toLowerCase();

  // CSV file or content that looks like CSV (has multiple commas on first line)
  if (lower.endsWith(".csv") || (content.split("\n")[0] ?? "").split(",").length > 3) {
    return parseCsv(content);
  }

  // Otherwise treat as plain text (PDF text-extraction output)
  return parseText(content);
}
