import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

// ---------------------------------------------------------------------------
// Route configuration
// ---------------------------------------------------------------------------

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

// Routes that must be openly accessible to cross-origin clients (MCP tools, OAuth discovery)
const CORS_OPEN_PATHS = ["/api/mcp", "/.well-known/"];

// Per-route rate limit configs (first match wins).
// Note: method is checked by the caller — GET page navigations skip mutation limits.
const RATE_LIMITS: Array<{
  test: (p: string, method: string) => boolean;
  limit: number;
  windowMs: number;
  label: string;
}> = [
  // Auth mutations — strictest (5 / min) — POST/PUT only, not GET page loads
  {
    test: (p, m) =>
      m !== "GET" &&
      (p.startsWith("/api/auth/signin") ||
        p.startsWith("/api/auth/callback") ||
        p === "/api/auth/register"),
    limit: 5,
    windowMs: 60_000,
    label: "auth",
  },
  // Sign-up, password reset (10 / min) — API mutations only
  {
    test: (p, m) =>
      m !== "GET" &&
      (p.startsWith("/api/auth/mfa") ||
        p.startsWith("/api/auth/forgot-password") ||
        p.startsWith("/api/auth/reset-password")),
    limit: 10,
    windowMs: 60_000,
    label: "auth-secondary",
  },
  // MCP endpoint — tighter than general API to deter abuse
  {
    test: (p) => p === "/api/mcp",
    limit: 30,
    windowMs: 60_000,
    label: "mcp",
  },
  // Alpaca order placement — strict to prevent burst submits
  {
    test: (p, m) => m === "POST" && p === "/api/alpaca/orders",
    limit: 8,
    windowMs: 60_000,
    label: "alpaca-orders",
  },
  // Alpaca symbol search can be chatty while typing
  {
    test: (p) => p === "/api/alpaca/assets",
    limit: 40,
    windowMs: 60_000,
    label: "alpaca-assets",
  },
  // Other Alpaca endpoints — protect provider quota before global API fallback
  {
    test: (p) => p.startsWith("/api/alpaca/"),
    limit: 80,
    windowMs: 60_000,
    label: "alpaca",
  },
  // General API (100 / min)
  {
    test: (p) => p.startsWith("/api/"),
    limit: 100,
    windowMs: 60_000,
    label: "api",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Validate the request Origin header for non-open API routes.
 * Rejects requests whose origin does not match the configured app URL.
 * Same-origin requests (no Origin header) are always allowed.
 */
function isCrossOriginAllowed(request: NextRequest, pathname: string): boolean {
  // Open CORS paths skip origin validation
  if (CORS_OPEN_PATHS.some((p) => pathname.startsWith(p))) return true;

  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin browser requests omit the header

  const appUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  try {
    const appOrigin = new URL(appUrl).origin;
    return origin === appOrigin;
  } catch {
    return false;
  }
}

/**
 * Add CORS headers for open paths (MCP + well-known discovery).
 */
function applyCorsHeaders(response: NextResponse, pathname: string): NextResponse {
  if (!CORS_OPEN_PATHS.some((p) => pathname.startsWith(p))) return response;

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const httpMethod = request.method;

  // ── Static assets ─────────────────────────────────────────────────────────
  if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // ── Force HTTPS + canonical www in production ─────────────────────────────
  // Handles cases where Vercel's edge redirect hasn't run yet (e.g. first visit,
  // direct HTTP navigation). Both redirects are permanent (308) so browsers cache
  // them and browsers that support HSTS preload won't need them on repeat visits.
  if (process.env.NODE_ENV === "production") {
    const proto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host") ?? "";

    // Redirect HTTP → HTTPS
    if (proto === "http") {
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = "https:";
      const res = NextResponse.redirect(httpsUrl, { status: 308 });
      res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      return res;
    }

    // Redirect apex domain → www
    if (host === "arcanapulse.ai") {
      const wwwUrl = new URL(request.url);
      wwwUrl.host = "www.arcanapulse.ai";
      const res = NextResponse.redirect(wwwUrl, { status: 308 });
      res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      return res;
    }
  }

  // ── Preflight (OPTIONS) for CORS-open routes ──────────────────────────────
  if (httpMethod === "OPTIONS" && CORS_OPEN_PATHS.some((p) => pathname.startsWith(p))) {
    const preflight = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(preflight, pathname);
  }

  // ── Auth API routes pass through without CORS/rate-limit interference ────
  // NextAuth handles its own CSRF + callback validation internally.
  if (pathname.startsWith("/api/auth/")) {
    return applyCorsHeaders(NextResponse.next(), pathname);
  }

  // ── Rate limiting (before auth check) ────────────────────────────────────
  const ip = getIp(request);
  for (const rule of RATE_LIMITS) {
    if (rule.test(pathname, httpMethod)) {
      const result = rateLimit(`${rule.label}:${ip}`, rule.limit, rule.windowMs);
      if (!result.allowed) {
        return rateLimitedResponse(result.retryAfterSeconds);
      }
      break;
    }
  }

  // ── CORS origin validation for non-open API routes ────────────────────────
  if (pathname.startsWith("/api/") && !isCrossOriginAllowed(request, pathname)) {
    return new NextResponse(
      JSON.stringify({ error: "Cross-origin request not allowed" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── MCP endpoint — auth is handled inside the route handler ──────────────
  if (pathname === "/api/mcp") {
    return applyCorsHeaders(NextResponse.next(), pathname);
  }

  // ── Well-known discovery endpoints ───────────────────────────────────────
  if (pathname.startsWith("/.well-known/")) {
    return applyCorsHeaders(NextResponse.next(), pathname);
  }

  // ── Session validation ────────────────────────────────────────────────────
  const token = await getToken({ req: request });

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/";
  const isAuthPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Unauthenticated → sign-in
  if (!token && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user on auth pages → redirect to appropriate dashboard
  if (token && isAuthPage) {
    let targetPath = "/dashboard";
    if (token.membershipType === "student") targetPath = "/intelligence/career";
    if (token.membershipType === "employer") targetPath = "/employer/dashboard";
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  // Persona-based dashboard redirect
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
