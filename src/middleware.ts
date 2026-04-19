import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/sign-in",
  "/sign-up",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and Next.js internals through
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Allow auth API routes through (NextAuth endpoints + custom sign-up)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Cryptographically validate the JWT session token
  const token = await getToken({ req: request });

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/";

  // Unauthenticated user trying to access protected route → redirect to sign-in
  if (!token && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user trying to access public pages (like / or /sign-in) → redirect to dashboard
  if (token && isPublicPath) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
