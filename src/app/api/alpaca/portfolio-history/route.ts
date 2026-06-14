export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { alpacaGet, isAlpacaConfigured, AlpacaConfigError } from "@/lib/alpaca";
import type { PerformancePoint } from "@/lib/types";

const VALID_PERIODS = ["1D", "1W", "1M", "3M", "6M", "1A"] as const;
type Period = (typeof VALID_PERIODS)[number];

const PERIOD_TIMEFRAME: Record<Period, string> = {
  "1D": "5Min",
  "1W": "1Hour",
  "1M": "1D",
  "3M": "1D",
  "6M": "1D",
  "1A": "1W",
};

interface RawPortfolioHistory {
  timestamp: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
  base_value: number;
  timeframe: string;
}

export async function GET(req: NextRequest) {
  if (!isAlpacaConfigured()) {
    return NextResponse.json({ configured: false, history: [] }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawPeriod = searchParams.get("period") ?? "1M";
    const period: Period = VALID_PERIODS.includes(rawPeriod as Period)
      ? (rawPeriod as Period)
      : "1M";
    const timeframe = PERIOD_TIMEFRAME[period];

    const raw = await alpacaGet<RawPortfolioHistory>(
      `/v2/account/portfolio/history?period=${period}&timeframe=${timeframe}&extended_hours=false`
    );

    const history: PerformancePoint[] = raw.timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString(),
        value: raw.equity[i] ?? 0,
        percentReturn: (raw.profit_loss_pct[i] ?? 0) * 100,
      }))
      .filter((p) => p.value > 0); // filter out zero-equity points (pre-funding)

    return NextResponse.json({ configured: true, history, baseValue: raw.base_value });
  } catch (err) {
    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ configured: false, history: [] }, { status: 200 });
    }
    console.error("[Alpaca /portfolio-history]", err);
    return NextResponse.json({ error: "Failed to fetch portfolio history" }, { status: 500 });
  }
}
