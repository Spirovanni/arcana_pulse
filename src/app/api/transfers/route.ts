import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbTransfers from "@/lib/services/db/transfers";
import { requireAuth } from "@/lib/auth/withAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const transfers = await dbTransfers.getTransfersByWorkspace(workspaceId);
  return NextResponse.json(transfers);
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
  try {
    const transfer = await dbTransfers.createTransfer({
      ...body,
      workspaceId,
      createdBy: session.user.userId,
    });
    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
