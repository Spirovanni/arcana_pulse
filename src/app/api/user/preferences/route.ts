import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { requireAuth } from "@/lib/auth/withAuth";
import { getUserById, updateUserPreferences } from "@/lib/services/db/workspace";
import { logAuditEvent } from "@/lib/services/db/auditLog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ preferences: { email: true, in_app: true } });
  }

  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  try {
    const userObj = await getUserById(session.user.userId);
    let prefs = { email: true, in_app: true };

    if (userObj?.notificationPreferences) {
      try {
        prefs = JSON.parse(userObj.notificationPreferences);
      } catch {
        // Use default
      }
    }

    return NextResponse.json({ preferences: prefs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch preferences failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  const auth = await requireAuth(request, { requiredRole: "viewer" });
  if (!auth.ok) return auth.response;
  const { session, workspaceId } = auth;

  try {
    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ error: "Invalid preferences body" }, { status: 400 });
    }

    const serialized = JSON.stringify({
      email: Boolean(preferences.email),
      in_app: Boolean(preferences.in_app),
    });

    const updatedUser = await updateUserPreferences(session.user.userId, serialized);

    void logAuditEvent({
      workspaceId,
      userId: session.user.userId,
      userEmail: session.user.email,
      action: "settings_change",
      targetEntity: "user_preferences",
      targetId: session.user.userId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
      metadata: {
        preferences: serialized,
      },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update preferences failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
