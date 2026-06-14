import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/withAuth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { getUserResources, createUserResource } from "@/lib/services/db/resources";
import { logAuditEvent } from "@/lib/services/db/auditLog";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const CreateResourceSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Title is required").max(500),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  resourceType: z
    .enum(["documentation", "grant", "writing", "finance", "code", "reference", "other"])
    .optional(),
  projectKey: z.string().max(100).optional(),
  source: z.enum(["manual", "mcp", "import"]).optional(),
});

// ---------------------------------------------------------------------------
// GET /api/resources — list authenticated user's resources
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "viewer", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const userId = session.user.userId;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  const sp = request.nextUrl.searchParams;
  try {
    const resources = await getUserResources(userId, {
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
      query: sp.get("query") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      projectKey: sp.get("projectKey") ?? undefined,
    });

    return NextResponse.json({ resources });
  } catch (err) {
    console.error("[GET /api/resources]", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/resources — create a resource
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;
  const userId = session.user.userId;

  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const resource = await createUserResource(userId, {
      ...parsed.data,
      source: parsed.data.source ?? "manual",
    });

    void logAuditEvent({
      workspaceId: session.user.workspaceId ?? "ws-001",
      userId,
      userEmail: session.user.email,
      action: "settings_change",
      targetEntity: "resource",
      targetId: resource.resourceId,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? "",
      metadata: { url: resource.url, title: resource.title },
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/resources]", err);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}
