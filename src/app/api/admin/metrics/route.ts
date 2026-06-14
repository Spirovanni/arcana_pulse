import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/withAdmin";
import { getPlatformMetrics } from "@/lib/services/db/admin";

export async function GET(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const metrics = await getPlatformMetrics();
    return NextResponse.json(metrics);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load metrics";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
