"use client";

import { useState, useCallback } from "react";
import { TrendingDown, Plus, Pencil, Trash2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategoryBreakdown,
  sumByType,
} from "@/lib/services/transactions";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { formatCurrency } from "@/lib/utils";
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import DeleteConfirmation from "@/components/DeleteConfirmation";

export default function ExpensePage() {
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = version;
  const result = listTransactions(
    { workspaceId: DEFAULT_WORKSPACE_ID, transactionType: "expense" },
    { page: 1, pageSize: 100 }
  );
  const expenseRecords = result.items;
  const totalExpense = sumByType(DEFAULT_WORKSPACE_ID, "expense");
  const breakdown = getCategoryBreakdown(DEFAULT_WORKSPACE_ID, "expense");

  function handleCreate(data: CreateTransactionInput | UpdateTransactionInput) {
    const input = data as CreateTransactionInput;
    createTransaction(
      { ...input, workspaceId: DEFAULT_WORKSPACE_ID, transactionType: "expense" },
      "usr-001"
    );
    setShowForm(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and manage all expense activity
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-danger text-white text-sm font-medium hover:bg-red-600 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <div className="flex items-center gap-3 mb-2">
          <TrendingDown className="w-5 h-5 text-arcana-danger" />
          <span className="text-sm text-slate-400">Total Expenses</span>
        </div>
        <p className="text-2xl font-bold text-arcana-danger">
          {formatCurrency(totalExpense)}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {expenseRecords.length} expense records this period
        </p>
      </div>

      {/* Expense by category chart */}
      {breakdown.length > 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Expenses by Category
          </h3>
          <div className="space-y-3">
            {breakdown.map((item) => (
              <div key={item.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-white font-medium">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-arcana-navy overflow-hidden">
                  <div
                    className="h-full rounded-full bg-arcana-danger"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Records */}
      {expenseRecords.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="No expense records"
          description="Add your first expense entry to start tracking"
          action={{ label: "Add Expense", onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-slate-400 text-left border-b border-arcana-border bg-arcana-navy/50">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium w-20">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {expenseRecords.map((txn) => (
                <tr
                  key={txn.transactionId}
                  className="border-b border-arcana-border last:border-0 hover:bg-arcana-navy/30 transition-colors"
                >
                  <td className="px-5 py-3 text-white font-medium">
                    {txn.title}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.sourceType === "synced"
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {txn.sourceType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300">
                    {txn.category}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.status === "posted"
                          ? "bg-green-500/10 text-arcana-success"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-arcana-danger">
                    -{formatCurrency(txn.amount)}
                  </td>
                  <td className="px-5 py-3">
                    {txn.sourceType === "manual" && (
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingTxn(txn)}
                          className="p-2 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTxn(txn)}
                          className="p-2 rounded text-slate-400 hover:text-arcana-danger hover:bg-red-500/10 transition-colors"
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
      )}

      {/* Modals */}
      {showForm && (
        <TransactionForm
          mode="create"
          defaultType="expense"
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingTxn && (
        <TransactionForm
          mode="edit"
          defaultType="expense"
          transaction={editingTxn}
          onSubmit={handleUpdate}
          onClose={() => setEditingTxn(null)}
        />
      )}
      {deletingTxn && (
        <DeleteConfirmation
          title="Delete Expense Record"
          message={`Are you sure you want to delete "${deletingTxn.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTxn(null)}
        />
      )}
    </div>
  );
}
