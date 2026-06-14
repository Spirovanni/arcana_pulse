"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  TrendingUp,
  BarChart2,
  Zap,
  RefreshCw,
  ExternalLink,
  Monitor,
  Star,
  ChevronRight,
  Info,
  Activity,
  Globe,
  Shield,
  DollarSign,
  ArrowUpRight,
  Play,
} from "lucide-react";

// ─── Curated EA catalog ──────────────────────────────────────────────────────

type StrategyCategory =
  | "all"
  | "trend"
  | "mean_reversion"
  | "scalping"
  | "grid"
  | "arbitrage"
  | "news";

interface EA {
  id: string;
  name: string;
  author: string;
  category: StrategyCategory;
  rating: number;
  reviews: number;
  price: number | "free";
  description: string;
  pairs: string[];
  timeframe: string;
  mql5Url: string;
  badges: string[];
  risk: "low" | "medium" | "high";
}

const STRATEGY_CATEGORIES: { value: StrategyCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all",          label: "All Strategies", icon: Bot },
  { value: "trend",        label: "Trend Following", icon: TrendingUp },
  { value: "mean_reversion", label: "Mean Reversion", icon: Activity },
  { value: "scalping",     label: "Scalping",        icon: Zap },
  { value: "grid",         label: "Grid Trading",    icon: BarChart2 },
  { value: "arbitrage",    label: "Arbitrage",       icon: ArrowUpRight },
  { value: "news",         label: "News Trading",    icon: Globe },
];

const RISK_COLORS = {
  low:    "text-green-400 bg-green-400/10 border-green-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  high:   "text-red-400 bg-red-400/10 border-red-400/20",
};

