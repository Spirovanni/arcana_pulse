import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { user, sessionToken } = signIn(email, password);

    const response = NextResponse.json({ user });
    response.cookies.set("arcana_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Sign in failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
