"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Printer, Download, ChevronLeft, Loader2, AlertCircle,
  Calendar, TrendingUp, TrendingDown, BarChart3
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Category } from "@/lib/types";

interface Transaction {
  date: string;
  title: string;
  amount: number;
  transactionType: "income" | "expense" | "transfer";
  category: Category;
  externalReference: string;
}

interface StatementData {
  filename: string;
  username: string;
  institutionName: string;
  accountMask: string;
  periodStart: string;
  periodEnd: string;
  currentBalance: number;
  transactions: Transaction[];
  categoryBreakdown: Record<string, { count: number; total: number }>;
  totalIncome: number;
  totalExpenses: number;
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

export default function StatementViewerPage() {
  const params = useParams();
  const username = params.username as string;
  const filename = decodeURIComponent(params.filename as string);

  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStatement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/banks/statement-data?username=${encodeURIComponent(username)}&filename=${encodeURIComponent(filename)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json() as StatementData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load statement");
    } finally {
      setLoading(false);
    }
  }, [username, filename]);

  useEffect(() => { fetchStatement(); }, [fetchStatement]);

  const filteredTransactions = data?.transactions.filter((t) => {
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    const matchSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-arcana-sky animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading statement…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-white font-medium">Could not load statement</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <Link href="/my-banks" className="text-arcana-sky text-sm hover:underline">
            ← Back to My Banks
          </Link>
        </div>
      </div>
    );
  }

  const sortedCategories = Object.entries(data.categoryBreakdown)
    .sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ── Toolbar (hidden when printing) ──────────────────────────────── */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/my-banks"
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          My Banks
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-sm text-white hover:bg-arcana-border transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
          <a
            href={`/statements/${username}/${filename}`}
            download={filename}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-arcana-blue text-white text-sm hover:bg-blue-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </a>
        </div>
      </div>

      {/* ── Statement header ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6 print:rounded-none print:border-0 print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white print:text-black">
              {data.institutionName}
            </h1>
            <p className="text-slate-400 text-sm mt-1 print:text-gray-500">
              Account ···{data.accountMask}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 print:text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              Statement period: {formatDate(data.periodStart)} — {formatDate(data.periodEnd)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Ending Balance</p>
            <p className="text-3xl font-bold text-white print:text-black">
              {formatCurrency(data.currentBalance)}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-arcana-border print:border-gray-200">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Total Income</p>
            <p className="text-lg font-semibold text-green-400 flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {formatCurrency(data.totalIncome)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Total Expenses</p>
            <p className="text-lg font-semibold text-red-400 flex items-center justify-center gap-1">
              <TrendingDown className="w-4 h-4" />
              {formatCurrency(data.totalExpenses)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Transactions</p>
            <p className="text-lg font-semibold text-white">
              {data.transactions.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Spending by Category ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6 print:rounded-none print:border-0">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-arcana-sky" />
          Spending by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedCategories
            .filter(([, v]) => v.total > 0)
            .map(([cat, { count, total }]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                className={`text-left p-3 rounded-lg border transition-all print:border-gray-200 ${
                  filterCategory === cat
                    ? "border-arcana-blue bg-arcana-blue/10"
                    : "border-arcana-border hover:border-arcana-blue/50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#64748b" }}
                  />
                  <span className="text-[10px] font-medium text-slate-300 truncate">
                    {CATEGORY_LABELS[cat as Category] ?? cat}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">{formatCurrency(total)}</p>
                <p className="text-[10px] text-slate-500">{count} transactions</p>
              </button>
            ))}
        </div>
      </div>

      {/* ── Filter bar (screen only) ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <input
          type="text"
          placeholder="Search transactions…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm rounded-lg bg-arcana-surface border border-arcana-border text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-arcana-blue"
        >
          <option value="all">All Categories</option>
          {Object.keys(CATEGORY_LABELS).map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat as Category]}
            </option>
          ))}
        </select>
        {(filterCategory !== "all" || searchQuery) && (
          <button
            type="button"
            onClick={() => { setFilterCategory("all"); setSearchQuery(""); }}
            className="px-3 py-2 rounded-lg text-sm text-slate-400 border border-arcana-border hover:border-arcana-blue/50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Transaction table ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden print:rounded-none print:border-0">
        <div className="px-5 py-3 border-b border-arcana-border bg-arcana-navy print:bg-white">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            <span>Description</span>
            <span className="text-center">Date</span>
            <span className="text-center">Category</span>
            <span className="text-right">Amount</span>
          </div>
        </div>
        <div className="divide-y divide-arcana-border print:divide-gray-100">
          {filteredTransactions.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-10">No transactions match your filter.</p>
          ) : (
            filteredTransactions.map((txn, i) => (
              <div
                key={`${txn.externalReference}-${i}`}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-arcana-navy/30 transition-colors print:hover:bg-transparent"
              >
                <span className="text-sm text-white truncate pr-2">{txn.title}</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDate(txn.date)}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[txn.category] ?? "#64748b" }}
                  />
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    {CATEGORY_LABELS[txn.category] ?? txn.category}
                  </span>
                </span>
                <span
                  className={`text-sm font-medium text-right tabular-nums whitespace-nowrap ${
                    txn.transactionType === "income" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {txn.transactionType === "income" ? "+" : "−"}
                  {formatCurrency(txn.amount)}
                </span>
              </div>
            ))
          )}
        </div>
        {filteredTransactions.length > 0 && (
          <div className="px-5 py-3 border-t border-arcana-border bg-arcana-navy/60 print:bg-gray-50">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
              <span className="text-xs font-medium text-slate-400">
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
              </span>
              <span />
              <span />
              <span className={`text-sm font-bold text-right tabular-nums ${
                filteredTransactions.reduce((s, t) => s + (t.transactionType === "income" ? t.amount : -t.amount), 0) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}>
                {formatCurrency(Math.abs(
                  filteredTransactions.reduce((s, t) => s + (t.transactionType === "income" ? t.amount : -t.amount), 0)
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; color: black; }
          nav, header, [data-sidebar] { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
