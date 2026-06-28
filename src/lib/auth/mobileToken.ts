import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { MembershipType, UserRole } from "@/lib/types";
import { isMobileTokenRevoked } from "@/lib/services/mobileTokenRevocations";

type MobileTokenPayload = {
  userId: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  membershipType: MembershipType;
};

export type MobileTokenClaims = MobileTokenPayload & {
  iss: "arcana-pulse";
  aud: "mobile-app";
  iat: number;
  exp: number;
  jti?: string;
};

const TOKEN_VERSION = "apm1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = normalized + (padding ? "=".repeat(4 - padding) : "");
  return Buffer.from(padded, "base64").toString("utf8");
}

function getTokenSecret(): string {
  const secret = process.env.MOBILE_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing MOBILE_AUTH_SECRET or NEXTAUTH_SECRET");
  }
  return secret;
}

function signData(payloadPart: string, bodyPart: string): string {
  return createHmac("sha256", getTokenSecret())
    .update(`${payloadPart}.${bodyPart}`)
    .digest("base64url");
}

export function signMobileAccessToken(
  payload: MobileTokenPayload,
  ttlSeconds = DEFAULT_TTL_SECONDS
): { token: string; expiresAt: string } {
  const now = Math.floor(Date.now() / 1000);
  const claims: MobileTokenClaims = {
    ...payload,
    iss: "arcana-pulse",
    aud: "mobile-app",
    iat: now,
    exp: now + ttlSeconds,
    jti: randomUUID(),
  };

  const headerPart = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: TOKEN_VERSION }));
  const claimsPart = encodeBase64Url(JSON.stringify(claims));
  const signaturePart = signData(headerPart, claimsPart);

  return {
    token: `${headerPart}.${claimsPart}.${signaturePart}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

export function verifyMobileAccessToken(token: string): MobileTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, claimsPart, signaturePart] = parts;
  const expectedSignature = signData(headerPart, claimsPart);

  const actualSig = Buffer.from(signaturePart, "utf8");
  const expectedSig = Buffer.from(expectedSignature, "utf8");

  if (
    actualSig.length !== expectedSig.length ||
    !timingSafeEqual(actualSig, expectedSig)
  ) {
    return null;
  }

  try {
    const header = JSON.parse(decodeBase64Url(headerPart)) as {
      alg?: string;
      typ?: string;
    };
    if (header.alg !== "HS256" || header.typ !== TOKEN_VERSION) {
      return null;
    }

    const claims = JSON.parse(decodeBase64Url(claimsPart)) as MobileTokenClaims;
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now || claims.iss !== "arcana-pulse" || claims.aud !== "mobile-app") {
      return null;
    }
    if (!claims.userId || !claims.workspaceId || !claims.email || !claims.role) {
      return null;
    }
    if (claims.jti && isMobileTokenRevoked(claims.jti)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function extractBearerTokenFromHeader(
  authorizationHeader: string | null
): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
