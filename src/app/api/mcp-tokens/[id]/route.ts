import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { revokeMcpToken } from "@/lib/services/db/mcpTokens";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const { id: tokenId } = await params;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  try {
    const revoked = await revokeMcpToken(session.user.userId, tokenId);
    if (!revoked) {
      return NextResponse.json({ error: "Token not found or not owned by this user" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/mcp-tokens/[id]]", err);
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }
}
