import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("arcana_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = getSessionUser(token);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
