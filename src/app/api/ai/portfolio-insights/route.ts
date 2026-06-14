import { NextRequest, NextResponse } from "next/server";
import { completeForFeature } from "@/lib/ai-router";
import { generateId } from "@/lib/utils";
import type { Holding, InvestmentAccount } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioInsight {
  id: string;
  type: "concentration_risk" | "diversification" | "performance" | "sector_exposure" | "tip" | "rebalance";
  severity: "info" | "warning" | "success";
  title: string;
  description: string;
  metric?: string;
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a portfolio risk analyst for a personal investment platform. Given portfolio holdings data, generate 4-6 concise investment insights.

INSIGHT TYPES:
- concentration_risk: A single stock, sector, or asset class is overweight
- diversification: Missing asset classes or geographic gaps
- performance: Notable winners, losers, or overall return commentary
- sector_exposure: Sector allocation observation
- tip: Actionable rebalancing or strategy advice
- rebalance: Specific rebalancing recommendation

SEVERITY:
- success: Portfolio is well-positioned, positive trend
- warning: Risk or imbalance that warrants attention
- info: Neutral observation or opportunity

RULES:
1. Generate 4-6 insights, most important first
2. Each insight: type, severity, title (under 55 chars), description (1-2 sentences), optional metric (short string like "82% equities" or "+24.5% AAPL")
3. Use specific numbers from the data
4. Be direct and actionable, not generic
5. Output ONLY a JSON array, no markdown fences, no explanation
6. Each object: { "type": string, "severity": string, "title": string, "description": string, "metric"?: string }`;

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_TYPES = new Set(["concentration_risk", "diversification", "performance", "sector_exposure", "tip", "rebalance"]);
const VALID_SEVERITIES = new Set(["info", "warning", "success"]);

function validate(raw: string): PortfolioInsight[] | null {
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const results: PortfolioInsight[] = [];
  for (const item of parsed) {
    if (
      typeof item !== "object" || item === null ||
      typeof item.type !== "string" || typeof item.severity !== "string" ||
      typeof item.title !== "string" || typeof item.description !== "string" ||
      !VALID_TYPES.has(item.type) || !VALID_SEVERITIES.has(item.severity)
    ) continue;
    results.push({
      id: generateId("pi"),
      type: item.type as PortfolioInsight["type"],
      severity: item.severity as PortfolioInsight["severity"],
      title: item.title,
      description: item.description,
      metric: typeof item.metric === "string" ? item.metric : undefined,
    });
  }
  return results.length > 0 ? results.slice(0, 6) : null;
}

// ─── Rule-based fallback ──────────────────────────────────────────────────────

function fallback(
  holdings: Holding[],
  totalValue: number
): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];

  // Sector concentration
  const byType = new Map<string, number>();
  for (const h of holdings) {
    const t = h.security.type ?? "other";
    byType.set(t, (byType.get(t) ?? 0) + h.institutionValue);
  }
  const [[topType, topValue]] = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
  const topPct = totalValue > 0 ? Math.round((topValue / totalValue) * 100) : 0;
  if (topPct > 60) {
    insights.push({
      id: generateId("pi"), type: "concentration_risk", severity: "warning",
      title: `Heavy ${topType} concentration`,
      description: `${topPct}% of your portfolio is in ${topType} assets. Consider diversifying into other asset classes to reduce concentration risk.`,
      metric: `${topPct}% ${topType}`,
    });
  }

  // Best performer
  const best = [...holdings].sort((a, b) => (b.unrealizedGainLossPct ?? 0) - (a.unrealizedGainLossPct ?? 0))[0];
  if (best && (best.unrealizedGainLossPct ?? 0) > 15) {
    insights.push({
      id: generateId("pi"), type: "performance", severity: "success",
      title: `${best.security.ticker ?? best.security.name} is a top performer`,
      description: `Up ${best.unrealizedGainLossPct?.toFixed(1)}% on your ${best.security.name} position. Consider whether to take partial profits or let it ride.`,
      metric: `+${best.unrealizedGainLossPct?.toFixed(1)}%`,
    });
  }

  // Worst performer
  const worst = [...holdings].sort((a, b) => (a.unrealizedGainLossPct ?? 0) - (b.unrealizedGainLossPct ?? 0))[0];
  if (worst && (worst.unrealizedGainLossPct ?? 0) < -5) {
    insights.push({
      id: generateId("pi"), type: "tip", severity: "warning",
      title: `${worst.security.ticker ?? worst.security.name} is underwater`,
      description: `Down ${Math.abs(worst.unrealizedGainLossPct ?? 0).toFixed(1)}% on ${worst.security.name}. Evaluate whether to hold, average down, or harvest the tax loss.`,
      metric: `${worst.unrealizedGainLossPct?.toFixed(1)}%`,
    });
  }

  // Single-stock concentration
  const largestHolding = [...holdings].sort((a, b) => b.institutionValue - a.institutionValue)[0];
  if (largestHolding) {
    const pct = totalValue > 0 ? Math.round((largestHolding.institutionValue / totalValue) * 100) : 0;
    if (pct > 25) {
      insights.push({
        id: generateId("pi"), type: "concentration_risk", severity: "warning",
        title: `${largestHolding.security.ticker ?? "Top holding"} is oversized`,
        description: `${largestHolding.security.name} represents ${pct}% of your total portfolio. A single position over 25% amplifies downside risk.`,
        metric: `${pct}% of portfolio`,
      });
    }
  }

  // International diversification check
  const hasInternational = holdings.some((h) =>
    ["VXUS", "EEM", "IEFA", "VEA"].includes(h.security.ticker ?? "")
  );
  if (!hasInternational) {
    insights.push({
      id: generateId("pi"), type: "diversification", severity: "info",
      title: "No international exposure",
      description: "Your portfolio appears US-only. Adding international equities can reduce home-country bias and capture global growth opportunities.",
    });
  }

  return insights.slice(0, 5);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { holdings, accounts, totalValue } = await req.json() as {
      holdings: Holding[];
      accounts: InvestmentAccount[];
      totalValue: number;
    };

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({ insights: [] });
    }

    // Build a concise context object for Claude
    const context = {
      totalValue,
      totalCostBasis: holdings.reduce((s, h) => s + (h.costBasis ?? 0), 0),
      totalUnrealizedGainLoss: holdings.reduce((s, h) => s + (h.unrealizedGainLoss ?? 0), 0),
      accounts: accounts.map((a) => ({ type: a.accountType, balance: a.balance })),
      holdings: holdings.map((h) => ({
        ticker: h.security.ticker,
        name: h.security.name,
        type: h.security.type,
        value: h.institutionValue,
        costBasis: h.costBasis,
        gainLoss: h.unrealizedGainLoss,
        gainLossPct: h.unrealizedGainLossPct,
        portfolioPct: totalValue > 0 ? +((h.institutionValue / totalValue) * 100).toFixed(1) : 0,
      })),
      assetAllocation: (() => {
        const map = new Map<string, number>();
        for (const h of holdings) {
          const t = h.security.type ?? "other";
          map.set(t, (map.get(t) ?? 0) + h.institutionValue);
        }
        return Object.fromEntries(
          Array.from(map.entries()).map(([k, v]) => [k, +(((v / totalValue) * 100).toFixed(1))])
        );
      })(),
    };

    try {
      const text = await completeForFeature(
        "portfolio_insights",
        SYSTEM_PROMPT,
        `Analyze this portfolio and generate insights:\n${JSON.stringify(context, null, 2)}`,
        1024
      );
      const validated = validate(text);
      if (validated) return NextResponse.json({ insights: validated });
    } catch {
      // fall through to rule-based
    }

    return NextResponse.json({ insights: fallback(holdings, totalValue) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
