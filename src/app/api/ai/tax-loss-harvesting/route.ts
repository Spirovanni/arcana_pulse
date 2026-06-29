import { NextRequest, NextResponse } from "next/server";
import { completeForFeature } from "@/lib/ai-router";
import { requireAuth } from "@/lib/auth/withAuth";
import type { TLHSummary, TLHOpportunity } from "@/lib/services/tlh";
import {
  getPersistedAnalysis,
  upsertPersistedAnalysis,
} from "@/lib/services/db/aiReports";

export interface TLHSuggestion {
  id: string;
  title: string;
  body: string;
  severity: "action" | "warning" | "info";
  ticker?: string;
}

const SYSTEM_PROMPT = `You are a tax optimization advisor for a personal investment platform. Given a tax-loss harvesting analysis, generate 3-5 concise, actionable suggestions.

SEVERITY:
- action: Clear opportunity to harvest a loss and save taxes now
- warning: Wash-sale risk or other caution that requires attention
- info: Educational context or secondary observation

RULES:
1. Be specific — reference exact tickers, dollar amounts, and percentages from the data
2. Lead with the action, not the explanation
3. Mention wash-sale rule risks explicitly when present
4. Keep each suggestion to 2 sentences max
5. Do NOT give specific tax advice — remind users to consult a tax professional for their situation
6. Output ONLY a JSON array, no markdown, no extra text
7. Each object: { "id": string (unique, e.g. "tlh-1"), "title": string (≤55 chars), "body": string (1-2 sentences), "severity": "action"|"warning"|"info", "ticker"?: string }`;

function fallback(summary: TLHSummary): TLHSuggestion[] {
  const suggestions: TLHSuggestion[] = [];
  let idx = 1;

  for (const opp of summary.opportunities.slice(0, 3)) {
    const absLoss = Math.abs(opp.unrealizedLoss);
    const term = opp.isLongTerm ? "long-term" : "short-term";
    const savings = opp.isLongTerm
      ? opp.estimatedTaxSavings.savingsAtLongTerm
      : opp.estimatedTaxSavings.savingsAtShortTerm;

    if (opp.washSaleRisk) {
      suggestions.push({
        id: `tlh-${idx++}`,
        title: `Wash-sale risk on ${opp.ticker}`,
        body: opp.washSaleWarning ?? `You recently purchased ${opp.ticker} — selling now could disallow the loss under the wash-sale rule.`,
        severity: "warning",
        ticker: opp.ticker,
      });
    } else {
      suggestions.push({
        id: `tlh-${idx++}`,
        title: `Harvest ${opp.ticker} for ~$${Math.round(savings).toLocaleString()} savings`,
        body: `Your ${opp.ticker} position is down ${Math.abs(opp.unrealizedLossPct).toFixed(1)}% ($${Math.round(absLoss).toLocaleString()} ${term} loss). Selling could offset gains and reduce your tax bill.${opp.suggestedReplacement ? ` Consider replacing with ${opp.suggestedReplacement.ticker} to maintain exposure.` : ""}`,
        severity: "action",
        ticker: opp.ticker,
      });
    }
  }

  if (summary.totalUnrealizedGains > 0 && summary.opportunities.length > 0) {
    suggestions.push({
      id: `tlh-${idx++}`,
      title: "Losses can offset your realized gains",
      body: `You have $${Math.round(summary.totalUnrealizedGains).toLocaleString()} in unrealized gains. Harvesting available losses first can significantly reduce net taxable gains. Consult a tax professional before executing.`,
      severity: "info",
    });
  }

  suggestions.push({
    id: `tlh-${idx++}`,
    title: "Wait 31 days before repurchasing",
    body: "To avoid the wash-sale rule, wait at least 31 days before buying back the same or substantially identical security after harvesting a loss.",
    severity: "info",
  });

  return suggestions.slice(0, 5);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;

  try {
    const {
      summary,
      force,
    } = (await req.json()) as {
      summary: TLHSummary;
      force?: boolean;
    };
    const workspaceId = auth.workspaceId;
    const userId = auth.session.user.userId;
    const reportKey = "tax_loss_harvesting";

    if (!summary || summary.opportunities.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    if (!force) {
      const persisted = await getPersistedAnalysis<TLHSuggestion[]>(
        workspaceId,
        userId,
        reportKey
      );
      if (persisted) {
        return NextResponse.json({
          suggestions: persisted.value,
          lastAnalysisAt: persisted.analyzedAt,
          generatedFresh: false,
        });
      }
    }

    // Build compact context for Claude
    const context = {
      totalHarvestableLoss: summary.totalHarvestableLoss,
      estimatedSavings: {
        atShortTermRate: summary.estimatedSavingsShortTerm,
        atLongTermRate: summary.estimatedSavingsLongTerm,
      },
      totalUnrealizedGains: summary.totalUnrealizedGains,
      opportunities: summary.opportunities.map((o: TLHOpportunity) => ({
        ticker: o.ticker,
        name: o.securityName,
        unrealizedLoss: o.unrealizedLoss,
        unrealizedLossPct: o.unrealizedLossPct,
        isLongTerm: o.isLongTerm,
        holdingDays: o.holdingPeriodDays,
        washSaleRisk: o.washSaleRisk,
        washSaleWarning: o.washSaleWarning,
        estimatedSavingsShortTerm: o.estimatedTaxSavings.savingsAtShortTerm,
        estimatedSavingsLongTerm: o.estimatedTaxSavings.savingsAtLongTerm,
        replacementTicker: o.suggestedReplacement?.ticker,
      })),
    };

    try {
      const text = await completeForFeature(
        "tlh",
        SYSTEM_PROMPT,
        `Generate tax-loss harvesting suggestions for this portfolio:\n${JSON.stringify(context, null, 2)}`,
        1024,
        { workspaceId }
      );
      let cleaned = text.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");

      let parsed: unknown;
      try { parsed = JSON.parse(cleaned); } catch { parsed = null; }

      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = (parsed as TLHSuggestion[]).filter(
          (s) => s.id && s.title && s.body && ["action", "warning", "info"].includes(s.severity)
        );
        if (valid.length > 0) {
          const suggestions = valid.slice(0, 5);
          const persisted = await upsertPersistedAnalysis(
            workspaceId,
            userId,
            reportKey,
            suggestions
          );
          return NextResponse.json({
            suggestions,
            lastAnalysisAt: persisted.analyzedAt,
            generatedFresh: true,
          });
        }
      }
    } catch {
      // fall through
    }

    const fallbackSuggestions = fallback(summary);
    const persisted = await upsertPersistedAnalysis(
      workspaceId,
      userId,
      reportKey,
      fallbackSuggestions
    );
    return NextResponse.json({
      suggestions: fallbackSuggestions,
      lastAnalysisAt: persisted.analyzedAt,
      generatedFresh: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
