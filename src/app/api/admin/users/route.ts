import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/withAdmin";
import { searchUsers, listRecentUsers } from "@/lib/services/db/admin";

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
