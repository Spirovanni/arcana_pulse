import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransactions from "@/lib/services/db/transactions";
import { logAuditEvent } from "@/lib/services/db/auditLog";
import { requireAuth } from "@/lib/auth/withAuth";
import type { TransactionFilter } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { session, workspaceId } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const sp = request.nextUrl.searchParams;
  const filter: TransactionFilter = { workspaceId };

  if (sp.get("bankId")) filter.bankId = sp.get("bankId")!;
  if (sp.get("transactionType"))
    filter.transactionType = sp.get("transactionType") as TransactionFilter["transactionType"];
  if (sp.get("sourceType"))
    filter.sourceType = sp.get("sourceType") as TransactionFilter["sourceType"];
  if (sp.get("category"))
    filter.category = sp.get("category") as TransactionFilter["category"];
  if (sp.get("status"))
    filter.status = sp.get("status") as TransactionFilter["status"];
  if (sp.get("dateFrom")) filter.dateFrom = sp.get("dateFrom")!;
  if (sp.get("dateTo")) filter.dateTo = sp.get("dateTo")!;
  if (sp.get("search")) filter.search = sp.get("search")!;

  const page = parseInt(sp.get("page") ?? "1", 10);
  const pageSize = parseInt(sp.get("pageSize") ?? "10", 10);

  const result = await dbTransactions.listTransactions(filter, { page, pageSize });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;
  const { session, workspaceId } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const input = { ...body, workspaceId };

  try {
    const txn = await dbTransactions.createTransaction(input, session.user.userId);

    void logAuditEvent({
      workspaceId,
      userId: session.user.userId,
      userEmail: session.user.email,
      action: "transaction_create",
      targetEntity: "transaction",
      targetId: txn.transactionId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
      metadata: { amount: input.amount, transactionType: input.transactionType },
    });

    return NextResponse.json(txn, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
