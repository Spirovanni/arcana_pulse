"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, Plus, Pencil, Trash2, BarChart2,
  DollarSign, Repeat2, CalendarClock, Percent,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import ExportButton from "@/components/ExportButton";
import EmptyState from "@/components/EmptyState";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategoryBreakdown,
  sumByType,
} from "@/lib/services/transactions";
import {
  getDividendSummary,
  getDividendHistory,
  getDividendYields,
} from "@/lib/services/investments";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/lib/types";
import TransactionForm from "@/components/TransactionForm";
import DeleteConfirmation from "@/components/DeleteConfirmation";

type Tab = "employment" | "investment";

const FREQ_LABELS = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annual": "Semi-Annual",
  annual: "Annual",
};

export default function IncomePage() {
  const [tab, setTab] = useState<Tab>("employment");
  const [showForm, setShowForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deletingTxn, setDeletingTxn] = useState<Transaction | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = version;

  // Employment income data
  const result = listTransactions(
    { workspaceId: DEFAULT_WORKSPACE_ID, transactionType: "income" },
    { page: 1, pageSize: 100 }
  );
  const incomeRecords = result.items;
  const totalIncome = sumByType(DEFAULT_WORKSPACE_ID, "income");
  const breakdown = getCategoryBreakdown(DEFAULT_WORKSPACE_ID, "income");

  // Investment income data
  const divSummary = getDividendSummary(DEFAULT_WORKSPACE_ID);
  const divHistory = getDividendHistory(DEFAULT_WORKSPACE_ID);
  const divYields = getDividendYields(DEFAULT_WORKSPACE_ID);

  function handleCreate(data: CreateTransactionInput | UpdateTransactionInput) {
    const input = data as CreateTransactionInput;
    createTransaction(
      { ...input, workspaceId: DEFAULT_WORKSPACE_ID, transactionType: "income" },
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Income</h1>
          <p className="text-sm text-slate-400 mt-1">
            Employment, freelance, and investment income
          </p>
        </div>
        {tab === "employment" && (
          <div className="flex gap-2 self-start sm:self-auto">
            <ExportButton
              baseFilter={{ workspaceId: DEFAULT_WORKSPACE_ID, transactionType: "income" }}
              reportTitle="Income Report"
            />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 btn-metallic text-xs font-bold uppercase tracking-[1px]"
            >
              <Plus className="w-4 h-4" />
              Add Income
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-arcana-border">
        {(["employment", "investment"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-px",
              tab === t
                ? "border-primary text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {t === "employment" ? "Employment" : "Investment Income"}
          </button>
        ))}
      </div>

      {/* ── Employment tab ── */}
      {tab === "employment" && (
        <>
          {/* Summary */}
          <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-arcana-success" />
              <span className="text-sm text-slate-400">Total Income</span>
            </div>
            <p className="text-2xl font-bold text-arcana-success">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {incomeRecords.length} income records this period
            </p>
          </div>

          {/* Income by source chart */}
          {breakdown.length > 0 && (
            <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Income by Source</h3>
              <div className="space-y-3">
                {breakdown.map((item) => (
                  <div key={item.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="text-white font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-arcana-navy overflow-hidden">
                      <div
                        className="h-full rounded-full bg-arcana-success"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income Records table */}
          {incomeRecords.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No income records"
              description="Add your first income entry to start tracking"
              action={{ label: "Add Income", onClick: () => setShowForm(true) }}
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
                    <th className="px-5 py-3 font-medium w-20"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {incomeRecords.map((txn) => (
                    <tr
                      key={txn.transactionId}
                      className="border-b border-arcana-border last:border-0 hover:bg-arcana-navy/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-white font-medium">{txn.title}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          txn.sourceType === "synced" ? "bg-purple-500/10 text-purple-400" : "bg-yellow-500/10 text-yellow-400"
                        )}>
                          {txn.sourceType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{txn.category}</td>
                      <td className="px-5 py-3 text-slate-400">{formatDate(txn.date)}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          txn.status === "posted" ? "bg-green-500/10 text-arcana-success" : "bg-yellow-500/10 text-yellow-400"
                        )}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-arcana-success">+{formatCurrency(txn.amount)}</td>
                      <td className="px-5 py-3">
                        {txn.sourceType === "manual" && (
                          <div className="flex gap-1 justify-end">
                            <button type="button" onClick={() => setEditingTxn(txn)} className="p-2 rounded text-slate-400 hover:text-white hover:bg-arcana-navy transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => setDeletingTxn(txn)} className="p-2 rounded text-slate-400 hover:text-arcana-danger hover:bg-red-500/10 transition-colors" title="Delete">
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
        </>
      )}

      {/* ── Investment Income tab ── */}
      {tab === "investment" && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: DollarSign,    label: "Received YTD",       value: formatCurrency(divSummary.totalReceivedYTD),  color: "text-green-400" },
              { icon: BarChart2,     label: "Projected Annual",   value: formatCurrency(divSummary.projectedAnnual),   color: "text-blue-400" },
              { icon: Percent,       label: "Portfolio Yield",    value: `${divSummary.portfolioYield.toFixed(2)}%`,   color: "text-primary" },
              { icon: TrendingUp,    label: "Yield on Cost",      value: `${divSummary.yieldOnCost.toFixed(2)}%`,      color: "text-teal-400" },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Monthly bar chart + DRIP tickers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Monthly Dividend Income</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={divSummary.monthlyBreakdown} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={40} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [formatCurrency(Number(v)), "Dividends"]}
                  />
                  {divSummary.monthlyBreakdown.map((_, i) => (
                    <Cell key={i} fill={i === divSummary.monthlyBreakdown.length - 1 ? "#C5A059" : "#3B82F6"} />
                  ))}
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {divSummary.monthlyBreakdown.map((_, i) => (
                      <Cell key={i} fill={i === divSummary.monthlyBreakdown.length - 1 ? "#C5A059" : "#3B82F6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">By Security (LTM)</h3>
              <div className="space-y-3">
                {divSummary.byTicker.map((t) => (
                  <div key={t.ticker}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-300">{t.ticker}</span>
                      <span className="text-white">{formatCurrency(t.amount)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-arcana-navy overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {divSummary.dripTickers.length > 0 && (
                <div className="mt-5 pt-4 border-t border-arcana-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Repeat2 className="w-3.5 h-3.5 text-teal-400" />
                    <span className="text-[10px] uppercase tracking-wider text-teal-400 font-semibold">DRIP Enrolled</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {divSummary.dripTickers.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono font-bold">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dividend yields table */}
          <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
            <div className="px-5 py-4 border-b border-arcana-border flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Dividend Yield by Holding</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="text-slate-400 text-left border-b border-arcana-border bg-arcana-navy/50">
                    {["Ticker", "Security", "Annual Income", "Current Yield", "Yield on Cost", "Frequency", "Next Payment", "DRIP"].map((h) => (
                      <th key={h} className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {divYields.map((y) => (
                    <tr key={y.holdingId} className="border-b border-arcana-border last:border-0 hover:bg-arcana-navy/30 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-200">{y.ticker}</td>
                      <td className="px-5 py-3 text-slate-300 max-w-[160px] truncate">{y.securityName}</td>
                      <td className="px-5 py-3 text-green-400 font-medium">{formatCurrency(y.annualIncome)}</td>
                      <td className="px-5 py-3 text-blue-400">{y.currentYield.toFixed(2)}%</td>
                      <td className="px-5 py-3 text-teal-400">{y.yieldOnCost.toFixed(2)}%</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{FREQ_LABELS[y.frequency]}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-400 text-xs">{formatDate(y.nextEstimatedDate)}</span>
                          <span className="text-green-400 text-xs font-medium ml-1">+{formatCurrency(y.nextEstimatedAmount)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {y.isDRIPEnrolled ? (
                          <span className="flex items-center gap-1 text-teal-400 text-xs font-semibold">
                            <Repeat2 className="w-3 h-3" /> DRIP
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dividend history */}
          <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
            <div className="px-5 py-4 border-b border-arcana-border">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Dividend History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="text-slate-400 text-left border-b border-arcana-border bg-arcana-navy/50">
                    {["Date", "Security", "Description", "Type", "Amount"].map((h) => (
                      <th key={h} className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {divHistory.map((d) => (
                    <tr key={d.investmentTransactionId} className="border-b border-arcana-border last:border-0 hover:bg-arcana-navy/30 transition-colors">
                      <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(d.date)}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-200">{d.ticker}</td>
                      <td className="px-5 py-3 text-slate-300">{d.name}</td>
                      <td className="px-5 py-3">
                        {d.isDRIP ? (
                          <span className="flex items-center gap-1 text-teal-400 text-xs font-semibold">
                            <Repeat2 className="w-3 h-3" /> DRIP
                          </span>
                        ) : (
                          <span className="text-blue-400 text-xs">Cash</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-green-400 font-medium">+{formatCurrency(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showForm && (
        <TransactionForm
          mode="create"
          defaultType="income"
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingTxn && (
        <TransactionForm
          mode="edit"
          defaultType="income"
          transaction={editingTxn}
          onSubmit={handleUpdate}
          onClose={() => setEditingTxn(null)}
        />
      )}
      {deletingTxn && (
        <DeleteConfirmation
          title="Delete Income Record"
          message={`Are you sure you want to delete "${deletingTxn.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTxn(null)}
        />
      )}
    </div>
  );
}
