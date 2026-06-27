"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Sparkles,
  Printer,
  Download,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Search,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Bank, Category } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StmtMeta {
  imported: number;
  periodStart: string;
  periodEnd: string;
  filename: string;
  username: string;
}

interface StatementTransaction {
  date: string;
  title: string;
  amount: number;
  transactionType: "income" | "expense" | "transfer";
  category: Category;
  externalReference: string;
}

interface StatementData {
  institutionName: string;
  accountMask: string;
  periodStart: string;
  periodEnd: string;
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactions: StatementTransaction[];
  categoryBreakdown: Record<string, { count: number; total: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  food:           "#f97316",
  transportation: "#3b82f6",
  shopping:       "#a855f7",
  subscriptions:  "#ec4899",
  utilities:      "#06b6d4",
  healthcare:     "#10b981",
  housing:        "#ef4444",
  entertainment:  "#f59e0b",
  education:      "#8b5cf6",
  travel:         "#14b8a6",
  salary:         "#22c55e",
  investment:     "#6366f1",
  transfer:       "#94a3b8",
  other:          "#64748b",
};

const LS_KEY  = "arcana:statement-banks";
const LS_META = "arcana:statement-banks-meta";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BankDetailPage() {
  const params = useParams();
  const bankId = params.bankId as string;

  const [bank, setBank] = useState<Bank | null>(null);
  const [meta, setMeta] = useState<StmtMeta | null>(null);
  const [stmtData, setStmtData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReimport, setNeedsReimport] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  // Load bank + meta from localStorage synchronously so they're available for fetchData
  const localBank = (() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const banks: Bank[] = JSON.parse(raw);
      return banks.find((b) => b.bankId === bankId) ?? null;
    } catch { return null; }
  })();

  const localMeta = (() => {
    try {
      const raw = localStorage.getItem(LS_META);
      if (!raw) return null;
      const allMeta: Record<string, StmtMeta> = JSON.parse(raw);
      return allMeta[bankId] ?? null;
    } catch { return null; }
  })();

  useEffect(() => {
    if (localBank) setBank(localBank);
    if (localMeta) setMeta(localMeta);
  }, [bankId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Single fetch — loads from Appwrite, falls back to CSV, then flags re-import
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNeedsReimport(false);
    try {
      // 1. Try live bank from Appwrite
      const bankRes = await fetch(`/api/banks/${bankId}`);
      if (bankRes.ok) {
        setBank(await bankRes.json() as Bank);
      }

      // 2. Fetch all transactions (paginated)
      const PAGE = 500;
      let page = 1;
      let allTxns: StatementTransaction[] = [];
      let appwriteWorking = false;
      while (true) {
        const txnRes = await fetch(
          `/api/transactions?bankId=${bankId}&pageSize=${PAGE}&page=${page}`
        );
        if (!txnRes.ok) break;
        appwriteWorking = true;
        const data = await txnRes.json() as {
          items: StatementTransaction[];
          total: number;
          totalPages: number;
        };
        allTxns = allTxns.concat(data.items ?? []);
        if (page >= (data.totalPages ?? 1)) break;
        page++;
      }

      if (allTxns.length > 0) {
        // Build summary from Appwrite transactions
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryBreakdown: Record<string, { count: number; total: number }> = {};
        const dates: string[] = [];

        for (const t of allTxns) {
          if (t.transactionType === "income") totalIncome += t.amount;
          else totalExpenses += t.amount;

          const cat = t.category as string;
          if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, total: 0 };
          categoryBreakdown[cat].count++;
          categoryBreakdown[cat].total += t.amount;

          const d = t.date?.substring(0, 10) ?? "";
          if (d) dates.push(d);
        }
        dates.sort();

        setStmtData({
          institutionName: localBank?.institutionName ?? "",
          accountMask: localBank?.displayMask ?? "",
          periodStart: dates[0] ?? "",
          periodEnd: dates[dates.length - 1] ?? "",
          currentBalance: localBank?.balance ?? 0,
          totalIncome,
          totalExpenses,
          transactions: allTxns,
          categoryBreakdown,
        });
      } else if (appwriteWorking) {
        // Appwrite is up but no transactions for this bank ID.
        // This bank was created before database persistence was added — flag re-import.
        setNeedsReimport(true);
      } else if (localMeta) {
        // Appwrite not reachable — try CSV fallback (for local dev)
        const csvRes = await fetch(
          `/api/banks/statement-data?username=${encodeURIComponent(localMeta.username)}&filename=${encodeURIComponent(localMeta.filename)}`
        );
        if (csvRes.ok) {
          setStmtData(await csvRes.json() as StatementData);
        } else {
          setNeedsReimport(true);
        }
      } else {
        setNeedsReimport(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [bankId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered + sorted transactions
  const transactions = (stmtData?.transactions ?? [])
    .filter((t) => {
      const matchCat = filterCategory === "all" || t.category === filterCategory;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => sortDesc
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
    );

  const displayName = bank?.institutionName ?? stmtData?.institutionName ?? "Bank Account";
  const displayMask = bank?.displayMask ?? stmtData?.accountMask ?? "????";
  const arcId       = bank?.shareableId ?? "ARC-???-????";
  const balance     = bank?.balance ?? stmtData?.currentBalance ?? 0;

  const topCategories = Object.entries(stmtData?.categoryBreakdown ?? {})
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  function goReimport() {
    window.location.href = "/my-banks?upload=1";
  }

  if (!bank && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-10 h-10 text-slate-500" />
        <p className="text-white font-medium">Bank account not found</p>
        <p className="text-slate-400 text-sm">This account may have been removed or the link is invalid.</p>
        <Link href="/my-banks" className="text-arcana-sky text-sm hover:underline">← Back to My Banks</Link>
      </div>
    );
  }

  // Re-import banner: shown when Appwrite has the bank but no transactions stored
  const ReimportBanner = needsReimport ? (
    <div className="rounded-xl bg-amber-900/20 border border-amber-700/40 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-300">No transactions found for this account</p>
        <p className="text-xs text-amber-500 mt-0.5">
          Upload your CSV statement to import transactions — they&apos;ll appear here and across your dashboards.
        </p>
      </div>
      <button
        type="button"
        onClick={goReimport}
        className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
      >
        Upload CSV
      </button>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {ReimportBanner}

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Link href="/my-banks" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
          My Banks
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-arcana-surface border border-arcana-border text-slate-300 hover:bg-arcana-border transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          {meta && (
            <a
              href={`/statements/${encodeURIComponent(meta.username)}/${encodeURIComponent(meta.filename)}`}
              download={meta.filename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-arcana-surface border border-arcana-border text-slate-300 hover:bg-arcana-border transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </a>
          )}
          {meta && (
            <Link
              href={`/statement-viewer/${encodeURIComponent(meta.username)}/${encodeURIComponent(meta.filename)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-900/40 border border-violet-700/40 text-violet-300 hover:bg-violet-800/50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Full Statement
            </Link>
          )}
        </div>
      </div>

      {/* ── Account header ───────────────────────────────────────────────── */}
      <div className="rounded-xl bg-arcana-surface border border-violet-800/40 overflow-hidden">
        {/* Gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-600 to-arcana-blue" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-violet-900/40 border border-violet-700/30">
                <FileText className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white">{displayName}</h1>
                  <span className="text-xs font-mono font-bold text-violet-400 bg-violet-900/30 border border-violet-700/30 rounded px-2 py-0.5">
                    {arcId}
                  </span>
                </div>
                <p className="text-sm text-slate-400">Checking Account ···{displayMask}</p>
                {meta && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {meta.periodStart} → {meta.periodEnd}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-violet-400">
                  <Sparkles className="w-3 h-3" />
                  AI-categorised via Gemini Flash
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500 mb-1">Ending Balance</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(balance)}</p>
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-arcana-border">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Total Income</p>
              <p className="text-lg font-semibold text-green-400 flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {formatCurrency(stmtData?.totalIncome ?? 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Total Expenses</p>
              <p className="text-lg font-semibold text-red-400 flex items-center justify-center gap-1">
                <TrendingDown className="w-4 h-4" />
                {formatCurrency(stmtData?.totalExpenses ?? 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Transactions</p>
              <p className="text-lg font-semibold text-white">
                {meta?.imported.toLocaleString() ?? stmtData?.transactions.length.toLocaleString() ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Spending by Category ─────────────────────────────────────────── */}
      {topCategories.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-arcana-sky" />
            Spending by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topCategories.map(([cat, { count, total }]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  filterCategory === cat
                    ? "border-arcana-blue bg-arcana-blue/10"
                    : "border-arcana-border hover:border-arcana-blue/50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#64748b" }} />
                  <span className="text-[10px] font-medium text-slate-400 truncate">
                    {CATEGORY_LABELS[cat as Category] ?? cat}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">{formatCurrency(total)}</p>
                <p className="text-[10px] text-slate-500">{count} txns</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Transactions ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm rounded-lg bg-arcana-surface border border-arcana-border text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_LABELS).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat as Category]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDesc((d) => !d)}
            className="px-3 py-2 rounded-lg text-xs bg-arcana-surface border border-arcana-border text-slate-400 hover:text-white transition-colors"
          >
            {sortDesc ? "Newest first" : "Oldest first"}
          </button>
          {(filterCategory !== "all" || search) && (
            <button
              type="button"
              onClick={() => { setFilterCategory("all"); setSearch(""); }}
              className="px-3 py-2 rounded-lg text-xs bg-arcana-surface border border-arcana-border text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-arcana-border bg-arcana-navy">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              <span>Description</span>
              <span>Date</span>
              <span>Category</span>
              <span className="text-right">Amount</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading transactions…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-12">
              {filterCategory !== "all" || search ? "No transactions match your filter." : "No transactions found."}
            </p>
          ) : (
            <div className="divide-y divide-arcana-border">
              {transactions.map((txn, i) => (
                <div
                  key={`${txn.externalReference}-${i}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-arcana-navy/30 transition-colors"
                >
                  <span className="text-sm text-white truncate pr-2">{txn.title}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(txn.date)}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[txn.category] ?? "#64748b" }} />
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {CATEGORY_LABELS[txn.category] ?? txn.category}
                    </span>
                  </span>
                  <span className={`text-sm font-medium text-right tabular-nums whitespace-nowrap ${
                    txn.transactionType === "income" ? "text-green-400" : "text-red-400"
                  }`}>
                    {txn.transactionType === "income" ? "+" : "−"}{formatCurrency(txn.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Footer total */}
          {transactions.length > 0 && (
            <div className="px-5 py-3 border-t border-arcana-border bg-arcana-navy/60">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                <span className="text-xs text-slate-400">
                  {transactions.length.toLocaleString()} transaction{transactions.length !== 1 ? "s" : ""}
                </span>
                <span /><span />
                <span className={`text-sm font-bold text-right tabular-nums ${
                  transactions.reduce((s, t) => s + (t.transactionType === "income" ? t.amount : -t.amount), 0) >= 0
                    ? "text-green-400" : "text-red-400"
                }`}>
                  {formatCurrency(Math.abs(
                    transactions.reduce((s, t) => s + (t.transactionType === "income" ? t.amount : -t.amount), 0)
                  ))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
