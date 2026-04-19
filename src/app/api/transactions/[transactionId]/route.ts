import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransactions from "@/lib/services/db/transactions";
import { logAuditEvent } from "@/lib/services/db/auditLog";

interface RouteParams {
  params: Promise<{ transactionId: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { transactionId } = await params;
  const txn = await dbTransactions.getTransaction(transactionId);
  if (!txn) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(txn);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { transactionId } = await params;
  const body = await request.json();

  try {
    const txn = await dbTransactions.updateTransaction(transactionId, body);

    const session = await getServerSession(authOptions);
    void logAuditEvent({
      workspaceId: body.workspaceId ?? "ws-001",
      userId: session?.user?.userId ?? "unknown",
      userEmail: session?.user?.email ?? "",
      action: "transaction_update",
      targetEntity: "transaction",
      targetId: transactionId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json(txn);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { transactionId } = await params;
  try {
    await dbTransactions.deleteTransaction(transactionId);

    const session = await getServerSession(authOptions);
    void logAuditEvent({
      workspaceId: "ws-001",
      userId: session?.user?.userId ?? "unknown",
      userEmail: session?.user?.email ?? "",
      action: "transaction_delete",
      targetEntity: "transaction",
      targetId: transactionId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
