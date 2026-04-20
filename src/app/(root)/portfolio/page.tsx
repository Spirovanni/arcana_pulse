"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import {
  getInvestmentAccountsByWorkspace,
  getHoldingsByAccount,
  getTotalInvestmentBalance,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/services/investments";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { formatCurrency } from "@/lib/utils";

// ── Static performance history (mock 6-month weekly snapshots) ───────────────
const PERFORMANCE_HISTORY = [
  { date: "Oct", value: 58200 },
  { date: "Nov", value: 61400 },
  { date: "Dec", value: 59800 },
  { date: "Jan", value: 63500 },
  { date: "Feb", value: 66100 },
  { date: "Mar", value: 68740 },
  { date: "Apr", value: 70471 },
];

const ALLOCATION_COLORS: Record<string, string> = {
  equity: "#3B82F6",
  etf: "#10B981",
  mutual_fund: "#8B5CF6",
  fixed_income: "#F59E0B",
  cash: "#6B7280",
  other: "#EC4899",
};

const ALLOCATION_LABELS: Record<string, string> = {
  equity: "Equities",
  etf: "ETFs",
  mutual_fund: "Mutual Funds",
  fixed_income: "Fixed Income",
  cash: "Cash",
  other: "Other",
};

export default function PortfolioPage() {
  const accounts = getInvestmentAccountsByWorkspace(DEFAULT_WORKSPACE_ID);
  const totalValue = getTotalInvestmentBalance(DEFAULT_WORKSPACE_ID);

  const allHoldings = useMemo(
    () => accounts.flatMap((a) => getHoldingsByAccount(a.investmentAccountId)),
    [accounts]
  );

  // Asset allocation by security type
  const allocationData = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of allHoldings) {
      const type = h.security.type ?? "other";
      map.set(type, (map.get(type) ?? 0) + h.institutionValue);
    }
    return Array.from(map.entries()).map(([type, value]) => ({
      name: ALLOCATION_LABELS[type] ?? type,
      value,
      type,
      pct: (value / totalValue) * 100,
    }));
  }, [allHoldings, totalValue]);

  // Portfolio totals
  const totalCost = allHoldings.reduce((s, h) => s + (h.costBasis ?? 0), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const gainPositive = totalGainLoss >= 0;

  // Performance change (last vs second-to-last)
  const perfCurrent = PERFORMANCE_HISTORY[PERFORMANCE_HISTORY.length - 1].value;
  const perfPrev = PERFORMANCE_HISTORY[PERFORMANCE_HISTORY.length - 2].value;
  const perfChange = perfCurrent - perfPrev;
  const perfChangePct = (perfChange / perfPrev) * 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-slate-400 mt-1">
          Investment accounts, holdings, and performance
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Value</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${gainPositive ? "text-green-400" : "text-red-400"}`}>
            {gainPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {gainPositive ? "+" : ""}{formatCurrency(totalGainLoss)} all time
          </p>
        </div>

        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Return</p>
          <p className={`text-2xl font-bold ${gainPositive ? "text-green-400" : "text-red-400"}`}>
            {gainPositive ? "+" : ""}{totalGainLossPct.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">vs. cost basis {formatCurrency(totalCost)}</p>
        </div>

        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Monthly Change</p>
          <p className={`text-2xl font-bold ${perfChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {perfChange >= 0 ? "+" : ""}{formatCurrency(perfChange)}
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${perfChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {perfChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {perfChangePct >= 0 ? "+" : ""}{perfChangePct.toFixed(2)}% this month
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance chart */}
        <div className="lg:col-span-2 rounded-xl bg-arcana-surface border border-arcana-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-4 h-4 text-arcana-sky" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Portfolio Performance</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={PERFORMANCE_HISTORY} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v) => [formatCurrency(Number(v)), "Value"]}
              />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#perfGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation pie */}
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-6">Allocation</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {allocationData.map((entry, i) => (
                  <Cell key={i} fill={ALLOCATION_COLORS[entry.type] ?? "#6B7280"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [formatCurrency(Number(v)), ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {allocationData.map((entry, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: ALLOCATION_COLORS[entry.type] ?? "#6B7280" }}
                  />
                  <span className="text-xs text-slate-400">{entry.name}</span>
                </div>
                <span className="text-xs font-medium text-slate-300">{entry.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="px-6 py-4 border-b border-arcana-border">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-arcana-border">
                {["Ticker", "Name", "Account", "Qty", "Value", "Cost Basis", "Gain / Loss", "Return"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-arcana-border">
              {allHoldings.map((h) => {
                const gainLoss = h.unrealizedGainLoss ?? 0;
                const gainPct = h.unrealizedGainLossPct ?? 0;
                const up = gainLoss >= 0;
                const account = accounts.find((a) => a.investmentAccountId === h.investmentAccountId);
                return (
                  <tr key={h.holdingId} className="hover:bg-arcana-navy/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                      {h.security.ticker ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-300 max-w-[160px] truncate">{h.security.name}</td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-xs">
                      {account ? `${ACCOUNT_TYPE_LABELS[account.accountType]} ···${account.displayMask}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-right tabular-nums">{h.quantity}</td>
                    <td className="px-6 py-4 text-white font-medium text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(h.institutionValue)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-right tabular-nums whitespace-nowrap">
                      {h.costBasis != null ? formatCurrency(h.costBasis) : "—"}
                    </td>
                    <td className={`px-6 py-4 text-right tabular-nums whitespace-nowrap font-medium ${up ? "text-green-400" : "text-red-400"}`}>
                      {up ? "+" : ""}{formatCurrency(gainLoss)}
                    </td>
                    <td className={`px-6 py-4 text-right tabular-nums whitespace-nowrap text-xs ${up ? "text-green-400" : "text-red-400"}`}>
                      {up ? "+" : ""}{gainPct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acct) => {
          const holdings = getHoldingsByAccount(acct.investmentAccountId);
          const acctGain = holdings.reduce((s, h) => s + (h.unrealizedGainLoss ?? 0), 0);
          const acctCost = holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0);
          const acctGainPct = acctCost > 0 ? (acctGain / acctCost) * 100 : 0;
          const up = acctGain >= 0;
          return (
            <div key={acct.investmentAccountId} className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">{acct.institutionName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ACCOUNT_TYPE_LABELS[acct.accountType]} · ···{acct.displayMask}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{formatCurrency(acct.balance)}</p>
                  <p className={`text-xs flex items-center justify-end gap-1 ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {up ? "+" : ""}{acctGainPct.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                {holdings.map((h) => (
                  <div key={h.holdingId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-300 w-14 shrink-0">{h.security.ticker ?? "—"}</span>
                      <span className="text-xs text-slate-500 truncate">{h.security.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-200 ml-2 shrink-0">{formatCurrency(h.institutionValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
