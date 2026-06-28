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
  Tag,
  X,
  Check,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_HIERARCHY } from "@/lib/constants";
import type { CategoryDef } from "@/lib/constants";
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
  transactionId?: string;   // present when loaded from Appwrite
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
  // Income
  salary:            "#22c55e",
  freelance:         "#86efac",
  business_income:   "#4ade80",
  investments:       "#6366f1",
  gov_benefits:      "#a78bfa",
  refunds:           "#34d399",
  gifts:             "#f472b6",
  other_income:      "#a3e635",
  // Expense
  housing:           "#ef4444",
  transportation:    "#3b82f6",
  food_dining:       "#f97316",
  utilities:         "#06b6d4",
  healthcare:        "#10b981",
  personal_care:     "#ec4899",
  entertainment:     "#f59e0b",
  shopping:          "#a855f7",
  education:         "#8b5cf6",
  family_childcare:  "#fb923c",
  pets:              "#84cc16",
  subscriptions:     "#d946ef",
  travel:            "#14b8a6",
  insurance:         "#64748b",
  financial_fees:    "#78716c",
  taxes:             "#dc2626",
  charity:           "#e879f9",
  debt_payments:     "#b91c1c",
  business_expenses: "#0ea5e9",
  other_expenses:    "#94a3b8",
  // Transfer
  savings_investments: "#2563eb",
  account_transfers:   "#475569",
  pay_person:          "#7c3aed",
  // Legacy
  investment: "#6366f1",
  refund:     "#34d399",
  food:       "#f97316",
  transfer:   "#94a3b8",
  other:      "#64748b",
};

const LS_KEY  = "arcana:statement-banks";
const LS_META = "arcana:statement-banks-meta";

// ── Recategorise Modal ────────────────────────────────────────────────────────

const TYPE_BADGE: Record<"income" | "expense" | "transfer", string> = {
  income:   "text-green-400 bg-green-900/30",
  expense:  "text-red-400 bg-red-900/30",
  transfer: "text-blue-400 bg-blue-900/30",
};

