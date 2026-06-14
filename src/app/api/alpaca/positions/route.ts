export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { alpacaGet, isAlpacaConfigured, AlpacaConfigError } from "@/lib/alpaca";
import type { AlpacaPosition } from "@/lib/types";

interface RawPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  side: "long" | "short";
  asset_class: string;
}

export async function GET() {
  if (!isAlpacaConfigured()) {
    return NextResponse.json({ configured: false, positions: [] }, { status: 200 });
  }

  try {
    const raw = await alpacaGet<RawPosition[]>("/v2/positions");

    const positions: AlpacaPosition[] = raw.map((p) => ({
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avgEntryPrice: parseFloat(p.avg_entry_price),
      currentPrice: parseFloat(p.current_price),
      marketValue: parseFloat(p.market_value),
      costBasis: parseFloat(p.cost_basis),
      unrealizedPL: parseFloat(p.unrealized_pl),
      unrealizedPLPC: parseFloat(p.unrealized_plpc) * 100,
      unrealizedIntradayPL: parseFloat(p.unrealized_intraday_pl),
      unrealizedIntradayPLPC: parseFloat(p.unrealized_intraday_plpc) * 100,
      side: p.side,
      assetClass: p.asset_class,
    }));

    return NextResponse.json({ configured: true, positions });
  } catch (err) {
    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ configured: false, positions: [] }, { status: 200 });
    }
    console.error("[Alpaca /positions]", err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}
