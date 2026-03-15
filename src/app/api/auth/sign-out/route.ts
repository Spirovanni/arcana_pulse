import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("arcana_session")?.value;
  if (token) {
    destroySession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("arcana_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
