import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransactions from "@/lib/services/db/transactions";

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
    return NextResponse.json(txn);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
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
  try {
    await dbTransactions.deleteTransaction(transactionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
