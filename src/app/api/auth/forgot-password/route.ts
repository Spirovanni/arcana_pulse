import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import { createPasswordResetToken } from "@/lib/services/db/auth";
import { sendPasswordResetEmail } from "@/lib/services/email";

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Always return success to prevent email enumeration
    const result = await createPasswordResetToken(email);

    if (result) {
      try {
        await sendPasswordResetEmail(email, result.firstName, result.token);
      } catch {
        // Log but don't expose email sending failures
      }
    }

    return NextResponse.json({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Password reset request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
