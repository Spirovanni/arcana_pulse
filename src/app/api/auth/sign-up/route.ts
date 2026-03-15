import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, password } = body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    };

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const { user, sessionToken } = signUp({
      firstName,
      lastName,
      email,
      password,
    });

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
      error instanceof Error ? error.message : "Sign up failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
