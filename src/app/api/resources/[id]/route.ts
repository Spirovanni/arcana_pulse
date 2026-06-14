import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { deleteUserResource } from "@/lib/services/db/resources";
import { logAuditEvent } from "@/lib/services/db/auditLog";

// ---------------------------------------------------------------------------
// DELETE /api/resources/[id] — delete a resource owned by the authenticated user
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const userId = session.user.userId;

  const { id: resourceId } = await params;

  if (!resourceId) {
    return NextResponse.json({ error: "Resource ID is required" }, { status: 400 });
  }

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  try {
    const deleted = await deleteUserResource(userId, resourceId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Resource not found or not owned by this user" },
        { status: 404 }
      );
    }

    void logAuditEvent({
      workspaceId: session.user.workspaceId ?? "ws-001",
      userId,
      userEmail: session.user.email,
      action: "settings_change",
      targetEntity: "resource",
      targetId: resourceId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
      metadata: { action: "delete_resource" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/resources/[id]]", err);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
