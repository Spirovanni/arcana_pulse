/**
 * Platform admin guard for /api/admin/* routes.
 *
 * Platform admins are distinct from workspace-level owners/admins.
 * They are identified by user IDs listed in the ADMIN_USER_IDS env var
 * (comma-separated). This keeps platform access out of the app's data model
 * and in secure server configuration.
 *
 * Usage:
 *   const admin = await requirePlatformAdmin(request);
 *   if (!admin.ok) return admin.response;
 *   const { userId, email } = admin;
 */

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type AdminAuthSuccess = {
  ok: true;
  userId: string;
  email: string;
};

export type AdminAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

function getPlatformAdminIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function requirePlatformAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  const user = session.user as { userId?: string; email?: string };
  const userId = user.userId ?? "";
  const email = user.email ?? "";

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid session" }, { status: 401 }),
    };
  }

  const adminIds = getPlatformAdminIds();
  const adminEmails = getPlatformAdminEmails();
  const emailNormalized = email.toLowerCase();

  if (!adminIds.has(userId) && !adminEmails.has(emailNormalized)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Platform admin access required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId, email };
}

/**
 * Client-side: checks if the current user is a platform admin.
 * Calls /api/admin/me which validates admin status server-side.
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/me");
    return res.ok;
  } catch {
    return false;
  }
}
