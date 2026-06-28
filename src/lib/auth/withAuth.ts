/**
 * withAuth — server-side authentication and RBAC enforcement for API routes.
 *
 * Usage:
 *   const auth = await requireAuth(request, { requiredRole: "member" });
 *   if (!auth.ok) return auth.response;
 *   const { session, workspaceId } = auth;
 */

import { getServerSession, type Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { verifyMobileAccessToken } from "@/lib/auth/mobileToken";

// ---------------------------------------------------------------------------
// Role rank — higher number = more privilege
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

// ---------------------------------------------------------------------------
// Auth result discriminated union
// ---------------------------------------------------------------------------

export type AuthSuccess = {
  ok: true;
  session: Session & { user: { userId: string; workspaceId: string; email: string; role: UserRole } };
  workspaceId: string;
};

export type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

function readBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

// ---------------------------------------------------------------------------
// requireAuth — primary guard
// ---------------------------------------------------------------------------

export interface AuthOptions {
  /**
   * Minimum role required to access this route.
   * Defaults to "viewer" (any authenticated user).
   */
  requiredRole?: UserRole;

  /**
   * When true, the workspaceId from the request (query param or body field)
   * must match the authenticated user's workspaceId. Defaults to true.
   *
   * Set to false only for platform-admin routes that legitimately
   * span multiple workspaces.
   */
  enforceWorkspace?: boolean;

  /**
   * Override the workspaceId source. Pass the workspace string directly
   * when you've already parsed it from the request body.
   */
  workspaceIdOverride?: string;
}

/**
 * Authenticate and optionally authorize a Next.js API route handler.
 *
 * Returns `{ ok: true, session, workspaceId }` on success.
 * Returns `{ ok: false, response }` when the caller should short-circuit.
 */
export async function requireAuth(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const {
    requiredRole = "viewer",
    enforceWorkspace = true,
    workspaceIdOverride,
  } = options;

  // 1. Session validation (web session or mobile bearer token)
  let session = await getServerSession(authOptions);

  if (!session?.user) {
    const bearerToken = readBearerToken(request);
    const mobileClaims = bearerToken ? verifyMobileAccessToken(bearerToken) : null;

    if (mobileClaims) {
      session = {
        user: {
          userId: mobileClaims.userId,
          workspaceId: mobileClaims.workspaceId,
          email: mobileClaims.email,
          role: mobileClaims.role,
          membershipType: mobileClaims.membershipType,
          firstName: "",
          lastName: "",
          name: mobileClaims.email,
        },
        expires: new Date(mobileClaims.exp * 1000).toISOString(),
      } as Session;
    }
  }

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  // 2. Role check (principle of least privilege)
  const userRole: UserRole = (session.user as any).role ?? "viewer";
  if (!hasRole(userRole, requiredRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Insufficient permissions",
          required: requiredRole,
          actual: userRole,
        },
        { status: 403 }
      ),
    };
  }

  // 3. Workspace boundary enforcement
  const sessionWorkspaceId: string = (session.user as any).workspaceId ?? "";
  const requestedWorkspaceId =
    workspaceIdOverride ??
    request.nextUrl.searchParams.get("workspaceId") ??
    "";

  if (enforceWorkspace && requestedWorkspaceId) {
    // Owners and admins may access any workspace they belong to.
    // Members and viewers are strictly scoped to their own workspace.
    const isCrossWorkspace = requestedWorkspaceId !== sessionWorkspaceId;
    const isPrivileged = hasRole(userRole, "admin");

    if (isCrossWorkspace && !isPrivileged) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Access to this workspace is not permitted" },
          { status: 403 }
        ),
      };
    }
  }

  // Use the session workspace when no workspaceId was requested
  const resolvedWorkspaceId =
    requestedWorkspaceId || sessionWorkspaceId || "ws-001";

  return {
    ok: true,
    session: session as AuthSuccess["session"],
    workspaceId: resolvedWorkspaceId,
  };
}

// ---------------------------------------------------------------------------
// requireRole — convenience wrapper that only checks role, no workspace
// ---------------------------------------------------------------------------

export async function requireRole(
  minRole: UserRole
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  const userRole: UserRole = (session.user as any).role ?? "viewer";
  if (!hasRole(userRole, minRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session: session as AuthSuccess["session"],
    workspaceId: (session.user as any).workspaceId ?? "ws-001",
  };
}
