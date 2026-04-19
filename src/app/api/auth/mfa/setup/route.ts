import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { generateMfaSetup } from "@/lib/services/db/auth";
import QRCode from "qrcode";

export async function POST(_request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json({ error: "Appwrite is not configured" }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { secret, otpauthUrl } = await generateMfaSetup(
      session.user.userId,
      session.user.email
    );

    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 200,
      margin: 2,
      color: { dark: "#ffffff", light: "#0f172a" },
    });

    return NextResponse.json({ secret, qrDataUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate MFA setup" },
      { status: 500 }
    );
  }
}
