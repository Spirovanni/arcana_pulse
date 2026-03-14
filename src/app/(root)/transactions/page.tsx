import { ArrowLeftRight, Plus, Filter } from "lucide-react";
import { mockTransactions, mockBanks } from "@/lib/mock/data";
import { CATEGORY_LABELS } from "@/lib/constants";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-slate-400 mt-1">
            View and manage all financial activity
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue">
          <option value="">All Accounts</option>
          {mockBanks.map((bank) => (
            <option key={bank.bankId} value={bank.bankId}>
              {bank.institutionName} (...{bank.displayMask})
            </option>
          ))}
        </select>
        <select className="px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-arcana-blue">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-arcana-surface border border-arcana-border text-sm text-slate-300 hover:text-white transition-colors">
          <Filter className="w-4 h-4" />
          More Filters
        </button>
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
              </tr>
            </thead>
            <tbody>
              {mockTransactions.map((txn) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-arcana-border text-sm text-slate-400">
          <span>Showing {mockTransactions.length} transactions</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-arcana-navy text-slate-400 cursor-not-allowed">
              Previous
            </button>
            <button className="px-3 py-1 rounded bg-arcana-navy text-slate-400 cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
