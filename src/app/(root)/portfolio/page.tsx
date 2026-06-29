"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  Brain,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Loader2,
  Scissors,
  Zap,
  ShieldAlert,
  Wifi,
  WifiOff,
  ShoppingCart,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronDown,
  TriangleAlert,
  DollarSign,
  CalendarDays,
  Target,
  Link2,
  X,
  Building2,
} from "lucide-react";
import type { PortfolioInsight } from "@/app/api/ai/portfolio-insights/route";
import type { TLHSuggestion } from "@/app/api/ai/tax-loss-harvesting/route";
import type {
  AlpacaAccount,
  AlpacaPosition,
  AlpacaOrder,
  PerformancePoint,
  AlpacaAsset,
  PlaceOrderInput,
} from "@/lib/types";
import {
  getInvestmentAccountsByWorkspace,
  getHoldingsByAccount,
  getTotalInvestmentBalance,
  ACCOUNT_TYPE_LABELS,
  getInvestmentTransactionsByAccount,
  getDividendSummary,
  getDividendHistory,
  getDividendYields,
} from "@/lib/services/investments";
import type { DividendSummary, DividendRecord, DividendYield } from "@/lib/services/investments";
import { analyzeTaxLossHarvesting } from "@/lib/services/tlh";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import { formatCurrency, formatDate } from "@/lib/utils";
import PlanGate from "@/components/PlanGate";
import type { SavingsGoal } from "@/lib/types";
import { BarChart, Bar } from "recharts";
import { notifyAiUsageUpdated } from "@/lib/aiUsageRefresh";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";

// ── Static mock performance history (fallback) ───────────────────────────────
const MOCK_PERFORMANCE_HISTORY = [
  { date: "2025-10-01T00:00:00.000Z", value: 58200, percentReturn: 0 },
  { date: "2025-11-01T00:00:00.000Z", value: 61400, percentReturn: 5.5 },
  { date: "2025-12-01T00:00:00.000Z", value: 59800, percentReturn: 2.75 },
  { date: "2026-01-01T00:00:00.000Z", value: 63500, percentReturn: 9.1 },
  { date: "2026-02-01T00:00:00.000Z", value: 66100, percentReturn: 13.6 },
  { date: "2026-03-01T00:00:00.000Z", value: 68740, percentReturn: 18.1 },
  { date: "2026-04-01T00:00:00.000Z", value: 70471, percentReturn: 21.1 },
];

const ALLOCATION_COLORS: Record<string, string> = {
  equity: "#3B82F6",
  etf: "#10B981",
  mutual_fund: "#8B5CF6",
  fixed_income: "#F59E0B",
  cash: "#6B7280",
  other: "#EC4899",
  us_equity: "#3B82F6",
  crypto: "#F97316",
};

const ALLOCATION_LABELS: Record<string, string> = {
  equity: "Equities",
  etf: "ETFs",
  mutual_fund: "Mutual Funds",
  fixed_income: "Fixed Income",
  cash: "Cash",
  other: "Other",
  us_equity: "US Equities",
  crypto: "Crypto",
};

const SEVERITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};
const SEVERITY_COLOR: Record<string, string> = {
  warning: "text-amber-400 border-amber-400/20 bg-amber-400/5",
  success: "text-green-400 border-green-400/20 bg-green-400/5",
  info: "text-blue-400 border-blue-400/20 bg-blue-400/5",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  filled: "text-green-400 bg-green-400/10",
  partially_filled: "text-blue-400 bg-blue-400/10",
  new: "text-yellow-400 bg-yellow-400/10",
  accepted: "text-yellow-400 bg-yellow-400/10",
  pending_new: "text-yellow-400 bg-yellow-400/10",
  canceled: "text-slate-500 bg-slate-500/10",
  rejected: "text-red-400 bg-red-400/10",
  expired: "text-slate-500 bg-slate-500/10",
};

type Period = "1D" | "1W" | "1M" | "3M" | "6M" | "1A";
const PERIODS: { label: string; value: Period }[] = [
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "1Y", value: "1A" },
];

// ─── Order placement panel ─────────────────────────────────────────────────

