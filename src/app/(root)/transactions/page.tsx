"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, Pencil, Trash2, Landmark, X, ArrowLeftRight, Search, Tag,
} from "lucide-react";
import ExportButton from "@/components/ExportButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { CATEGORY_LABELS, CATEGORY_HIERARCHY } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type {
  Transaction, TransactionType, Category,
  CreateTransactionInput, UpdateTransactionInput,
} from "@/lib/types";
import type { Bank } from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import DeleteConfirmation from "@/components/DeleteConfirmation";

const PAGE_SIZE = 20;

// Colour per top-level category (subcategories inherit from parent)
const CAT_COLORS: Record<string, string> = {
  salary: "#22c55e", freelance: "#86efac", business_income: "#4ade80",
  investments: "#6366f1", gov_benefits: "#a78bfa", refunds: "#34d399",
  gifts: "#f472b6", other_income: "#a3e635",
  housing: "#ef4444", transportation: "#3b82f6", food_dining: "#f97316",
  utilities: "#06b6d4", healthcare: "#10b981", personal_care: "#ec4899",
  entertainment: "#f59e0b", shopping: "#a855f7", education: "#8b5cf6",
  family_childcare: "#fb923c", pets: "#84cc16", subscriptions: "#d946ef",
  travel: "#14b8a6", insurance: "#64748b", financial_fees: "#78716c",
  taxes: "#dc2626", charity: "#e879f9", debt_payments: "#b91c1c",
  business_expenses: "#0ea5e9", other_expenses: "#94a3b8",
  savings_investments: "#2563eb", account_transfers: "#475569", pay_person: "#7c3aed",
  // legacy
  investment: "#6366f1", refund: "#34d399", food: "#f97316",
  transfer: "#94a3b8", other: "#64748b",
};

function getCategoryColor(cat: string): string {
  if (CAT_COLORS[cat]) return CAT_COLORS[cat];
  for (const group of CATEGORY_HIERARCHY) {
    if (group.subcategories.some((s) => s.id === cat)) return CAT_COLORS[group.id] ?? "#64748b";
  }
  return "#64748b";
}

interface PaginatedResult {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const EMPTY_RESULT: PaginatedResult = { items: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 };

export default function TransactionsPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading transactions..." />}>
      <TransactionsContent />
    </Suspense>
  );
}

