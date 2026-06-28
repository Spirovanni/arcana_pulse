import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbWorkspace from "@/lib/services/db/workspace";
import * as dbAuth from "@/lib/services/db/auth";
import { requireAuth } from "@/lib/auth/withAuth";

export async function GET(request: NextRequest) {
  const requestedWorkspaceId = request.nextUrl.searchParams.get("id") ?? undefined;
  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: requestedWorkspaceId,
  });
  if (!auth.ok) return auth.response;
  const { session, workspaceId: sessionWorkspaceId } = auth;
  const workspaceId = requestedWorkspaceId || sessionWorkspaceId;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const workspace = await dbWorkspace.getWorkspace(workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await dbAuth.getUserById(session.user.userId);

  return NextResponse.json({ workspace, user });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const workspaceId = body.workspaceId;
  const auth = await requireAuth(request, {
    requiredRole: "admin",
    workspaceIdOverride: workspaceId,
  });
  if (!auth.ok) return auth.response;

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { ...updates } = body;

  try {
    const workspace = await dbWorkspace.updateWorkspace(
      workspaceId ?? auth.workspaceId,
      updates
    );
    return NextResponse.json(workspace);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