const CURATED_EAS: EA[] = [
  {
    id: "ea-001",
    name: "TrendMaster Pro",
    author: "AlgoTradeGuru",
    category: "trend",
    rating: 4.8,
    reviews: 1243,
    price: 299,
    description: "Multi-timeframe trend-following EA using EMA crossovers, ADX filter, and ATR-based dynamic stops. Trades major forex pairs.",
    pairs: ["EURUSD", "GBPUSD", "USDJPY"],
    timeframe: "H1/H4",
    mql5Url: "https://www.mql5.com/en/market/product/89473",
    badges: ["Best Seller", "Verified"],
    risk: "medium",
  },
  {
    id: "ea-002",
    name: "Grid King EA",
    author: "GridTrader",
    category: "grid",
    rating: 4.6,
    reviews: 892,
    price: 199,
    description: "Intelligent grid system with automatic lot sizing, hedge capability, and drawdown recovery. Works in ranging markets.",
    pairs: ["EURUSD", "XAUUSD"],
    timeframe: "M15/H1",
    mql5Url: "https://www.mql5.com/en/market/product/58392",
    badges: ["Top Rated"],
    risk: "high",
  },
  {
    id: "ea-003",
    name: "Night Owl Scalper",
    author: "ScalpMaster",
    category: "scalping",
    rating: 4.7,
    reviews: 2140,
    price: 499,
    description: "Low-risk scalper that trades during the quiet Asian session. Uses spread filters and volatility detection to avoid bad entries.",
    pairs: ["EURUSD", "AUDCAD", "NZDUSD"],
    timeframe: "M5",
    mql5Url: "https://www.mql5.com/en/market/product/72845",
    badges: ["Best Seller", "Low Risk"],
    risk: "low",
  },
  {
    id: "ea-004",
    name: "Mean Machine RSI",
    author: "QuantDev",
    category: "mean_reversion",
    rating: 4.4,
    reviews: 567,
    price: 149,
    description: "Mean-reversion EA based on RSI extremes with Bollinger Band confirmation. Trades overbought/oversold conditions on H1.",
    pairs: ["EURUSD", "GBPJPY", "USDCHF"],
    timeframe: "H1",
    mql5Url: "https://www.mql5.com/en/market/product/91203",
    badges: ["Verified"],
    risk: "medium",
  },
  {
    id: "ea-005",
    name: "News Spike Hunter",
    author: "FundamentalFX",
    category: "news",
    rating: 4.3,
    reviews: 389,
    price: 249,
    description: "Trades high-impact news events. Places pending orders before release and cancels after a configurable time window.",
    pairs: ["EURUSD", "GBPUSD", "USDJPY"],
    timeframe: "M1",
    mql5Url: "https://www.mql5.com/en/market/product/84712",
    badges: ["News Driven"],
    risk: "high",
  },
  {
    id: "ea-006",
    name: "Triangular Arb Pro",
    author: "ArbitrageQuant",
    category: "arbitrage",
    rating: 4.9,
    reviews: 234,
    price: 899,
    description: "Exploits triangular arbitrage opportunities across currency pairs. Requires a broker with ultra-low latency and tight spreads.",
    pairs: ["EURUSD", "GBPUSD", "EURGBP"],
    timeframe: "M1",
    mql5Url: "https://www.mql5.com/en/market/product/77230",
    badges: ["Pro", "Low Risk"],
    risk: "low",
  },
  {
    id: "ea-007",
    name: "MACD Divergence EA",
    author: "DivergenceTrader",
    category: "trend",
    rating: 4.2,
    reviews: 741,
    price: "free",
    description: "Free open-source EA that trades MACD histogram divergences. Great starting point for learning EA mechanics.",
    pairs: ["Any"],
    timeframe: "H4/D1",
    mql5Url: "https://www.mql5.com/en/market/product/55819",
    badges: ["Free", "Open Source"],
    risk: "medium",
  },
  {
    id: "ea-008",
    name: "Bollinger Bounce",
    author: "BBTrader",
    category: "mean_reversion",
    rating: 4.5,
    reviews: 1012,
    price: 79,
    description: "Trades Bollinger Band bounces with RSI confirmation and fixed risk per trade. Simple, transparent logic. Great for beginners.",
    pairs: ["EURUSD", "USDCAD"],
    timeframe: "H1",
    mql5Url: "https://www.mql5.com/en/market/product/63481",
    badges: ["Beginner Friendly"],
    risk: "low",
  },
  {
    id: "ea-009",
    name: "Fractal Grid Trader",
    author: "FractalSys",
    category: "grid",
    rating: 4.1,
    reviews: 453,
    price: 129,
    description: "Uses fractal levels to place grid entries. More selective than pure grid systems — only opens positions near key price structures.",
    pairs: ["EURUSD", "GBPUSD", "AUDUSD"],
    timeframe: "M30",
    mql5Url: "https://www.mql5.com/en/market/product/81020",
    badges: [],
    risk: "high",
  },
  {
    id: "ea-010",
    name: "London Breakout EA",
    author: "SessionTrader",
    category: "scalping",
    rating: 4.6,
    reviews: 1888,
    price: 199,
    description: "Trades the London session open breakout using overnight range. Simple session-based strategy with clear stop and target logic.",
    pairs: ["GBPUSD", "EURUSD"],
    timeframe: "H1",
    mql5Url: "https://www.mql5.com/en/market/product/70022",
    badges: ["Top Rated", "Best Seller"],
    risk: "medium",
  },
  {
    id: "ea-011",
    name: "SMC Order Block EA",
    author: "SmartMoneyConcepts",
    category: "trend",
    rating: 4.7,
    reviews: 3210,
    price: 399,
    description: "Institutional order block detection using Smart Money Concepts. Trades Break of Structure confirmations with liquidity sweeps.",
    pairs: ["EURUSD", "NAS100", "XAUUSD"],
    timeframe: "M15/H1",
    mql5Url: "https://www.mql5.com/en/market/product/95112",
    badges: ["Best Seller", "Institutional"],
    risk: "medium",
  },
  {
    id: "ea-012",
    name: "Free Trend Catcher",
    author: "OpenSource_FX",
    category: "trend",
    rating: 4.0,
    reviews: 2890,
    price: "free",
    description: "Community favourite free EA. Uses a simple trend-following approach with trailing stop. Ideal for learning and backtesting.",
    pairs: ["Any"],
    timeframe: "H4",
    mql5Url: "https://www.mql5.com/en/market/product/43210",
    badges: ["Free", "Community Favourite"],
    risk: "low",
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-slate-600"}`}
        />
      ))}
    </div>
  );
}