function TransactionsContent() {
  const searchParams = useSearchParams();
  const bankParam = searchParams.get("bank") ?? "";

  // ─── Filters ────────────────────────────────────────────────────────────────
  const [bankFilter, setBankFilter] = useState(bankParam);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ─── Data state ─────────────────────────────────────────────────────────────
  const [result, setResult] = useState<PaginatedResult>(EMPTY_RESULT);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => { setPage(1); setVersion((v) => v + 1); }, []);

  // ─── Modal state ─────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ─── Load banks once ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/banks")
      .then((r) => r.json())
      .then((d) => setBanks(d.banks ?? []))
      .catch(() => {});
  }, []);

  // ─── Load transactions ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (bankFilter)      params.set("bankId", bankFilter);
    if (typeFilter)      params.set("transactionType", typeFilter);
    if (categoryFilter)  params.set("category", categoryFilter);
    if (search.trim())   params.set("search", search.trim());

    fetch(`/api/transactions?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<PaginatedResult>;
      })
      .then((data) => { if (!cancelled) { setResult(data); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [bankFilter, typeFilter, categoryFilter, search, page, version]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  async function handleCreate(data: CreateTransactionInput | UpdateTransactionInput) {
    setMutationError(null);
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setMutationError(d.error ?? "Failed to create transaction");
      return;
    }
    setShowForm(false);
    bump();
  }

  async function handleUpdate(data: CreateTransactionInput | UpdateTransactionInput) {
    if (!editingTxn) return;
    setMutationError(null);
    const res =
      editingTxn.sourceType === "synced"
        ? await fetch(
            `/api/transactions/${editingTxn.transactionId}/override-category`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: data.category }),
            }
          )
        : await fetch(`/api/transactions/${editingTxn.transactionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string };
      setMutationError(d.error ?? "Failed to update transaction");
      return;
    }
    setEditingTxn(null);
    bump();
  }

  async function handleDelete() {
    if (!deletingTxn) return;
    await fetch(`/api/transactions/${deletingTxn.transactionId}`, { method: "DELETE" });
    setDeletingTxn(null);
    bump();
  }

  const contextBank = bankParam ? banks.find((b) => b.bankId === bankParam) ?? null : null;

  const resetFilters = () => {
    setBankFilter("");
    setTypeFilter("");
    setCategoryFilter("");
    setSearch("");
    setPage(1);
  };

  const hasFilters = bankFilter || typeFilter || categoryFilter || search;

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">
            {loading ? "Loading…" : `${result.total.toLocaleString()} transaction${result.total !== 1 ? "s" : ""} across all accounts`}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <ExportButton
            baseFilter={{
              workspaceId: "",
              ...(bankFilter ? { bankId: bankFilter } : {}),
              ...(typeFilter ? { transactionType: typeFilter as TransactionType } : {}),
            }}
            reportTitle="Transaction Report"
          />
          <button
            type="button"
            onClick={() => { setMutationError(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 btn-metallic text-xs font-bold uppercase tracking-[1px]"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue w-52"
          />
        </div>

        {/* Account */}
        <select
          aria-label="Filter by account"
          value={bankFilter}
          onChange={(e) => { setBankFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
        >
          <option value="">All Accounts</option>
          {banks.map((bank) => (
            <option key={bank.bankId} value={bank.bankId}>
              {bank.institutionName} (···{bank.displayMask})
            </option>
          ))}
        </select>

        {/* Type */}
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as TransactionType | ""); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>

        {/* Category */}
        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
        >
          <option value="">All Categories</option>
          <optgroup label="── Income">
            {CATEGORY_HIERARCHY.filter((c) => c.type === "income").map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
          <optgroup label="── Expense">
            {CATEGORY_HIERARCHY.filter((c) => c.type === "expense").map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
          <optgroup label="── Transfer">
            {CATEGORY_HIERARCHY.filter((c) => c.type === "transfer").map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs text-slate-400 hover:text-white border border-arcana-border hover:border-slate-500 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* ── Bank context strip ────────────────────────────────────────────────── */}
      {contextBank && bankFilter === bankParam && (
        <div className="flex items-center gap-3 rounded-xl bg-arcana-surface border border-arcana-border px-5 py-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-arcana-navy">
            <Landmark className="w-4 h-4 text-arcana-sky" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              {contextBank.institutionName}{" "}
              <span className="text-slate-400 font-normal">···{contextBank.displayMask}</span>
            </p>
            <p className="text-xs text-slate-500">Showing transactions for this account</p>
          </div>
          <button
            type="button"
            onClick={() => { setBankFilter(""); setPage(1); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filter
          </button>
        </div>
      )}

      {/* ── Mutation error ───────────────────────────────────────────────────── */}
      {mutationError && (
        <div className="rounded-lg bg-red-900/20 border border-red-700/40 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{mutationError}</span>
          <button type="button" onClick={() => setMutationError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner label="Loading transactions…" />
      ) : error ? (
        <div className="rounded-xl bg-red-900/20 border border-red-700/40 px-5 py-4 text-sm text-red-400">{error}</div>
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transactions found"
          description={
            hasFilters
              ? "No transactions match the selected filters. Try adjusting your search or filters."
              : "Upload a bank statement or add a transaction manually to get started."
          }
          action={!hasFilters ? { label: "Add Transaction", onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-slate-400 text-left border-b border-arcana-border bg-arcana-navy/50">
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium w-20"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((txn) => {
                  const canEdit = txn.sourceType === "manual" || txn.sourceType === "synced";
                  return (
                  <tr
                    key={txn.transactionId}
                    onClick={canEdit ? () => { setMutationError(null); setEditingTxn(txn); } : undefined}
                    className={`border-b border-arcana-border last:border-0 transition-colors ${
                      canEdit
                        ? "hover:bg-arcana-navy/30 cursor-pointer"
                        : "hover:bg-arcana-navy/20"
                    }`}
                  >
                    {/* Title */}
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-white font-medium leading-snug">{txn.title}</p>
                        {txn.note && <p className="text-xs text-slate-500 mt-0.5">{txn.note}</p>}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getCategoryColor(txn.category) }}
                        />
                        <span className="text-slate-300 text-xs">
                          {CATEGORY_LABELS[txn.category] ?? txn.category}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transactionType === "income"
                          ? "bg-green-500/10 text-arcana-success"
                          : txn.transactionType === "expense"
                          ? "bg-red-500/10 text-arcana-danger"
                          : "bg-blue-500/10 text-arcana-sky"
                      }`}>
                        {txn.transactionType}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.sourceType === "synced"
                          ? "bg-purple-500/10 text-purple-400"
                          : txn.sourceType === "manual"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-blue-500/10 text-arcana-sky"
                      }`}>
                        {txn.sourceType}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      {formatDate(txn.date)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.status === "posted"
                          ? "bg-green-500/10 text-arcana-success"
                          : txn.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-arcana-danger"
                      }`}>
                        {txn.status}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className={`px-5 py-3 text-right font-semibold tabular-nums ${
                      txn.transactionType === "income" ? "text-arcana-success" : "text-arcana-danger"
                    }`}>
                      {txn.transactionType === "income" ? "+" : "−"}{formatCurrency(txn.amount)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      {txn.sourceType === "manual" && (
                        <div className="flex gap-1 justify-end">
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setMutationError(null); setEditingTxn(txn); }}
                            className="p-2 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); setDeletingTxn(txn); }}
                            className="p-2 rounded text-slate-400 hover:text-arcana-danger hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {txn.sourceType === "synced" && (
                        <div className="flex justify-end" title="Click row to recategorize">
                          <Tag className="w-3 h-3 text-arcana-sky/80" />
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-arcana-border text-sm text-slate-400">
            <span>
              Showing{" "}
              {((result.page - 1) * PAGE_SIZE) + 1}–{Math.min(result.page * PAGE_SIZE, result.total)}{" "}
              of {result.total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`px-3 py-1 rounded text-sm ${page <= 1 ? "bg-arcana-navy text-slate-500 cursor-not-allowed" : "bg-arcana-navy text-slate-300 hover:text-white"}`}
              >
                Previous
              </button>
              <span className="px-2 py-1 text-slate-300">{result.page} / {result.totalPages || 1}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
                disabled={page >= result.totalPages}
                className={`px-3 py-1 rounded text-sm ${page >= result.totalPages ? "bg-arcana-navy text-slate-500 cursor-not-allowed" : "bg-arcana-navy text-slate-300 hover:text-white"}`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showForm && (
        <TransactionForm
          mode="create"
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingTxn && (
        <TransactionForm
          mode="edit"
          transaction={editingTxn}
          onSubmit={handleUpdate}
          onClose={() => setEditingTxn(null)}
        />
      )}
      {deletingTxn && (
        <DeleteConfirmation
          title="Delete Transaction"
          message={`Are you sure you want to delete "${deletingTxn.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTxn(null)}
        />
      )}
    </div>
  );
}
