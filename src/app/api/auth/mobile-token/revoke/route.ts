import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerTokenFromHeader,
  verifyMobileAccessToken,
} from "@/lib/auth/mobileToken";
import { revokeMobileToken } from "@/lib/services/mobileTokenRevocations";

export async function POST(request: NextRequest) {
  const rawToken = extractBearerTokenFromHeader(
    request.headers.get("authorization")
  );
  if (!rawToken) {
    return NextResponse.json(
      { error: "Bearer token required" },
      { status: 401 }
    );
  }

  const claims = verifyMobileAccessToken(rawToken);
  if (!claims) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!claims.jti) {
    return NextResponse.json(
      { error: "Token is not revocation-capable" },
      { status: 400 }
    );
  }

  revokeMobileToken(claims.jti, claims.exp);
  return NextResponse.json({ success: true });
}
