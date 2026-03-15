import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransactions from "@/lib/services/db/transactions";
import type { TransactionFilter } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const sp = request.nextUrl.searchParams;
  const filter: TransactionFilter = {
    workspaceId: sp.get("workspaceId") ?? "ws-001",
  };

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

  const result = await dbTransactions.listTransactions(filter, {
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { userId = "usr-001", ...input } = body;

  try {
    const txn = await dbTransactions.createTransaction(input, userId);
    return NextResponse.json(txn, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