function EACard({ ea }: { ea: EA }) {
  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-5 flex flex-col gap-4 hover:border-primary/40 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-bold text-white truncate">{ea.name}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${RISK_COLORS[ea.risk]}`}>
              {ea.risk} risk
            </span>
          </div>
          <p className="text-xs text-slate-500">by {ea.author}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">
            {ea.price === "free" ? (
              <span className="text-green-400">Free</span>
            ) : (
              `$${ea.price}`
            )}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{ea.description}</p>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span>📊 {ea.timeframe}</span>
        <span>💱 {ea.pairs.slice(0, 2).join(", ")}{ea.pairs.length > 2 ? ` +${ea.pairs.length - 2}` : ""}</span>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2">
        <StarRating rating={ea.rating} />
        <span className="text-xs text-slate-400">{ea.rating.toFixed(1)} ({ea.reviews.toLocaleString()} reviews)</span>
      </div>

      {/* Badges */}
      {ea.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ea.badges.map((b) => (
            <span key={b} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {b}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <a
        href={ea.mql5Url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors group-hover:border-primary/50"
      >
        View on MQL5 Market
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ─── MT5 WebTerminal Panel ────────────────────────────────────────────────────

function MT5Panel() {
  const [brokerServer, setBrokerServer] = useState("");
  const [activeServer, setActiveServer] = useState("");
  const [expanded, setExpanded] = useState(false);

  const popularBrokers = [
    { name: "IC Markets", server: "ICMarkets-Demo" },
    { name: "Pepperstone", server: "Pepperstone-Demo" },
    { name: "Fusion Markets", server: "FusionMarkets-Demo" },
    { name: "FXCM", server: "FXCM-USDDemo01" },
  ];

  function launchTerminal() {
    if (!brokerServer.trim()) return;
    setActiveServer(brokerServer.trim());
    setExpanded(true);
  }

  const terminalUrl = activeServer
    ? `https://trade.mql5.com/trade?servers=${encodeURIComponent(activeServer)}&lang=en&login=demo`
    : "";

  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
      <div className="px-6 py-4 border-b border-arcana-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">MT5 WebTerminal</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">
            Beta
          </span>
        </div>
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-slate-500 hover:text-white transition-colors"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-6">
        {!expanded ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-400/5 border border-blue-400/20">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Trade EAs directly in your browser using the MetaTrader 5 WebTerminal. Enter your broker&apos;s
                MT5 demo server name below to connect. Your EAs purchased from MQL5 Market will be available
                once you log in with your MT5 credentials.
              </p>
            </div>

            {/* Quick-select popular brokers */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Quick Select — Popular Demo Servers</p>
              <div className="grid grid-cols-2 gap-2">
                {popularBrokers.map((b) => (
                  <button
                    key={b.server}
                    onClick={() => setBrokerServer(b.server)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                      brokerServer === b.server
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-arcana-border text-slate-400 hover:text-white hover:border-slate-500"
                    }`}
                  >
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{b.server}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom server input */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 block">
                Broker Server Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brokerServer}
                  onChange={(e) => setBrokerServer(e.target.value)}
                  placeholder="e.g. ICMarkets-Demo"
                  className="flex-1 px-3 py-2.5 bg-arcana-navy border border-arcana-border rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && launchTerminal()}
                />
                <button
                  onClick={launchTerminal}
                  disabled={!brokerServer.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5" />
                  Launch
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5">
                Find your server name in your broker&apos;s MT5 client under File → Open an Account.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected to {activeServer}
            </div>
            <div className="rounded-lg overflow-hidden border border-arcana-border bg-arcana-navy">
              <iframe
                src={terminalUrl}
                width="100%"
                height="600"
                className="block"
                title="MetaTrader 5 WebTerminal"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              ⚠ The MT5 WebTerminal requires an active MT5 account with your broker. Trading activity in the
              terminal is real unless you use a demo account. Arcana Pulse is not responsible for any trades
              executed through the terminal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Performance Stats (from Alpaca orders) ───────────────────────────────────

interface PaperStats {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  avgGainPct: number;
}

function PaperPerformance() {
  const [stats, setStats] = useState<PaperStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [acctRes, ordRes] = await Promise.allSettled([
        fetch("/api/alpaca/account").then((r) => r.json()),
        fetch("/api/alpaca/orders?status=all&limit=200").then((r) => r.json()),
      ]);

      const acct = acctRes.status === "fulfilled" ? acctRes.value : null;
      const ord  = ordRes.status  === "fulfilled" ? ordRes.value  : null;

      if (!acct?.configured) { setConfigured(false); return; }
      setConfigured(true);

      const orders: Array<{ status: string; side: string; filledAvgPrice: number | null; qty: number }> =
        ord?.orders ?? [];
      const filled = orders.filter((o) => o.status === "filled");
      const buys   = filled.filter((o) => o.side === "buy");
      const sells  = filled.filter((o) => o.side === "sell");

      // Simple P&L approximation from closed pairs
      const gains = sells.map((s) => {
        const match = buys.find((b) => b.status === "filled");
        if (!match || !s.filledAvgPrice || !match.filledAvgPrice) return 0;
        return ((s.filledAvgPrice - match.filledAvgPrice) / match.filledAvgPrice) * 100;
      });

      const winners = gains.filter((g) => g > 0).length;
      const winRate = gains.length > 0 ? (winners / gains.length) * 100 : 0;
      const avgGain = gains.length > 0 ? gains.reduce((s, g) => s + g, 0) / gains.length : 0;

      const acctData = acct.account;
      const totalReturn = acctData
        ? ((acctData.portfolioValue - 100000) / 100000) * 100 // paper starts at $100k
        : 0;

      setStats({
        totalTrades: filled.length,
        winRate,
        totalReturn,
        avgGainPct: avgGain,
      });
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (!configured && !loading) {
    return (
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Connect your Alpaca paper trading account on the{" "}
          <a href="/portfolio" className="text-primary underline hover:text-primary/80">Portfolio page</a>{" "}
          to see real paper-trading performance stats here.
        </p>
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: "Total Paper Trades", value: stats.totalTrades.toString(), color: "text-white" },
        { label: "Win Rate", value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? "text-green-400" : "text-red-400" },
        { label: "Portfolio Return", value: `${stats.totalReturn >= 0 ? "+" : ""}${stats.totalReturn.toFixed(2)}%`, color: stats.totalReturn >= 0 ? "text-green-400" : "text-red-400" },
        { label: "Avg Trade Return", value: `${stats.avgGainPct >= 0 ? "+" : ""}${stats.avgGainPct.toFixed(2)}%`, color: stats.avgGainPct >= 0 ? "text-green-400" : "text-red-400" },
      ]
    : [];

  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
      <div className="px-6 py-4 border-b border-arcana-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Paper Trading Performance</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
            Alpaca Paper
          </span>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-arcana-border">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-arcana-surface px-5 py-4">
                <div className="h-2 w-20 bg-arcana-border rounded animate-pulse mb-2" />
                <div className="h-5 w-12 bg-arcana-border rounded animate-pulse" />
              </div>
            ))
          : statCards.map((s) => (
              <div key={s.label} className="bg-arcana-surface px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AlgoStrategiesPage() {
  const [activeCategory, setActiveCategory] = useState<StrategyCategory>("all");

  const filtered = activeCategory === "all"
    ? CURATED_EAS
    : CURATED_EAS.filter((ea) => ea.category === activeCategory);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-white">Algo Strategy Marketplace</h1>
        </div>
        <p className="text-sm text-slate-400">
          Discover, compare, and deploy automated trading strategies from the MQL5 Market. Run EAs directly in your browser via the MT5 WebTerminal, and track paper performance through your Alpaca account.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-400/5 border border-amber-400/20 p-4">
        <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/70 leading-relaxed">
          <span className="font-semibold text-amber-400">Educational purposes only.</span>{" "}
          Algo trading involves significant risk. Past performance of any EA does not guarantee future results.
          Always backtest thoroughly and paper-trade before using real capital. Arcana Pulse is not affiliated with
          MQL5.com or MetaQuotes.
        </p>
      </div>

      {/* Category filter */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Filter by Strategy Type</p>
        <div className="flex flex-wrap gap-2">
          {STRATEGY_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  activeCategory === cat.value
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "bg-arcana-surface border-arcana-border text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* EA Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Curated EA Catalog
            <span className="ml-2 text-[10px] font-normal text-slate-500">({filtered.length} strategies)</span>
          </h2>
          <a
            href="https://www.mql5.com/en/market"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Browse full MQL5 Market
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ea) => (
            <EACard key={ea.id} ea={ea} />
          ))}
        </div>
      </div>

      {/* Paper Performance Stats */}
      <div>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
          Your Paper Trading Performance
        </h2>
        <PaperPerformance />
      </div>

      {/* MT5 WebTerminal */}
      <div>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          Trade in Browser
          <span className="text-[10px] font-normal text-slate-500">Powered by MT5 WebTerminal</span>
        </h2>
        <MT5Panel />
      </div>

      {/* Getting started guide */}
      <div className="rounded-xl bg-arcana-surface border border-arcana-border overflow-hidden">
        <div className="px-6 py-4 border-b border-arcana-border flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Getting Started with Algo Trading</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              icon: DollarSign,
              title: "Open an Alpaca Paper Account",
              body: "Sign up free at alpaca.markets. Create a paper trading account — you get $100,000 in virtual funds instantly.",
              link: "https://alpaca.markets",
              linkText: "Open Alpaca Account →",
            },
            {
              step: "2",
              icon: Bot,
              title: "Choose an EA from MQL5",
              body: "Browse the catalog above. Filter by strategy type, risk level, and price. Purchase or download free EAs from MQL5 Market.",
              link: "https://www.mql5.com/en/market",
              linkText: "Browse MQL5 Market →",
            },
            {
              step: "3",
              icon: Monitor,
              title: "Run it in MT5 WebTerminal",
              body: "Enter your broker demo server above to launch the WebTerminal. Install your EA and let it run — no installation needed.",
              link: null,
              linkText: null,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                    {item.step}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-10">{item.body}</p>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pl-10 flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    {item.linkText}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
