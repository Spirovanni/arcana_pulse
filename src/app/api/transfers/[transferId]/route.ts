import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransfers from "@/lib/services/db/transfers";
import type { TransferStatus } from "@/lib/types";

interface RouteParams {
  params: Promise<{ transferId: string }>;
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

  const { transferId } = await params;
  const transfer = await dbTransfers.getTransferById(transferId);
  if (!transfer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(transfer);
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

  const { transferId } = await params;
  const body = await request.json();
  const { status, providerReference } = body as {
    status: TransferStatus;
    providerReference?: string;
  };

  try {
    const transfer = await dbTransfers.updateTransferStatus(
      transferId,
      status,
      providerReference
    );
    return NextResponse.json(transfer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
