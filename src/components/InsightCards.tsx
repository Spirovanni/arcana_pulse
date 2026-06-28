"use client";

import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Repeat,
  RefreshCw,
} from "lucide-react";
import type { SpendingInsight, InsightType, InsightSeverity } from "@/lib/types";
import LastAnalysisStamp from "@/components/LastAnalysisStamp";

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
    bg: "bg-primary/10",
    text: "text-primary",
    badge: "bg-primary/10 text-primary",
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

interface InsightCardsProps {
  insights: SpendingInsight[];
  loading: boolean;
  onRefresh: () => void;
  lastAnalysisAt: string | null;
}

export default function InsightCards({
  insights,
  loading,
  onRefresh,
  lastAnalysisAt,
}: InsightCardsProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1">
          <span className="block text-[9px] uppercase tracking-[2px] text-secondary font-bold">AI Signal Feed</span>
          <LastAnalysisStamp lastAnalysisAt={lastAnalysisAt} />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[1px] text-secondary hover:text-primary transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && insights.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs text-secondary uppercase tracking-wider">Generating insights...</span>
          </div>
        </div>
      )}

      {!loading && insights.length === 0 && (
        <div className="rounded-sm bg-surface-container-high border border-outline p-8 text-center">
          <Lightbulb className="w-5 h-5 text-secondary mx-auto mb-2" />
          <p className="text-xs text-secondary uppercase tracking-wider">
            {lastAnalysisAt ? "No insights available yet" : "No analysis yet. Click refresh to run."}
          </p>
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => {
            const style = SEVERITY_STYLES[insight.severity];
            const Icon = TYPE_ICONS[insight.type];
            return (
              <div key={insight.id} className="rounded-sm bg-surface-container border border-outline p-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-sm flex-shrink-0 ${style.bg}`}>
                    <Icon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-on-surface">{insight.title}</h4>
                    <p className="text-xs text-secondary mt-1 leading-relaxed">{insight.description}</p>
                    {insight.percentageChange != null && (
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-sm ${style.badge}`}>
                        {insight.percentageChange > 0 ? "+" : ""}{insight.percentageChange}%
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