function OrderPanel({ onOrderPlaced }: { onOrderPlaced: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [tif, setTif] = useState<"day" | "gtc">("day");
  const [assets, setAssets] = useState<AlpacaAsset[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [assetSearchCooldownSeconds, setAssetSearchCooldownSeconds] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search assets
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!assetSearch.trim()) {
      setAssets([]);
      setShowDropdown(false);
      return;
    }
    if (assetSearchCooldownSeconds > 0) {
      setAssets([]);
      setShowDropdown(false);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/alpaca/assets?q=${encodeURIComponent(assetSearch)}`);
        const retryAfterRaw = res.headers.get("Retry-After");
        const retryAfter = Number.parseInt(retryAfterRaw ?? "", 10);
        const data = await res.json().catch(() => ({} as { assets?: AlpacaAsset[]; error?: string }));

        if (res.status === 429) {
          const cooldown =
            Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 120) : 10;
          setAssetSearchCooldownSeconds(cooldown);
          setAssets([]);
          setShowDropdown(false);
          return;
        }

        setAssets(data.assets ?? []);
        setShowDropdown(true);
      } catch {
        setAssets([]);
        setShowDropdown(false);
      }
    }, 350);
  }, [assetSearch, assetSearchCooldownSeconds]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timeout = setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [cooldownSeconds]);

  useEffect(() => {
    if (assetSearchCooldownSeconds <= 0) return;
    const timeout = setTimeout(() => {
      setAssetSearchCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [assetSearchCooldownSeconds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    setSubmitting(true);
    setResult(null);
    try {
      const body: PlaceOrderInput = {
        symbol: symbol.toUpperCase(),
        qty: parseFloat(qty),
        side,
        type: orderType,
        timeInForce: tif,
        ...(orderType === "limit" && limitPrice ? { limitPrice: parseFloat(limitPrice) } : {}),
      };
      const res = await fetch("/api/alpaca/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const retryAfterRaw = res.headers.get("Retry-After");
      const retryAfter = Number.parseInt(retryAfterRaw ?? "", 10);
      const data = await res.json().catch(() => ({} as { error?: string; order?: { orderId: string } }));

      if (res.status === 429) {
        const cooldown = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 300) : 15;
        setCooldownSeconds(cooldown);
        setResult({
          ok: false,
          message:
            data.error ??
            `Too many order attempts. Please wait ${cooldown} seconds before trying again.`,
        });
        return;
      }

      if (res.ok && data.order) {
        setResult({ ok: true, message: `Order submitted: ${data.order.orderId.slice(0, 8)}…` });
        setSymbol(""); setQty(""); setLimitPrice(""); setAssetSearch("");
        onOrderPlaced();
      } else {
        setResult({ ok: false, message: data.error ?? "Order failed" });
      }
    } catch {
      setResult({ ok: false, message: "Network error placing order" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
      <div className="px-6 py-4 border-b border-arcana-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Place Order</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            Paper Trading
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Buy / Sell Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-arcana-border">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`flex-1 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                side === s
                  ? s === "buy"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Symbol search */}
        <div className="relative">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Symbol</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={symbol || assetSearch}
              onChange={(e) => {
                setAssetSearch(e.target.value);
                setSymbol("");
              }}
              placeholder="AAPL, TSLA, MSFT…"
              className="w-full pl-9 pr-3 py-2.5 bg-arcana-navy border border-arcana-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary"
              required
            />
          </div>
          {assetSearchCooldownSeconds > 0 && (
            <p className="mt-1 text-[10px] text-yellow-400">
              Symbol lookup is rate-limited. Retrying in {assetSearchCooldownSeconds}s.
            </p>
          )}
          {showDropdown && assets.length > 0 && !symbol && (
            <div className="absolute z-20 w-full mt-1 bg-arcana-navy border border-arcana-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { setSymbol(a.symbol); setAssetSearch(a.symbol); setShowDropdown(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-arcana-surface flex items-center justify-between group"
                >
                  <span className="font-mono font-bold text-sm text-white">{a.symbol}</span>
                  <span className="text-xs text-slate-400 truncate max-w-[160px]">{a.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Qty */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Shares</label>
            <input
              type="number"
              min="0.001"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 bg-arcana-navy border border-arcana-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Order type */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Order Type</label>
            <div className="relative">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as "market" | "limit")}
                className="w-full appearance-none px-3 py-2.5 bg-arcana-navy border border-arcana-border rounded-lg text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Limit price (conditional) */}
        {orderType === "limit" && (
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Limit Price ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 bg-arcana-navy border border-arcana-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary"
              required
            />
          </div>
        )}

        {/* Time in force */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">Time in Force</label>
          <div className="flex gap-2">
            {(["day", "gtc"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTif(t)}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border transition-colors ${
                  tif === t
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-arcana-border text-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "day" ? "Day" : "GTC"}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || cooldownSeconds > 0 || !symbol || !qty}
          className={`w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            side === "buy"
              ? "bg-green-500 hover:bg-green-400 text-white"
              : "bg-red-500 hover:bg-red-400 text-white"
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
            </span>
          ) : cooldownSeconds > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" /> Retry in {cooldownSeconds}s
            </span>
          ) : (
            `${side.toUpperCase()} ${symbol || "—"}`
          )}
        </button>

        {/* Result feedback */}
        {result && (
          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${result.ok ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
            {result.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
            {result.message}
          </div>
        )}

        <p className="text-[10px] text-slate-600 leading-relaxed">
          ⚠ Paper trading only. No real money is used. Orders execute against simulated market conditions.
        </p>
      </form>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  // ── Mock data (fallback) ──
  const mockAccounts = getInvestmentAccountsByWorkspace(DEFAULT_WORKSPACE_ID);
  const mockTotalValue = getTotalInvestmentBalance(DEFAULT_WORKSPACE_ID);
  const mockAllHoldings = useMemo(
    () => mockAccounts.flatMap((a) => getHoldingsByAccount(a.investmentAccountId)),
    [mockAccounts]
  );

  // ── Alpaca live state ──
  const [alpacaAccount, setAlpacaAccount] = useState<AlpacaAccount | null>(null);
  const [alpacaPositions, setAlpacaPositions] = useState<AlpacaPosition[]>([]);
  const [alpacaOrders, setAlpacaOrders] = useState<AlpacaOrder[]>([]);
  const [perfHistory, setPerfHistory] = useState<PerformancePoint[]>([]);
  const [alpacaConfigured, setAlpacaConfigured] = useState<boolean | null>(null);
  const [alpacaLoading, setAlpacaLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("1M");
  const [periodLoading, setPeriodLoading] = useState(false);

  const fetchAlpacaData = useCallback(async (period: Period = "1M") => {
    setAlpacaLoading(true);
    try {
      const [acctRes, posRes, ordRes] = await Promise.allSettled([
        fetch("/api/alpaca/account").then((r) => r.json()),
        fetch("/api/alpaca/positions").then((r) => r.json()),
        fetch("/api/alpaca/orders?status=all&limit=50").then((r) => r.json()),
      ]);

      const acctData = acctRes.status === "fulfilled" ? acctRes.value : null;
      const posData  = posRes.status  === "fulfilled" ? posRes.value  : null;
      const ordData  = ordRes.status  === "fulfilled" ? ordRes.value  : null;

      const configured = acctData?.configured ?? false;
      setAlpacaConfigured(configured);

      if (configured) {
        if (acctData?.account) setAlpacaAccount(acctData.account);
        if (posData?.positions) setAlpacaPositions(posData.positions);
        if (ordData?.orders) setAlpacaOrders(ordData.orders);
      }
    } catch {
      setAlpacaConfigured(false);
    } finally {
      setAlpacaLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (period: Period) => {
    setPeriodLoading(true);
    try {
      const res = await fetch(`/api/alpaca/portfolio-history?period=${period}`);
      const data = await res.json();
      if (data.configured && data.history?.length > 0) {
        setPerfHistory(data.history);
      } else {
        setPerfHistory(MOCK_PERFORMANCE_HISTORY);
      }
    } catch {
      setPerfHistory(MOCK_PERFORMANCE_HISTORY);
    } finally {
      setPeriodLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlpacaData(); }, [fetchAlpacaData]);
  useEffect(() => { fetchHistory(selectedPeriod); }, [fetchHistory, selectedPeriod]);

  // ── Derived values ──
  const isLive = alpacaConfigured === true;
  const totalValue = isLive && alpacaAccount
    ? alpacaAccount.portfolioValue
    : mockTotalValue;

  // Allocation from Alpaca positions or mock holdings
  const allocationData = useMemo(() => {
    if (isLive && alpacaPositions.length > 0) {
      const map = new Map<string, number>();
      for (const p of alpacaPositions) {
        const type = p.assetClass === "crypto" ? "crypto" : "us_equity";
        map.set(type, (map.get(type) ?? 0) + p.marketValue);
      }
      const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
      return Array.from(map.entries()).map(([type, value]) => ({
        name: ALLOCATION_LABELS[type] ?? type,
        value,
        type,
        pct: total > 0 ? (value / total) * 100 : 0,
      }));
    }
    // mock fallback
    const map = new Map<string, number>();
    for (const h of mockAllHoldings) {
      const type = h.security.type ?? "other";
      map.set(type, (map.get(type) ?? 0) + h.institutionValue);
    }
    return Array.from(map.entries()).map(([type, value]) => ({
      name: ALLOCATION_LABELS[type] ?? type,
      value,
      type,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));
  }, [isLive, alpacaPositions, mockAllHoldings, totalValue]);

  // Performance metrics from chart data
  const perfCurrent = perfHistory[perfHistory.length - 1]?.value ?? 0;
  const perfPrev = perfHistory[perfHistory.length - 2]?.value ?? 0;
  const perfChange = perfCurrent - perfPrev;
  const perfChangePct = perfPrev > 0 ? (perfChange / perfPrev) * 100 : 0;

  // AI insights — mock accounts always passed for consistency
  const [insights, setInsights] = useState<PortfolioInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);
  const [insightsLastAnalysisAt, setInsightsLastAnalysisAt] = useState<string | null>(null);

  const fetchInsights = useCallback(async (force = false) => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/ai/portfolio-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: mockAllHoldings,
          accounts: mockAccounts,
          totalValue,
          force,
        }),
      });
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
        setInsightsLastAnalysisAt(data.lastAnalysisAt ?? null);
        notifyAiUsageUpdated();
      }
    } catch { /* non-critical */ }
    finally { setInsightsLoading(false); setInsightsFetched(true); }
  }, [mockAllHoldings, mockAccounts, totalValue]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // TLH — mock data
  const allTransactions = useMemo(
    () => mockAccounts.flatMap((a) => getInvestmentTransactionsByAccount(a.investmentAccountId)),
    [mockAccounts]
  );
  const tlhSummary = useMemo(
    () => analyzeTaxLossHarvesting(mockAllHoldings, allTransactions),
    [mockAllHoldings, allTransactions]
  );
  const [tlhSuggestions, setTlhSuggestions] = useState<TLHSuggestion[]>([]);
  const [tlhLoading, setTlhLoading] = useState(false);
  const [tlhFetched, setTlhFetched] = useState(false);
  const [tlhLastAnalysisAt, setTlhLastAnalysisAt] = useState<string | null>(null);
  const fetchTlhSuggestions = useCallback(async (force = false) => {
    if (tlhSummary.opportunities.length === 0) { setTlhFetched(true); return; }
    setTlhLoading(true);
    try {
      const res = await fetch("/api/ai/tax-loss-harvesting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: tlhSummary,
          force,
        }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setTlhSuggestions(data.suggestions);
        setTlhLastAnalysisAt(data.lastAnalysisAt ?? null);
        notifyAiUsageUpdated();
      }
    } catch { /* non-critical */ }
    finally { setTlhLoading(false); setTlhFetched(true); }
  }, [tlhSummary]);
  useEffect(() => { fetchTlhSuggestions(); }, [fetchTlhSuggestions]);

  // ── Dividend data (derived from mock service) ──
  const dividendSummary: DividendSummary = useMemo(
    () => getDividendSummary(DEFAULT_WORKSPACE_ID),
    []
  );
  const dividendHistory: DividendRecord[] = useMemo(
    () => getDividendHistory(DEFAULT_WORKSPACE_ID).slice(0, 20),
    []
  );
  const dividendYields: DividendYield[] = useMemo(
    () => getDividendYields(DEFAULT_WORKSPACE_ID),
    []
  );

  // ── Goals ──
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .catch(() => setGoals([]))
      .finally(() => setGoalsLoading(false));
  }, []);

  // ── Plaid Investment Linking ──
  const [linkingInvestment, setLinkingInvestment] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  async function handleLinkInvestmentAccount() {
    setLinkingInvestment(true);
    setLinkSuccess(null);
    try {
      // Create link token
      const tokenRes = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const tokenData = await tokenRes.json();
      if (!tokenData.linkToken) throw new Error("Failed to create link token");

      // Load and open Plaid Link
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Plaid Link"));
        document.head.appendChild(script);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Plaid = (window as any).Plaid;
      if (!Plaid) throw new Error("Plaid Link not available");

      await new Promise<void>((resolve, reject) => {
        const handler = Plaid.create({
          token: tokenData.linkToken,
          onSuccess: async (publicToken: string) => {
            try {
              const exchRes = await fetch("/api/plaid/exchange-investment-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicToken }),
              });
              const exchData = await exchRes.json();
              if (!exchRes.ok) throw new Error(exchData.error ?? "Exchange failed");
              setLinkSuccess(exchData.message ?? "Investment account linked successfully");
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          onExit: () => resolve(),
          onError: (err: Error) => reject(err),
        });
        handler.open();
      });
    } catch (err) {
      console.error("Plaid investment link error:", err);
    } finally {
      setLinkingInvestment(false);
    }
  }

  // Chart formatter
  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return selectedPeriod === "1D"
      ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : formatDate(iso, { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Investment accounts, holdings, and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLinkInvestmentAccount}
            disabled={linkingInvestment}
            className="flex items-center gap-1.5 text-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {linkingInvestment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
            Link Brokerage Account
          </button>
          <button
            onClick={() => fetchAlpacaData(selectedPeriod)}
            disabled={alpacaLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {alpacaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Plaid Link Success Banner */}
      {linkSuccess && (
        <div className="rounded-xl bg-green-400/5 border border-green-400/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-sm text-green-400">{linkSuccess}</p>
          </div>
          <button onClick={() => setLinkSuccess(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Alpaca Connection Banner ───────────────────────────────────── */}
      {alpacaConfigured === null ? (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          <span className="text-sm text-slate-400">Checking Alpaca connection…</span>
        </div>
      ) : alpacaConfigured ? (
        <div className="rounded-xl bg-green-400/5 border border-green-400/20 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Wifi className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-400">Connected — Alpaca Paper Trading</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Live account data · Holdings and orders update in real-time
              </p>
            </div>
          </div>
          {alpacaAccount && (
            <div className="flex items-center gap-6 text-right">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Day P&L</p>
                <p className={`text-sm font-bold tabular-nums ${alpacaAccount.dayPLAmount >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {alpacaAccount.dayPLAmount >= 0 ? "+" : ""}{formatCurrency(alpacaAccount.dayPLAmount)}
                  <span className="text-xs ml-1">({alpacaAccount.dayPLPercent.toFixed(2)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Buying Power</p>
                <p className="text-sm font-bold text-white tabular-nums">{formatCurrency(alpacaAccount.buyingPower)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Cash</p>
                <p className="text-sm font-bold text-white tabular-nums">{formatCurrency(alpacaAccount.cash)}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5 flex items-start gap-4">
          <WifiOff className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-300 mb-1">Connect Alpaca Paper Trading</p>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Add your Alpaca paper trading API keys to see live positions, place paper orders, and track real portfolio performance.
            </p>
            <div className="text-xs text-slate-500 space-y-1 font-mono bg-arcana-navy rounded-lg px-4 py-3">
              <div><span className="text-primary">ALPACA_API_KEY</span>=your_paper_key_id</div>
              <div><span className="text-primary">ALPACA_API_SECRET</span>=your_paper_secret_key</div>
              <div><span className="text-primary">ALPACA_ENV</span>=paper</div>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Get free keys at{" "}
              <a href="https://alpaca.markets" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                alpaca.markets
              </a>
              . Showing demo data below.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Total Portfolio Value</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          {isLive && alpacaAccount && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${alpacaAccount.dayPLAmount >= 0 ? "text-green-400" : "text-red-400"}`}>
              {alpacaAccount.dayPLAmount >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {alpacaAccount.dayPLAmount >= 0 ? "+" : ""}{formatCurrency(alpacaAccount.dayPLAmount)} today
            </p>
          )}
        </div>

        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
            {isLive ? "Total Return" : "Unrealized Gain/Loss"}
          </p>
          {isLive && alpacaAccount ? (
            <>
              <p className={`text-2xl font-bold ${alpacaAccount.totalPLAmount >= 0 ? "text-green-400" : "text-red-400"}`}>
                {alpacaAccount.totalPLAmount >= 0 ? "+" : ""}{alpacaAccount.totalPLPercent.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">{formatCurrency(alpacaAccount.totalPLAmount)} all time</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-green-400">+21.1%</p>
              <p className="text-xs text-slate-500 mt-1">Demo data</p>
            </>
          )}
        </div>

        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Period Change</p>
          <p className={`text-2xl font-bold ${perfChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {perfChange >= 0 ? "+" : ""}{formatCurrency(perfChange)}
          </p>
          <p className={`text-xs mt-1 flex items-center gap-1 ${perfChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {perfChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {perfChangePct >= 0 ? "+" : ""}{perfChangePct.toFixed(2)}% this period
          </p>
        </div>
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance chart */}
        <div className="lg:col-span-2 rounded-xl bg-arcana-surface border border-arcana-border p-6">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-arcana-sky" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Portfolio Performance</h2>
              {!isLive && <span className="text-[10px] text-slate-500 font-medium">(demo)</span>}
            </div>
            {/* Period tabs */}
            <div className="flex gap-1 bg-arcana-navy rounded-lg p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setSelectedPeriod(p.value); fetchHistory(p.value); }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    selectedPeriod === p.value
                      ? "bg-primary/20 text-primary"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {periodLoading ? (
            <div className="flex items-center justify-center h-[220px]">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={perfHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtDate}
                  interval="preserveStartEnd"
                />
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
                  labelFormatter={(v) => fmtDate(v as string)}
                  formatter={(v, name) => [
                    name === "value" ? formatCurrency(Number(v)) : `${Number(v).toFixed(2)}%`,
                    name === "value" ? "Value" : "Return",
                  ]}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#perfGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
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

      {/* ── Live Holdings (Alpaca positions) or Mock Holdings ─────────── */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="px-6 py-4 border-b border-arcana-border flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            {isLive ? "Open Positions" : "Holdings"}
          </h2>
          {isLive && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
              Live
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          {isLive ? (
            alpacaPositions.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500 text-sm">
                No open positions yet. Place a paper trade to get started.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-arcana-border">
                    {["Symbol", "Qty", "Entry Price", "Current", "Market Value", "Day P&L", "Total P&L", "Return"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-arcana-border">
                  {alpacaPositions.map((p) => (
                    <tr key={p.symbol} className="hover:bg-arcana-navy/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">{p.symbol}</td>
                      <td className="px-6 py-4 text-slate-300 text-right tabular-nums">{p.qty}</td>
                      <td className="px-6 py-4 text-slate-400 text-right tabular-nums">{formatCurrency(p.avgEntryPrice)}</td>
                      <td className="px-6 py-4 text-white font-medium text-right tabular-nums">{formatCurrency(p.currentPrice)}</td>
                      <td className="px-6 py-4 text-white font-medium text-right tabular-nums">{formatCurrency(p.marketValue)}</td>
                      <td className={`px-6 py-4 text-right tabular-nums ${p.unrealizedIntradayPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {p.unrealizedIntradayPL >= 0 ? "+" : ""}{formatCurrency(p.unrealizedIntradayPL)}
                      </td>
                      <td className={`px-6 py-4 text-right tabular-nums font-medium ${p.unrealizedPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {p.unrealizedPL >= 0 ? "+" : ""}{formatCurrency(p.unrealizedPL)}
                      </td>
                      <td className={`px-6 py-4 text-right tabular-nums text-xs ${p.unrealizedPLPC >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {p.unrealizedPLPC >= 0 ? "+" : ""}{p.unrealizedPLPC.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            // Mock holdings table (original)
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-arcana-border">
                  {["Ticker", "Name", "Account", "Qty", "Value", "Cost Basis", "Gain / Loss", "Return"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-arcana-border">
                {mockAllHoldings.map((h) => {
                  const gainLoss = h.unrealizedGainLoss ?? 0;
                  const gainPct = h.unrealizedGainLossPct ?? 0;
                  const up = gainLoss >= 0;
                  const account = mockAccounts.find((a) => a.investmentAccountId === h.investmentAccountId);
                  return (
                    <tr key={h.holdingId} className="hover:bg-arcana-navy/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-200 whitespace-nowrap">{h.security.ticker ?? "—"}</td>
                      <td className="px-6 py-4 text-slate-300 max-w-[160px] truncate">{h.security.name}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-xs">
                        {account ? `${ACCOUNT_TYPE_LABELS[account.accountType]} ···${account.displayMask}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-right tabular-nums">{h.quantity}</td>
                      <td className="px-6 py-4 text-white font-medium text-right tabular-nums">{formatCurrency(h.institutionValue)}</td>
                      <td className="px-6 py-4 text-slate-400 text-right tabular-nums">{h.costBasis != null ? formatCurrency(h.costBasis) : "—"}</td>
                      <td className={`px-6 py-4 text-right tabular-nums font-medium ${up ? "text-green-400" : "text-red-400"}`}>
                        {up ? "+" : ""}{formatCurrency(gainLoss)}
                      </td>
                      <td className={`px-6 py-4 text-right tabular-nums text-xs ${up ? "text-green-400" : "text-red-400"}`}>
                        {up ? "+" : ""}{gainPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Paper Order Placement (Alpaca only) ─────────────────────────── */}
      {isLive && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrderPanel onOrderPlaced={() => fetchAlpacaData(selectedPeriod)} />

          {/* Order history */}
          <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
            <div className="px-6 py-4 border-b border-arcana-border flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Order History</h2>
            </div>
            <div className="overflow-y-auto max-h-[420px]">
              {alpacaOrders.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-500 text-sm">No orders yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-arcana-surface">
                    <tr className="border-b border-arcana-border">
                      {["Symbol", "Side", "Qty", "Filled @", "Status", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arcana-border">
                    {alpacaOrders.map((o) => (
                      <tr key={o.orderId} className="hover:bg-arcana-navy/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-200 text-xs">{o.symbol}</td>
                        <td className={`px-4 py-3 text-xs font-semibold uppercase ${o.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                          {o.side}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs tabular-nums">{o.filledQty}/{o.qty}</td>
                        <td className="px-4 py-3 text-slate-300 text-xs tabular-nums">
                          {o.filledAvgPrice ? formatCurrency(o.filledAvgPrice) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ORDER_STATUS_COLOR[o.status] ?? "text-slate-500 bg-slate-500/10"}`}>
                            {o.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(o.submittedAt, { month: "short", day: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Insights ─────────────────────────────────────────────────── */}
      <PlanGate required="pro" featureName="AI Portfolio Analysis">
        <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
          <div className="px-6 py-4 border-b border-arcana-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">AI Portfolio Analysis</h2>
            </div>
            <button type="button" onClick={() => void fetchInsights(true)} disabled={insightsLoading} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50">
              {insightsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </button>
          </div>
          <div className="p-6">
            <LastAnalysisStamp
              lastAnalysisAt={insightsLastAnalysisAt}
              className="mb-3 block text-[10px] uppercase tracking-[1.5px] text-slate-500"
            />
            {insightsLoading && !insightsFetched ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing portfolio…
              </div>
            ) : insights.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No insights available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight) => {
                  const Icon = SEVERITY_ICON[insight.severity] ?? Info;
                  const colors = SEVERITY_COLOR[insight.severity] ?? SEVERITY_COLOR.info;
                  return (
                    <div key={insight.id} className={`rounded-lg border p-4 ${colors}`}>
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-semibold">{insight.title}</p>
                            {insight.metric && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/20 shrink-0">{insight.metric}</span>
                            )}
                          </div>
                          <p className="text-xs opacity-80 leading-relaxed">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PlanGate>

      {/* ── Tax-Loss Harvesting ─────────────────────────────────────────── */}
      <PlanGate required="pro" featureName="Tax-Loss Harvesting">
        {(tlhSummary.opportunities.length > 0 || tlhLoading) && (
          <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
            <div className="px-6 py-4 border-b border-arcana-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Tax-Loss Harvesting</h2>
                {tlhSummary.washSaleWarningCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
                    <ShieldAlert className="w-3 h-3" />{tlhSummary.washSaleWarningCount} wash-sale risk
                  </span>
                )}
              </div>
              <button type="button" onClick={() => void fetchTlhSuggestions(true)} disabled={tlhLoading} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                {tlhLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-arcana-border">
              {[
                { label: "Harvestable Loss", value: formatCurrency(tlhSummary.totalHarvestableLoss), color: "text-red-400" },
                { label: "Est. Savings (32%)", value: formatCurrency(tlhSummary.estimatedSavingsShortTerm), color: "text-green-400" },
                { label: "Est. Savings (15%)", value: formatCurrency(tlhSummary.estimatedSavingsLongTerm), color: "text-teal-400" },
                { label: "Unrealized Gains", value: formatCurrency(tlhSummary.totalUnrealizedGains), color: "text-blue-400" },
              ].map((s) => (
                <div key={s.label} className="bg-arcana-surface px-5 py-4">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{s.label}</p>
                  <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="p-6 space-y-4">
              <LastAnalysisStamp
                lastAnalysisAt={tlhLastAnalysisAt}
                className="block text-[10px] uppercase tracking-[1.5px] text-slate-500"
              />
              {tlhSummary.opportunities.map((opp) => (
                <div key={opp.holdingId} className={`rounded-lg border p-4 ${opp.washSaleRisk ? "border-red-400/20 bg-red-400/5" : "border-amber-400/20 bg-amber-400/5"}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {opp.washSaleRisk ? <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" /> : <Scissors className="w-5 h-5 text-amber-400 shrink-0" />}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-white">{opp.ticker}</span>
                          <span className="text-xs text-slate-400">{opp.securityName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${opp.isLongTerm ? "bg-blue-400/10 text-blue-400" : "bg-orange-400/10 text-orange-400"}`}>
                            {opp.isLongTerm ? "Long-term" : "Short-term"} · {opp.holdingPeriodDays}d
                          </span>
                        </div>
                        <p className="text-sm font-bold text-red-400 mt-0.5">
                          {formatCurrency(opp.unrealizedLoss)} ({opp.unrealizedLossPct.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Est. Tax Savings</p>
                      <p className="text-sm font-bold text-green-400">
                        {formatCurrency(opp.isLongTerm ? opp.estimatedTaxSavings.savingsAtLongTerm : opp.estimatedTaxSavings.savingsAtShortTerm)}
                      </p>
                      <p className="text-[10px] text-slate-500">at {opp.isLongTerm ? "15%" : "32%"} rate</p>
                    </div>
                  </div>
                  {opp.washSaleWarning && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-red-300 bg-red-400/10 rounded-lg px-3 py-2">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />{opp.washSaleWarning}
                    </div>
                  )}
                  {opp.suggestedReplacement && !opp.washSaleRisk && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-300 bg-arcana-navy/60 rounded-lg px-3 py-2">
                      <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span><span className="font-semibold text-primary">Replace with {opp.suggestedReplacement.ticker}</span>{" — "}{opp.suggestedReplacement.rationale}</span>
                    </div>
                  )}
                </div>
              ))}

              {(tlhLoading && !tlhFetched) ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating AI suggestions…
                </div>
              ) : tlhSuggestions.length > 0 && (
                <div className="pt-2 border-t border-arcana-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Tax Optimization</span>
                  </div>
                  <div className="space-y-2">
                    {tlhSuggestions.map((s) => {
                      const bc = s.severity === "action" ? "border-green-400/20 bg-green-400/5" : s.severity === "warning" ? "border-amber-400/20 bg-amber-400/5" : "border-blue-400/20 bg-blue-400/5";
                      const tc = s.severity === "action" ? "text-green-400" : s.severity === "warning" ? "text-amber-400" : "text-blue-400";
                      const Icon = s.severity === "action" ? CheckCircle : s.severity === "warning" ? AlertTriangle : Info;
                      return (
                        <div key={s.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${bc}`}>
                          <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${tc}`} />
                          <div>
                            <p className={`text-sm font-semibold ${tc}`}>{s.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.body}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-600 leading-relaxed pt-2">
                ⚠ Tax savings are estimates only. Rates vary by income, filing status, and jurisdiction. Consult a qualified tax professional before executing any tax-loss harvesting strategy.
              </p>
            </div>
          </div>
        )}
      </PlanGate>

      {/* ── Mock Account Breakdown (shown when no Alpaca positions) ─────── */}
      {!isLive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockAccounts.map((acct) => {
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
                    <p className="text-xs text-slate-400 mt-0.5">{ACCOUNT_TYPE_LABELS[acct.accountType]} · ···{acct.displayMask}</p>
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
      )}

      {/* ── Dividend Tracking ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="px-6 py-4 border-b border-arcana-border flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Dividend Income</h2>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-arcana-border">
          {[
            { label: "Received YTD",     value: formatCurrency(dividendSummary.totalReceivedYTD),  color: "text-teal-400" },
            { label: "Received LTM",     value: formatCurrency(dividendSummary.totalReceivedLTM),  color: "text-teal-300" },
            { label: "Projected Annual", value: formatCurrency(dividendSummary.projectedAnnual),    color: "text-white" },
            { label: "Portfolio Yield",  value: `${dividendSummary.portfolioYield.toFixed(2)}%`,   color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-arcana-surface px-5 py-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{s.label}</p>
              <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly bar chart */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-4">Monthly Dividend Income (6-Month)</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dividendSummary.monthlyBreakdown} barSize={20}>
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={40} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [formatCurrency(typeof v === "number" ? v : 0), "Dividends"]}
                />
                <Bar dataKey="amount" fill="#2dd4bf" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By-ticker breakdown */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-4">Income by Position (LTM)</p>
            <div className="space-y-3">
              {dividendSummary.byTicker.map((t) => (
                <div key={t.ticker}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200 w-12">{t.ticker}</span>
                      <span className="text-slate-500 truncate max-w-[120px]">{t.securityName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-400">{t.pct.toFixed(1)}%</span>
                      <span className="font-semibold text-teal-400 tabular-nums">{formatCurrency(t.amount)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-arcana-navy rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dividend yield table */}
        <div className="px-6 pb-6">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Dividend Yield by Holding</p>
          <div className="overflow-x-auto rounded-lg border border-arcana-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-arcana-border">
                  {["Ticker", "Annual Income", "Yield", "Cost Yield", "Frequency", "Next Est. Pmt", "DRIP"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dividendYields.map((y) => (
                  <tr key={y.holdingId} className="border-b border-arcana-border/50 hover:bg-arcana-navy/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{y.ticker}</td>
                    <td className="px-4 py-3 text-teal-400 tabular-nums font-semibold">{formatCurrency(y.annualIncome)}</td>
                    <td className="px-4 py-3 text-green-400 tabular-nums">{y.currentYield.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">{y.yieldOnCost.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{y.frequency}</td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums text-xs">
                      <span>{formatDate(y.nextEstimatedDate, { month: "short", day: "numeric" })}</span>
                      <span className="ml-1 text-teal-500">~{formatCurrency(y.nextEstimatedAmount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {y.isDRIPEnrolled ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400 border border-teal-400/20">DRIP</span>
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

        {/* Recent dividend history */}
        <div className="px-6 pb-6">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Recent Dividends</p>
          <div className="overflow-x-auto rounded-lg border border-arcana-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-arcana-border">
                  {["Date", "Security", "Type", "Amount"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dividendHistory.map((d) => (
                  <tr key={d.investmentTransactionId} className="border-b border-arcana-border/50 hover:bg-arcana-navy/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs tabular-nums">
                      {formatDate(d.date, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-slate-200 text-xs">{d.ticker}</span>
                      <span className="ml-2 text-slate-500 text-xs">{d.securityName}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.isDRIP ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">DRIP</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400 border border-teal-400/20">Cash</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-teal-400 tabular-nums font-semibold">+{formatCurrency(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Goal-Based Investing ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="px-6 py-4 border-b border-arcana-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Investment Goals</h2>
          </div>
          <a
            href="/goals"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors"
          >
            <Link2 className="w-3 h-3" />
            Manage Goals
          </a>
        </div>

        {goalsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading goals…
          </div>
        ) : goals.length === 0 ? (
          <div className="p-8 text-center">
            <Target className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No active goals</p>
            <p className="text-slate-600 text-xs mt-1">Create a savings goal and link it to your investment portfolio to track progress here.</p>
            <a href="/goals" className="inline-flex items-center gap-1.5 mt-4 text-xs bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors">
              <Target className="w-3.5 h-3.5" />
              Create a Goal
            </a>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals
              .filter((g) => g.status === "active")
              .map((goal) => {
                const pct = goal.targetAmount > 0
                  ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                  : 0;
                const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
                const daysLeft = goal.targetDate
                  ? Math.max(
                      Math.ceil(
                        (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      ),
                      0
                    )
                  : null;
                const isOnTrack =
                  goal.monthlyContribution > 0 && daysLeft != null
                    ? goal.monthlyContribution * (daysLeft / 30) >= remaining
                    : null;
                const priorityColor = {
                  high: "text-red-400 border-red-400/20 bg-red-400/5",
                  medium: "text-amber-400 border-amber-400/20 bg-amber-400/5",
                  low: "text-slate-400 border-slate-400/20 bg-slate-400/5",
                }[goal.priority] ?? "text-slate-400 border-slate-400/20 bg-slate-400/5";

                return (
                  <div key={goal.goalId} className="rounded-xl border border-arcana-border bg-arcana-navy/30 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{goal.name}</p>
                        {goal.targetDate && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {formatDate(goal.targetDate, { month: "short", year: "numeric" })}
                            {daysLeft != null && <span>· {daysLeft} days left</span>}
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priorityColor} shrink-0 capitalize`}>
                        {goal.priority}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{formatCurrency(goal.currentAmount)} saved</span>
                        <span className="text-slate-500">of {formatCurrency(goal.targetAmount)}</span>
                      </div>
                      <div className="h-2 bg-arcana-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-400" : pct >= 66 ? "bg-teal-400" : pct >= 33 ? "bg-primary" : "bg-violet-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs mt-1.5">
                        <span className={`font-semibold ${pct >= 100 ? "text-green-400" : "text-violet-400"}`}>
                          {pct.toFixed(1)}% complete
                        </span>
                        {remaining > 0 && (
                          <span className="text-slate-500">{formatCurrency(remaining)} remaining</span>
                        )}
                      </div>
                    </div>

                    {/* On-track indicator + portfolio linkage hint */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-arcana-border/50">
                      {isOnTrack != null ? (
                        <div className={`flex items-center gap-1.5 text-xs ${isOnTrack ? "text-green-400" : "text-amber-400"}`}>
                          {isOnTrack ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {isOnTrack ? "On track" : "Behind schedule"}
                          {goal.monthlyContribution > 0 && (
                            <span className="text-slate-500">· {formatCurrency(goal.monthlyContribution)}/mo</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">No contribution set</span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <DollarSign className="w-3 h-3 text-teal-500" />
                        <span className="text-teal-500 tabular-nums">
                          +{formatCurrency(dividendSummary.projectedAnnual / Math.max(goals.filter(g => g.status === "active").length, 1))}
                        </span>
                        <span>/yr dividends</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {!goalsLoading && goals.filter((g) => g.status === "active").length > 0 && (
          <div className="px-6 pb-5">
            <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-violet-400">Portfolio Dividend Contribution</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Your investment portfolio generates <span className="text-teal-400 font-semibold">{formatCurrency(dividendSummary.projectedAnnual)}</span> in projected annual dividend income
                    ({formatCurrency(dividendSummary.projectedAnnual / 12)}/mo), which can accelerate progress toward your savings goals.
                    Visit <a href="/goals" className="text-primary underline">Goals</a> to adjust contribution amounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
