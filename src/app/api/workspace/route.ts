import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbWorkspace from "@/lib/services/db/workspace";

export async function GET(request: NextRequest) {
  const workspaceId =
    request.nextUrl.searchParams.get("id") ?? "ws-001";

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

  const user = await dbWorkspace.getUserByWorkspace(workspaceId);

  return NextResponse.json({ workspace, user });
}

export async function PATCH(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { workspaceId, ...updates } = body;

  try {
    const workspace = await dbWorkspace.updateWorkspace(
      workspaceId ?? "ws-001",
      updates
    );
    return NextResponse.json(workspace);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
