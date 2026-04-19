import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { disableMfa } from "@/lib/services/db/auth";

export async function POST(_request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite is not configured" }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disableMfa(session.user.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disable MFA" },
      { status: 500 }
    );
  }
}
