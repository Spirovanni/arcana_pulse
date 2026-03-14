import { TrendingDown, Plus } from "lucide-react";
import { mockTransactions } from "@/lib/mock/data";
import { CATEGORY_LABELS } from "@/lib/constants";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

const expenseRecords = mockTransactions.filter(
  (t) => t.transactionType === "expense"
);
const totalExpense = expenseRecords.reduce((sum, t) => sum + t.amount, 0);

export default function ExpensePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and manage all expense activity
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-danger text-white text-sm font-medium hover:bg-red-600 transition-colors">
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

      {/* Expense chart placeholder */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Expenses by Category
        </h3>
        <div className="space-y-3">
          {Object.entries(
            expenseRecords.reduce<Record<string, number>>((acc, t) => {
              acc[t.category] = (acc[t.category] || 0) + t.amount;
              return acc;
            }, {})
          )
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amount]) => {
              const pct = (amount / totalExpense) * 100;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-arcana-navy overflow-hidden">
                    <div
                      className="h-full rounded-full bg-arcana-danger"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Expense Records */}
      {expenseRecords.length === 0 ? (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-12 text-center">
          <TrendingDown className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No expense records
          </h3>
          <p className="text-sm text-slate-400">
            Add your first expense entry to start tracking
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-arcana-border bg-arcana-navy/50">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
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
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      txn.sourceType === "synced"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}>
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
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      txn.status === "posted"
                        ? "bg-green-500/10 text-arcana-success"
                        : "bg-yellow-500/10 text-yellow-400"
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-arcana-danger">
                    -{formatCurrency(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