function RecategoriseModal({
  txn,
  onClose,
  onSaved,
}: {
  txn: StatementTransaction;
  onClose: () => void;
  onSaved: (transactionId: string, newCategory: Category) => void;
}) {
  const [selected, setSelected] = useState<Category>(txn.category);
  const [activeCat, setActiveCat] = useState<CategoryDef | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pickParent(cat: CategoryDef) {
    setSelected(cat.id);
    setActiveCat(cat);
  }

  function pickSub(id: Category) {
    setSelected(id);
  }

  async function save() {
    if (!txn.transactionId) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/transactions/${txn.transactionId}/override-category`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: selected }) }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      onSaved(txn.transactionId, selected);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const incomeGroups   = CATEGORY_HIERARCHY.filter((c) => c.type === "income");
  const expenseGroups  = CATEGORY_HIERARCHY.filter((c) => c.type === "expense");
  const transferGroups = CATEGORY_HIERARCHY.filter((c) => c.type === "transfer");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-arcana-surface border border-arcana-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-arcana-border shrink-0">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-arcana-sky" />
            <h2 className="text-sm font-semibold text-white">Recategorise</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Transaction summary */}
          <div className="rounded-lg bg-arcana-navy/60 px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium text-white leading-snug">{txn.title}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{formatDate(txn.date)}</p>
              <p className={`text-sm font-semibold tabular-nums ${txn.transactionType === "income" ? "text-green-400" : "text-red-400"}`}>
                {txn.transactionType === "income" ? "+" : "−"}{formatCurrency(txn.amount)}
              </p>
            </div>
          </div>

          {/* Current selection pill */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Selected:</span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-arcana-blue/20 border border-arcana-blue/50 text-xs text-white">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[selected] ?? CATEGORY_COLORS[activeCat?.id ?? ""] ?? "#64748b" }} />
              {CATEGORY_LABELS[selected] ?? selected}
            </span>
          </div>

          {/* Subcategory view */}
          {activeCat ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCat(null)}
                  className="flex items-center gap-1 text-xs text-arcana-sky hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  All categories
                </button>
                <span className="text-slate-600">·</span>
                <span className="text-xs font-medium text-white">{activeCat.name}</span>
              </div>

              {/* "Use category only" option */}
              <button
                type="button"
                onClick={() => setSelected(activeCat.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                  selected === activeCat.id
                    ? "bg-arcana-blue/20 border-arcana-blue text-white"
                    : "bg-arcana-navy/40 border-arcana-border text-slate-400 hover:border-arcana-blue/40 hover:text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[activeCat.id] ?? "#64748b" }} />
                <span className="flex-1">{activeCat.name} <span className="text-slate-600">(general)</span></span>
                {selected === activeCat.id && <Check className="w-3 h-3 text-arcana-sky shrink-0" />}
              </button>

              <div className="grid grid-cols-1 gap-1">
                {activeCat.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => pickSub(sub.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                      selected === sub.id
                        ? "bg-arcana-blue/20 border-arcana-blue text-white"
                        : "bg-arcana-navy/40 border-arcana-border text-slate-400 hover:border-arcana-blue/40 hover:text-slate-300"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-slate-500" />
                    <span className="flex-1">{sub.name}</span>
                    {selected === sub.id && <Check className="w-3 h-3 text-arcana-sky shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Top-level category view — grouped by type */
            <div className="space-y-4">
              {([["income", incomeGroups], ["expense", expenseGroups], ["transfer", transferGroups]] as const).map(([type, groups]) => (
                <div key={type}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1 ${TYPE_BADGE[type]}`}>
                    {type}
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {(groups as CategoryDef[]).map((cat) => {
                      const isActive = selected === cat.id || cat.subcategories.some((s) => s.id === selected);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => pickParent(cat)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                            isActive
                              ? "bg-arcana-blue/20 border-arcana-blue text-white"
                              : "bg-arcana-navy/40 border-arcana-border text-slate-400 hover:border-arcana-blue/40 hover:text-slate-300"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.id] ?? "#64748b" }} />
                          <span className="truncate flex-1">{cat.name}</span>
                          <ChevronLeft className="w-3 h-3 shrink-0 rotate-180 text-slate-600" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {err && <p className="text-xs text-red-400">{err}</p>}
          {!txn.transactionId && (
            <p className="text-xs text-amber-500 leading-relaxed">
              This transaction was loaded from a local file. Re-import the CSV to enable recategorisation.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-arcana-border flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs text-slate-400 hover:text-white border border-arcana-border transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!txn.transactionId || saving || selected === txn.category}
            onClick={save}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-arcana-blue hover:bg-blue-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
              : <><Check className="w-3.5 h-3.5" />Save</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [selectedTxn, setSelectedTxn] = useState<StatementTransaction | null>(null);

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

  // Update a single transaction's category in local state after a successful save
  function handleCategorySaved(transactionId: string, newCategory: Category) {
    setStmtData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.transactionId === transactionId ? { ...t, category: newCategory } : t
        ),
      };
    });
  }

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

  // Re-import banner
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
                <button
                  key={`${txn.externalReference}-${i}`}
                  type="button"
                  onClick={() => setSelectedTxn(txn)}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-arcana-navy/40 transition-colors text-left group"
                >
                  <span className="text-sm text-white truncate pr-2">{txn.title}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(txn.date)}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[txn.category] ?? "#64748b" }}
                    />
                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      {CATEGORY_LABELS[txn.category] ?? txn.category}
                    </span>
                    <Tag className="w-3 h-3 text-slate-700 group-hover:text-slate-500 transition-colors hidden sm:inline ml-0.5" />
                  </span>
                  <span className={`text-sm font-medium text-right tabular-nums whitespace-nowrap ${
                    txn.transactionType === "income" ? "text-green-400" : "text-red-400"
                  }`}>
                    {txn.transactionType === "income" ? "+" : "−"}{formatCurrency(txn.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Footer total */}
          {transactions.length > 0 && (
            <div className="px-5 py-3 border-t border-arcana-border bg-arcana-navy/60">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                <span className="text-xs text-slate-400">
                  {transactions.length.toLocaleString()} transaction{transactions.length !== 1 ? "s" : ""}
                  <span className="text-slate-600 ml-1.5">· click any row to recategorise</span>
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

      {/* ── Recategorise modal ───────────────────────────────────────────── */}
      {selectedTxn && (
        <RecategoriseModal
          txn={selectedTxn}
          onClose={() => setSelectedTxn(null)}
          onSaved={handleCategorySaved}
        />
      )}
    </div>
  );
}
