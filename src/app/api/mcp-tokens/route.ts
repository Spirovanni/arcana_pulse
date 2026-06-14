import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/withAuth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { generateMcpToken, listMcpTokens } from "@/lib/services/db/mcpTokens";

const CreateTokenSchema = z.object({
  label: z.string().min(1).max(100).default("MCP Token"),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  try {
    const tokens = await listMcpTokens(session.user.userId);
    // Never return tokenHash to the client
    const safe = tokens.map(({ tokenHash: _h, ...t }) => t);
    return NextResponse.json({ tokens: safe });
  } catch (err) {
    console.error("[GET /api/mcp-tokens]", err);
    return NextResponse.json({ error: "Failed to list tokens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = CreateTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  try {
    const { rawToken, token } = await generateMcpToken(session.user.userId, parsed.data.label);
    const { tokenHash: _h, ...safe } = token;
    // rawToken is only returned here — not stored in plaintext anywhere
    return NextResponse.json({ rawToken, token: safe }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/mcp-tokens]", err);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
