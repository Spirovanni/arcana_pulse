import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/withAdmin";
import { listFeatureFlags, updateFeatureFlag } from "@/lib/services/db/admin";

export async function GET(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const flags = await listFeatureFlags();
    return NextResponse.json({ flags });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load feature flags";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const UpdateFlagSchema = z.object({
  flagId: z.string().min(1),
  enabled: z.boolean().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const parsed = UpdateFlagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { flagId, ...updates } = parsed.data;

  try {
    const updated = await updateFeatureFlag(flagId, updates, admin.email);
    if (!updated) {
      return NextResponse.json({ error: "Flag not found or update failed" }, { status: 404 });
    }
    return NextResponse.json({ flag: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update feature flag";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
