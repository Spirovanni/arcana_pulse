import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransfers from "@/lib/services/db/transfers";

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const workspaceId =
    request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";

  const transfers = await dbTransfers.getTransfersByWorkspace(workspaceId);
  return NextResponse.json(transfers);
}

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  try {
    const transfer = await dbTransfers.createTransfer(body);
    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
