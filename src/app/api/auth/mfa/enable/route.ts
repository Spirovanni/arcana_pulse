import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { enableMfa } from "@/lib/services/db/auth";
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
    const { code } = (await request.json()) as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const { recoveryCodes } = await enableMfa(session.user.userId, code.trim());

    void logAuditEvent({
      workspaceId: session.user.workspaceId ?? "ws-001",
      userId: session.user.userId,
      userEmail: session.user.email ?? "",
      action: "mfa_enable",
      targetEntity: "settings",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ recoveryCodes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to enable MFA" },
      { status: 400 }
    );
  }
}
