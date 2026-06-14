import { NextRequest, NextResponse } from "next/server";
import { alpacaGet, alpacaPost, isAlpacaConfigured, AlpacaConfigError } from "@/lib/alpaca";
import type { AlpacaOrder, PlaceOrderInput } from "@/lib/types";

interface RawOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  time_in_force: "day" | "gtc" | "ioc" | "fok";
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  submitted_at: string;
  filled_at: string | null;
  canceled_at: string | null;
  notional: string | null;
  asset_class: string;
}

function mapOrder(raw: RawOrder): AlpacaOrder {
  return {
    orderId: raw.id,
    clientOrderId: raw.client_order_id,
    symbol: raw.symbol,
    side: raw.side,
    type: raw.type,
    timeInForce: raw.time_in_force,
    qty: parseFloat(raw.qty),
    filledQty: parseFloat(raw.filled_qty),
    filledAvgPrice: raw.filled_avg_price ? parseFloat(raw.filled_avg_price) : null,
    limitPrice: raw.limit_price ? parseFloat(raw.limit_price) : null,
    stopPrice: raw.stop_price ? parseFloat(raw.stop_price) : null,
    status: raw.status as AlpacaOrder["status"],
    submittedAt: raw.submitted_at,
    filledAt: raw.filled_at,
    canceledAt: raw.canceled_at,
    notional: raw.notional ? parseFloat(raw.notional) : null,
    assetClass: raw.asset_class,
  };
}

// GET — list orders
export async function GET(req: NextRequest) {
  if (!isAlpacaConfigured()) {
    return NextResponse.json({ configured: false, orders: [] }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "all";
    const limit = searchParams.get("limit") ?? "100";

    const raw = await alpacaGet<RawOrder[]>(
      `/v2/orders?status=${status}&limit=${limit}&direction=desc`
    );

    return NextResponse.json({ configured: true, orders: raw.map(mapOrder) });
  } catch (err) {
    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ configured: false, orders: [] }, { status: 200 });
    }
    console.error("[Alpaca GET /orders]", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST — place a new paper order
export async function POST(req: NextRequest) {
  if (!isAlpacaConfigured()) {
    return NextResponse.json({ error: "Alpaca not configured" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as PlaceOrderInput;

    // Basic validation
    if (!body.symbol || !body.qty || !body.side || !body.type || !body.timeInForce) {
      return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
    }
    if (body.qty <= 0) {
      return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
    }

    const alpacaBody: Record<string, unknown> = {
      symbol: body.symbol.toUpperCase(),
      qty: body.qty.toString(),
      side: body.side,
      type: body.type,
      time_in_force: body.timeInForce,
    };

    if (body.limitPrice) alpacaBody.limit_price = body.limitPrice.toString();
    if (body.stopPrice) alpacaBody.stop_price = body.stopPrice.toString();

    const raw = await alpacaPost<RawOrder>("/v2/orders", alpacaBody);

    return NextResponse.json({ configured: true, order: mapOrder(raw) }, { status: 201 });
  } catch (err) {
    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ error: "Alpaca not configured" }, { status: 400 });
    }
    console.error("[Alpaca POST /orders]", err);
    const message = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
