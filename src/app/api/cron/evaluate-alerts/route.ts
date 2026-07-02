import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured, getDatabase, DATABASE_ID, COLLECTIONS, Query } from "@/lib/appwrite";
import { isAlpacaConfigured, alpacaDataGet } from "@/lib/alpaca";
import { evaluateAndNotify } from "@/lib/services/hermes";
import type { AlertRule } from "@/lib/types";

export const dynamic = "force-dynamic";

interface LatestTrade {
  p: number; // price
  t: string; // timestamp
}

interface LatestTradesResponse {
  trades: Record<string, LatestTrade>;
}

export async function POST(request: NextRequest) {
  // 1. Cron secret authorization gate
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Prerequisites checks
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  if (!isAlpacaConfigured()) {
    return NextResponse.json({ error: "Alpaca not configured" }, { status: 503 });
  }

  try {
    const db = getDatabase();

    // 3. Fetch all active price_threshold alert rules across all workspaces
    const rulesResult = await db.listDocuments(DATABASE_ID, COLLECTIONS.alertRules, [
      Query.equal("kind", "price_threshold"),
      Query.equal("active", true),
      Query.limit(100),
    ]);

    if (rulesResult.documents.length === 0) {
      return NextResponse.json({ message: "No active price rules found" });
    }

    // 4. Extract unique symbols
    const symbolsSet = new Set<string>();
    const rules: AlertRule[] = [];

    for (const doc of rulesResult.documents) {
      try {
        const rule: AlertRule = {
          id: doc.$id,
          workspaceId: doc.workspaceId,
          createdBy: doc.createdBy,
          name: doc.name,
          kind: doc.kind as any,
          config: doc.config,
          channels: doc.channels || [],
          active: doc.active,
          lastTriggeredAt: doc.lastTriggeredAt ?? undefined,
          createdAt: doc.$createdAt,
          updatedAt: doc.$updatedAt,
        };
        rules.push(rule);

        const config = JSON.parse(rule.config);
        if (config.symbol && typeof config.symbol === "string") {
          symbolsSet.add(config.symbol.toUpperCase());
        }
      } catch (err) {
        console.error(`Failed parsing rule ${doc.$id} config:`, err);
      }
    }

    const symbols = Array.from(symbolsSet);
    if (symbols.length === 0) {
      return NextResponse.json({ message: "No valid symbols found in active rules" });
    }

    // 5. Fetch latest trade quotes from Alpaca Equities Data API
    // Endpoint: GET /v2/stocks/trades/latest?symbols=AAPL,MSFT
    // Limit: 1 call per Cron run, batches all active symbols (respects Basic 200 calls/min limit)
    const quotesData = await alpacaDataGet<LatestTradesResponse>(
      `/v2/stocks/trades/latest?symbols=${symbols.join(",")}`
    );

    if (!quotesData?.trades) {
      return NextResponse.json({ error: "No trade data received from Alpaca" }, { status: 502 });
    }

    // 6. Evaluate each rule against its quote
    let evaluatedCount = 0;
    let triggeredCount = 0;

    for (const rule of rules) {
      try {
        const config = JSON.parse(rule.config);
        const symbol = config.symbol?.toUpperCase();
        const trade = quotesData.trades[symbol];

        if (trade && typeof trade.p === "number") {
          evaluatedCount++;
          // Trigger matching logic
          const operator = config.operator; // "above" | "below"
          const targetValue = config.value;

          let shouldTrigger = false;
          if (operator === "above" && trade.p >= targetValue) {
            shouldTrigger = true;
          } else if (operator === "below" && trade.p <= targetValue) {
            shouldTrigger = true;
          }

          if (shouldTrigger) {
            triggeredCount++;
            // evaluateAndNotify performs cooldown checking, delivery, and logs audit alert_sent
            await evaluateAndNotify(rule.workspaceId, "price_threshold", {
              symbol,
              currentPrice: trade.p,
            });
          }
        }
      } catch (err) {
        console.error(`Failed evaluating rule ${rule.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        activeRulesCount: rules.length,
        symbolsQueried: symbols,
        symbolsCount: symbols.length,
        evaluatedRules: evaluatedCount,
        triggeredRules: triggeredCount,
      },
    });
  } catch (err) {
    console.error("Cron price sweep error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
