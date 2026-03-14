"use client";

import { useState, useCallback } from "react";
import { Plus, Filter, Pencil, Trash2 } from "lucide-react";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/services/transactions";
import { getBanksByWorkspace, DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type {
  Transaction,
  TransactionType,
  TransactionFilter,
  CreateTransactionInput,
  UpdateTransactionInput,
  PaginatedResult,
} from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import DeleteConfirmation from "@/components/DeleteConfirmation";

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const banks = getBanksByWorkspace(DEFAULT_WORKSPACE_ID);

  // ─── Filters ────────────────────────────────────────────────────
  const [bankFilter, setBankFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [page, setPage] = useState(1);

  // ─── Modal state ────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);

  // ─── Force re-render after mutations ────────────────────────────
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // ─── Query ──────────────────────────────────────────────────────
  const filter: TransactionFilter = {
    workspaceId: DEFAULT_WORKSPACE_ID,
    ...(bankFilter ? { bankId: bankFilter } : {}),
    ...(typeFilter ? { transactionType: typeFilter as TransactionType } : {}),
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = version; // trigger re-computation
  const result: PaginatedResult<Transaction> = listTransactions(filter, {
    page,
    pageSize: PAGE_SIZE,
  });

  // ─── Handlers ───────────────────────────────────────────────────
  function handleCreate(data: CreateTransactionInput | UpdateTransactionInput) {
    const input = data as CreateTransactionInput;
    createTransaction(
      { ...input, workspaceId: DEFAULT_WORKSPACE_ID },
      "usr-001"
    );
    setShowForm(false);
    setPage(1);
    bump();
  }

  function handleUpdate(data: CreateTransactionInput | UpdateTransactionInput) {
    if (!editingTxn) return;
    updateTransaction(editingTxn.transactionId, data as UpdateTransactionInput);
    setEditingTxn(null);
    bump();
  }

  function handleDelete() {
    if (!deletingTxn) return;
    deleteTransaction(deletingTxn.transactionId);
    setDeletingTxn(null);
    bump();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">
            View and manage all financial activity
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by account"
          value={bankFilter}
          onChange={(e) => {
            setBankFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
        >
          <option value="">All Accounts</option>
          {banks.map((bank) => (
            <option key={bank.bankId} value={bank.bankId}>
              {bank.institutionName} (...{bank.displayMask})
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as TransactionType | "");
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue"
        >
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      {/* Transaction Table */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-arcana-border bg-arcana-navy/50">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium w-20"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((txn) => (
                <tr
                  key={txn.transactionId}
                  className="border-b border-arcana-border last:border-0 hover:bg-arcana-navy/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-white font-medium">{txn.title}</p>
                      {txn.note && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {txn.note}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transactionType === "income"
                          ? "bg-green-500/10 text-arcana-success"
                          : txn.transactionType === "expense"
                          ? "bg-red-500/10 text-arcana-danger"
                          : "bg-blue-500/10 text-arcana-sky"
                      }`}
                    >
                      {txn.transactionType}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.sourceType === "synced"
                          ? "bg-purple-500/10 text-purple-400"
                          : txn.sourceType === "manual"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-blue-500/10 text-arcana-sky"
                      }`}
                    >
                      {txn.sourceType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {CATEGORY_LABELS[txn.category]}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.status === "posted"
                          ? "bg-green-500/10 text-arcana-success"
                          : txn.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-arcana-danger"
                      }`}
                    >
                      {txn.status}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-medium ${
                      txn.transactionType === "income"
                        ? "text-arcana-success"
                        : "text-arcana-danger"
                    }`}
                  >
                    {txn.transactionType === "income" ? "+" : "-"}
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="px-5 py-3">
                    {txn.sourceType === "manual" && (
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingTxn(txn)}
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTxn(txn)}
                          className="p-1.5 rounded text-slate-400 hover:text-arcana-danger hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-arcana-border text-sm text-slate-400">
          <span>
            Showing {result.items.length} of {result.total} transactions
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-3 py-1 rounded text-sm ${
                page <= 1
                  ? "bg-arcana-navy text-slate-500 cursor-not-allowed"
                  : "bg-arcana-navy text-slate-300 hover:text-white"
              }`}
            >
              Previous
            </button>
            <span className="px-2 py-1 text-slate-300">
              {result.page} / {result.totalPages || 1}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((p) => Math.min(result.totalPages, p + 1))
              }
              disabled={page >= result.totalPages}
              className={`px-3 py-1 rounded text-sm ${
                page >= result.totalPages
                  ? "bg-arcana-navy text-slate-500 cursor-not-allowed"
                  : "bg-arcana-navy text-slate-300 hover:text-white"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
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
