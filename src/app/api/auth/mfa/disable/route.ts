import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { disableMfa } from "@/lib/services/db/auth";
import { logAuditEvent } from "@/lib/services/db/auditLog";

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite is not configured" }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disableMfa(session.user.userId);

    void logAuditEvent({
      workspaceId: session.user.workspaceId ?? "ws-001",
      userId: session.user.userId,
      userEmail: session.user.email ?? "",
      action: "mfa_disable",
      targetEntity: "settings",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disable MFA" },
      { status: 500 }
    );
  }
}
