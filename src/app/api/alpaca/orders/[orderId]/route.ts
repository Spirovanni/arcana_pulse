import { NextRequest, NextResponse } from "next/server";
import { isAlpacaConfigured, alpacaDelete } from "@/lib/alpaca";
import { requireAuth } from "@/lib/auth/withAuth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { getPaperOrder, getPaperOrderByAlpacaId, updatePaperOrder } from "@/lib/services/db/paperOrders";
import { logAuditEvent } from "@/lib/services/db/auditLog";
import { evaluateAndNotify } from "@/lib/services/hermes";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(req, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  const { orderId } = await params;

  try {
    let paperOrder = await getPaperOrder(orderId);
    if (!paperOrder) {
      paperOrder = await getPaperOrderByAlpacaId(orderId);
    }

    if (!paperOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (paperOrder.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Access to this order is not permitted" }, { status: 403 });
    }

    return NextResponse.json(paperOrder);
  } catch (err) {
    console.error("[Alpaca GET /orders/[orderId]]", err);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(req, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { workspaceId, session } = auth;
  const userId = session.user.userId;
  const userEmail = session.user.email;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  if (!isAlpacaConfigured()) {
    return NextResponse.json({ error: "Alpaca not configured" }, { status: 400 });
  }

  const { orderId } = await params;

  try {
    // 1. Fetch paper order
    let paperOrder = await getPaperOrder(orderId);
    if (!paperOrder) {
      paperOrder = await getPaperOrderByAlpacaId(orderId);
    }

    if (!paperOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Scope check
    if (paperOrder.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Access to this order is not permitted" }, { status: 403 });
    }

    // 3. Status terminal check
    if (["filled", "canceled", "rejected"].includes(paperOrder.status)) {
      return NextResponse.json({ error: `Order is already in a terminal state: ${paperOrder.status}` }, { status: 400 });
    }

    // 4. Cancel via Alpaca API if submitted to Alpaca
    if (paperOrder.alpacaOrderId) {
      try {
        await alpacaDelete(`/v2/orders/${paperOrder.alpacaOrderId}`);
      } catch (err) {
        console.error(`Failed to delete order ${paperOrder.alpacaOrderId} at Alpaca`, err);
        throw err;
      }
    }

    // 5. Update DB record status
    const updatedOrder = await updatePaperOrder(paperOrder.orderId, {
      status: "canceled",
    });

    // Trigger Hermes alert matching and delivery
    await evaluateAndNotify(workspaceId, "paper_order_event", updatedOrder);

    // 6. Log audit event
    void logAuditEvent({
      workspaceId,
      userId,
      userEmail,
      action: "paper_order_cancel",
      targetEntity: "alpaca_order",
      targetId: paperOrder.alpacaOrderId || paperOrder.orderId,
      metadata: {
        orderId: paperOrder.orderId,
        alpacaOrderId: paperOrder.alpacaOrderId,
        symbol: paperOrder.symbol,
        side: paperOrder.side,
        qty: paperOrder.qty,
      }
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error("[Alpaca DELETE /orders/[orderId]]", err);
    const message = err instanceof Error ? err.message : "Failed to cancel order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
