import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAuditLogs } from "@/lib/services/db/auditLog";
import { isAppwriteConfigured } from "@/lib/appwrite";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ logs: [], note: "Appwrite not configured — audit logs unavailable" });
  }

  const sp = request.nextUrl.searchParams;
  const workspaceId = sp.get("workspaceId") ?? "ws-001";
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 100);

  try {
    const logs = await listAuditLogs({ workspaceId, limit });
    return NextResponse.json({ logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
