import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/accept-invite",
];

// Per-route rate limit configs: [maxRequests, windowMs]
const RATE_LIMITS: Array<{ test: (p: string) => boolean; limit: number; windowMs: number; label: string }> = [
  // Auth mutations — strictest (5 / min)
  {
    test: (p) => p === "/sign-in" || p.startsWith("/api/auth/signin") || p.startsWith("/api/auth/callback"),
    limit: 5,
    windowMs: 60_000,
    label: "auth",
  },
  // Sign-up, password reset (10 / min)
  {
    test: (p) => p === "/sign-up" || p.startsWith("/api/auth/mfa") || p.startsWith("/forgot-password") || p.startsWith("/reset-password"),
    limit: 10,
    windowMs: 60_000,
    label: "auth-secondary",
  },
  // General API (100 / min)
  {
    test: (p) => p.startsWith("/api/"),
    limit: 100,
    windowMs: 60_000,
    label: "api",
  },
];

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateLimitedResponse(retryAfter: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + retryAfter),
      },
    }
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and Next.js internals through
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Apply rate limiting before any auth check
  const ip = getIp(request);
  for (const rule of RATE_LIMITS) {
    if (rule.test(pathname)) {
      const result = rateLimit(`${rule.label}:${ip}`, rule.limit, rule.windowMs);
      if (!result.allowed) {
        return rateLimitedResponse(result.retryAfterSeconds);
      }
      break; // apply only the first matching rule
    }
  }

  // Allow auth API routes through (NextAuth endpoints + custom sign-up)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Cryptographically validate the JWT session token
  const token = await getToken({ req: request });

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/";
  // Auth-only pages that authenticated users should be bounced away from
  const isAuthPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated user trying to access protected route → redirect to sign-in
  if (!token && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user on /sign-in, /sign-up etc. → redirect to correct dashboard
  // (but allow authenticated users to visit / landing page via logo click)
  if (token && isAuthPage) {
    let targetPath = "/dashboard";
    if (token.membershipType === "student") targetPath = "/intelligence/career";
    if (token.membershipType === "employer") targetPath = "/employer/dashboard";
    const dashboardUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Intercept pure /dashboard routes for special personas
  if (token && pathname === "/dashboard") {
    if (token.membershipType === "student") {
      return NextResponse.redirect(new URL("/intelligence/career", request.url));
    }
    if (token.membershipType === "employer") {
      return NextResponse.redirect(new URL("/employer/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
