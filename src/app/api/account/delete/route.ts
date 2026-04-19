import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteAccount } from "@/lib/services/db/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { logAuditEvent } from "@/lib/services/db/auditLog";

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  const { userId, workspaceId = "ws-001", email = "" } = session.user as {
    userId: string;
    workspaceId?: string;
    email?: string;
  };

  // Audit log before deletion (best-effort — will fail with account gone)
  void logAuditEvent({
    workspaceId,
    userId,
    userEmail: email,
    action: "settings_change",
    targetEntity: "account",
    targetId: userId,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
    metadata: { event: "account_deletion_requested" },
  });

  try {
    await deleteAccount(userId, workspaceId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Deletion failed" },
      { status: 500 }
    );
  }
}
