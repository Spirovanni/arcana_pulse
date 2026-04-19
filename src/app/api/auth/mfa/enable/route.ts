import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { enableMfa } from "@/lib/services/db/auth";

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite is not configured" }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = (await request.json()) as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const { recoveryCodes } = await enableMfa(session.user.userId, code.trim());
    return NextResponse.json({ recoveryCodes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to enable MFA" },
      { status: 400 }
    );
  }
}
