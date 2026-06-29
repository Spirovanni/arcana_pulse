import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/withAdmin";
import {
  searchUsers,
  listRecentUsers,
  updateAdminUser,
} from "@/lib/services/db/admin";

export async function GET(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    if (q.length >= 2) {
      const result = await searchUsers(q, limit);
      return NextResponse.json(result);
    }

    const result = await listRecentUsers(limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load users";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const UpdateAdminUserSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member", "viewer"]).optional(),
  membershipType: z.enum(["standard", "student", "employer"]).optional(),
  emailVerified: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const parsed = UpdateAdminUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, ...updates } = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields provided to update" }, { status: 400 });
  }

  try {
    const user = await updateAdminUser(userId, updates);
    if (!user) {
      return NextResponse.json({ error: "User not found or update failed" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
