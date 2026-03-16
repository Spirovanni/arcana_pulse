"use client";

import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Repeat,
  RefreshCw,
} from "lucide-react";
import type { SpendingInsight, InsightType, InsightSeverity } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mappings
// ---------------------------------------------------------------------------

const SEVERITY_STYLES: Record<
  InsightSeverity,
  { bg: string; text: string; badge: string }
> = {
  success: {
    bg: "bg-green-500/10",
    text: "text-arcana-success",
    badge: "bg-green-500/10 text-arcana-success",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-arcana-warning",
    badge: "bg-amber-500/10 text-arcana-warning",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-arcana-sky",
    badge: "bg-blue-500/10 text-arcana-sky",
  },
};

const TYPE_ICONS: Record<
  InsightType,
  React.ComponentType<{ className?: string }>
> = {
  spending_spike: TrendingUp,
  savings_trend: TrendingUp,
  recurring_charge: Repeat,
  anomaly: AlertTriangle,
  tip: Lightbulb,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InsightCardsProps {
  insights: SpendingInsight[];
  loading: boolean;
  onRefresh: () => void;
}

export default function InsightCards({
  insights,
  loading,
  onRefresh,
}: InsightCardsProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">AI Insights</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-arcana-sky hover:bg-arcana-navy transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && insights.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-arcana-sky animate-spin" />
            <span className="text-sm text-slate-400">
              Generating insights...
            </span>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && insights.length === 0 && (
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <Lightbulb className="w-6 h-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No insights available yet</p>
        </div>
      )}

      {/* Cards grid */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity];
            const Icon = TYPE_ICONS[insight.type];

            return (
              <div
                key={insight.id}
                className="rounded-xl bg-arcana-surface border border-arcana-border p-5"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${style.bg}`}>
                    <Icon className={`w-5 h-5 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      {insight.description}
                    </p>
                    {insight.percentageChange != null && (
                      <span
                        className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded ${style.badge}`}
                      >
                        {insight.percentageChange > 0 ? "+" : ""}
                        {insight.percentageChange}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
