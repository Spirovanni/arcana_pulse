export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { alpacaGet, alpacaPost, isAlpacaConfigured, AlpacaConfigError } from "@/lib/alpaca";
import { requireAuth } from "@/lib/auth/withAuth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { createPaperOrder, getPaperOrderByClientOrderId, updatePaperOrder } from "@/lib/services/db/paperOrders";
import { logAuditEvent } from "@/lib/services/db/auditLog";
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

// Allowed liquid equities and ETFs for paper trading simulation
const ALLOWED_SYMBOLS = ["AAPL", "MSFT", "GOOG", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "NFLX", "SPY", "QQQ", "IWM"];
const MAX_NOTIONAL_LIMIT = 10000;
const MAX_MARKET_QTY_LIMIT = 500;

// GET — list orders
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

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
  const auth = await requireAuth(req, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { workspaceId, session } = auth;
  const userId = session.user.userId;
  const userEmail = session.user.email;

  if (!isAlpacaConfigured()) {
    return NextResponse.json({ error: "Alpaca not configured" }, { status: 400 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  const body = (await req.json()) as PlaceOrderInput & { confirmed?: boolean; workspaceId?: string; clientOrderId?: string; strategyId?: string };

  // Generate or get clientOrderId early so it persists correctly
  const clientOrderId = body.clientOrderId || `pco-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    // Basic validation
    if (!body.symbol || !body.qty || !body.side || !body.type || !body.timeInForce) {
      return NextResponse.json({ error: "Missing required order fields" }, { status: 400 });
    }
    if (body.qty <= 0) {
      return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
    }
    if (body.type !== "market" && body.type !== "limit") {
      return NextResponse.json({ error: "Only market and limit orders are supported" }, { status: 400 });
    }

    // Workspace scoping check
    if (body.workspaceId && body.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Access to this workspace is not permitted" }, { status: 403 });
    }

    const symbolUpper = body.symbol.toUpperCase();

    // 1. Symbol Allow-List Controls
    if (!ALLOWED_SYMBOLS.includes(symbolUpper)) {
      void logAuditEvent({
        workspaceId,
        userId,
        userEmail,
        action: "risk_limit_breach",
        targetEntity: "alpaca_order",
        metadata: {
          symbol: body.symbol,
          side: body.side,
          qty: body.qty,
          limitType: "symbol_scope",
          attemptedValue: symbolUpper,
          limitValue: ALLOWED_SYMBOLS.join(", "),
          reason: "Symbol is not in the allow-list"
        }
      });
      return NextResponse.json({ error: `Symbol ${body.symbol} is not allow-listed for paper trading` }, { status: 400 });
    }

    // 2. Position Sizing & Notional Limits Controls
    let estimatedNotional = 0;
    let limitReason = "";
    if (body.type === "limit") {
      if (!body.limitPrice) {
        return NextResponse.json({ error: "Limit price is required for limit orders" }, { status: 400 });
      }
      estimatedNotional = body.qty * body.limitPrice;
      if (estimatedNotional > MAX_NOTIONAL_LIMIT) {
        limitReason = `Notional value $${estimatedNotional} exceeds max limit of $${MAX_NOTIONAL_LIMIT}`;
      }
    } else if (body.type === "market") {
      if (body.qty > MAX_MARKET_QTY_LIMIT) {
        limitReason = `Market order quantity ${body.qty} exceeds safe ceiling of ${MAX_MARKET_QTY_LIMIT} shares`;
      }
    }

    if (limitReason) {
      void logAuditEvent({
        workspaceId,
        userId,
        userEmail,
        action: "risk_limit_breach",
        targetEntity: "alpaca_order",
        metadata: {
          symbol: symbolUpper,
          side: body.side,
          qty: body.qty,
          limitType: "position_sizing",
          attemptedValue: body.type === "limit" ? estimatedNotional : body.qty,
          limitValue: body.type === "limit" ? MAX_NOTIONAL_LIMIT : MAX_MARKET_QTY_LIMIT,
          reason: limitReason
        }
      });
      return NextResponse.json({ error: limitReason }, { status: 400 });
    }

    // 3. User Confirmation Gate
    if (body.confirmed !== true) {
      // Persist order in the database under pending_confirmation
      let existingOrder = await getPaperOrderByClientOrderId(clientOrderId);
      if (!existingOrder) {
        await createPaperOrder({
          workspaceId,
          submittedBy: userId,
          side: body.side,
          symbol: symbolUpper,
          qty: body.qty,
          notional: body.type === "limit" && body.limitPrice ? body.qty * body.limitPrice : undefined,
          orderType: body.type,
          timeInForce: body.timeInForce,
          clientOrderId,
          status: "pending_confirmation",
          strategyId: body.strategyId,
        });
      }

      return NextResponse.json({
        error: "confirmation required",
        message: "This order requires explicit user confirmation.",
        orderDetails: {
          symbol: symbolUpper,
          qty: body.qty,
          side: body.side,
          type: body.type,
          timeInForce: body.timeInForce,
          limitPrice: body.limitPrice,
          stopPrice: body.stopPrice,
          estimatedNotional: body.type === "limit" && body.limitPrice ? body.qty * body.limitPrice : undefined,
          clientOrderId,
        }
      }, { status: 422 });
    }

    // 4. Place Alpaca Order
    let existingOrder = await getPaperOrderByClientOrderId(clientOrderId);
    if (existingOrder && existingOrder.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Access to this order is not permitted" }, { status: 403 });
    }

    const alpacaBody: Record<string, unknown> = {
      symbol: symbolUpper,
      qty: body.qty.toString(),
      side: body.side,
      type: body.type,
      time_in_force: body.timeInForce,
      client_order_id: clientOrderId,
    };

    if (body.limitPrice) alpacaBody.limit_price = body.limitPrice.toString();
    if (body.stopPrice) alpacaBody.stop_price = body.stopPrice.toString();

    const raw = await alpacaPost<RawOrder>("/v2/orders", alpacaBody);
    const mapped = mapOrder(raw);

    // 5. Update local paperOrders document
    if (existingOrder) {
      await updatePaperOrder(existingOrder.orderId, {
        status: "submitted",
        alpacaOrderId: mapped.orderId,
        confirmedAt: new Date().toISOString(),
      });
    } else {
      const newOrder = await createPaperOrder({
        workspaceId,
        submittedBy: userId,
        side: body.side,
        symbol: symbolUpper,
        qty: body.qty,
        notional: body.type === "limit" && body.limitPrice ? body.qty * body.limitPrice : undefined,
        orderType: body.type,
        timeInForce: body.timeInForce,
        clientOrderId,
        status: "submitted",
        confirmedAt: new Date().toISOString(),
        strategyId: body.strategyId,
      });
      await updatePaperOrder(newOrder.orderId, {
        alpacaOrderId: mapped.orderId,
      });
    }

    // 6. Audit Log Entry
    void logAuditEvent({
      workspaceId,
      userId,
      userEmail,
      action: "paper_order_submit",
      targetEntity: "alpaca_order",
      targetId: mapped.orderId,
      metadata: {
        symbol: mapped.symbol,
        side: mapped.side,
        qty: mapped.qty,
        clientOrderId: mapped.clientOrderId,
        notional: mapped.notional,
      }
    });

    return NextResponse.json({ configured: true, order: mapped }, { status: 201 });
  } catch (err) {
    if (clientOrderId) {
      try {
        const order = await getPaperOrderByClientOrderId(clientOrderId);
        if (order && order.status === "pending_confirmation") {
          await updatePaperOrder(order.orderId, { status: "rejected" });
        }
      } catch (dbErr) {
        console.error("Failed to mark order as rejected in database:", dbErr);
      }
    }

    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ error: "Alpaca not configured" }, { status: 400 });
    }
    console.error("[Alpaca POST /orders]", err);
    const message = err instanceof Error ? err.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

