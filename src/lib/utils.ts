import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toISODate(date: Date): string {
  return date.toISOString();
}

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// ── ARC-{ABBREV}-{MASK} naming ───────────────────────────────────────────────

const INSTITUTION_ABBREVS: [RegExp, string][] = [
  [/chase/i,                     "CHASE"],
  [/bank\s*of\s*america|boa|bofa/i, "BOA"],
  [/wells\s*fargo/i,             "WF"],
  [/capital\s*one/i,             "CAPONE"],
  [/american\s*express|amex/i,   "AMEX"],
  [/navy\s*federal/i,            "NFCU"],
  [/usaa/i,                      "USAA"],
  [/discover/i,                  "DISC"],
  [/citibank|citi/i,             "CITI"],
  [/pnc/i,                       "PNC"],
  [/u\.?s\.?\s*bank/i,           "USB"],
  [/td\s*bank/i,                 "TD"],
  [/regions/i,                   "RGNS"],
  [/suntrust|truist/i,           "TRST"],
  [/ally/i,                      "ALLY"],
  [/charles\s*schwab/i,          "SCHW"],
  [/fidelity/i,                  "FDLTY"],
  [/vanguard/i,                  "VG"],
];

export function institutionAbbrev(name: string): string {
  for (const [re, abbrev] of INSTITUTION_ABBREVS) {
    if (re.test(name)) return abbrev;
  }
  // Fall back: take first letters of each word, max 6 chars, uppercase
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 6) || "BANK";
}

export function makeArcId(institutionName: string, mask: string): string {
  return `ARC-${institutionAbbrev(institutionName)}-${mask}`;
}
