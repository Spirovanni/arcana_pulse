import { NextRequest, NextResponse } from "next/server";
import { alpacaGet, isAlpacaConfigured, AlpacaConfigError } from "@/lib/alpaca";
import type { AlpacaAsset } from "@/lib/types";

interface RawAsset {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  asset_class: string;
  tradable: boolean;
  fractionable: boolean;
  status: string;
}

export async function GET(req: NextRequest) {
  if (!isAlpacaConfigured()) {
    return NextResponse.json({ configured: false, assets: [] }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") ?? "").toUpperCase().trim();

    // Fetch active US equity assets
    const raw = await alpacaGet<RawAsset[]>(
      "/v2/assets?status=active&asset_class=us_equity"
    );

    const filtered = raw
      .filter(
        (a) =>
          a.tradable &&
          a.status === "active" &&
          (query === "" ||
            a.symbol.startsWith(query) ||
            a.name.toUpperCase().includes(query))
      )
      .slice(0, 20); // cap results

    const assets: AlpacaAsset[] = filtered.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      name: a.name,
      exchange: a.exchange,
      assetClass: a.asset_class,
      tradable: a.tradable,
      fractionable: a.fractionable,
    }));

    return NextResponse.json({ configured: true, assets });
  } catch (err) {
    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ configured: false, assets: [] }, { status: 200 });
    }
    console.error("[Alpaca /assets]", err);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}
