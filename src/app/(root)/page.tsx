import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Wallet,
} from "lucide-react";
import { mockDashboardMetrics, mockBanks, mockTransactions } from "@/lib/mock/data";
import { CATEGORY_LABELS } from "@/lib/constants";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

const metrics = mockDashboardMetrics;

const summaryCards = [
  {
    label: "Total Balance",
    value: formatCurrency(metrics.totalBalance),
    icon: Wallet,
    color: "text-arcana-sky",
  },
  {
    label: "Total Income",
    value: formatCurrency(metrics.totalIncome),
    icon: TrendingUp,
    color: "text-arcana-success",
  },
  {
    label: "Total Expenses",
    value: formatCurrency(metrics.totalExpense),
    icon: TrendingDown,
    color: "text-arcana-danger",
  },
  {
    label: "Transaction Volume",
    value: formatCurrency(metrics.totalTransactionValue),
    icon: ArrowLeftRight,
    color: "text-arcana-warning",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, Alex</h1>
        <p className="text-sm text-slate-400 mt-1">
          Here&apos;s your financial overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-arcana-surface border border-arcana-border p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts placeholder row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Account Distribution */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Account Distribution
          </h3>
          <div className="space-y-3">
            {mockBanks.map((bank) => {
              const pct = (bank.balance / metrics.totalBalance) * 100;
              return (
                <div key={bank.bankId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">
                      {bank.institutionName} (...{bank.displayMask})
                    </span>
                    <span className="text-white font-medium">
                      {formatCurrency(bank.balance)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-arcana-navy overflow-hidden">
                    <div
                      className="h-full rounded-full bg-arcana-blue"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Category Breakdown
          </h3>
          <div className="space-y-2">
            {Object.entries(
              mockTransactions
                .filter((t) => t.transactionType === "expense")
                .reduce<Record<string, number>>((acc, t) => {
                  acc[t.category] = (acc[t.category] || 0) + t.amount;
                  return acc;
                }, {})
            )
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => (
                <div
                  key={cat}
                  className="flex justify-between text-sm py-1.5 border-b border-arcana-border last:border-0"
                >
                  <span className="text-slate-300">
                    {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat}
                  </span>
                  <span className="text-white font-medium">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Financial Summary Card */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <h3 className="text-sm font-semibold text-white mb-4">
          Financial Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-arcana-success">
              {(metrics.savingsRate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Savings Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-arcana-danger">
              {(metrics.spendingRate * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Spending Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-arcana-sky">
              {metrics.accountCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Linked Accounts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-arcana-warning">
              {CATEGORY_LABELS[metrics.topCategory]}
            </p>
            <p className="text-xs text-slate-400 mt-1">Top Category</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Recent Transactions
          </h3>
          <a
            href="/transactions"
            className="text-xs text-arcana-sky hover:underline"
          >
            See all
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-arcana-border">
                <th className="pb-2 font-medium">Title</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentTransactions.map((txn) => (
                <tr
                  key={txn.transactionId}
                  className="border-b border-arcana-border last:border-0"
                >
                  <td className="py-2.5 text-white">{txn.title}</td>
                  <td className="py-2.5">
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
                  <td className="py-2.5 text-slate-300">
                    {CATEGORY_LABELS[txn.category]}
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td
                    className={`py-2.5 text-right font-medium ${
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
      </div>
    </div>
  );
}
