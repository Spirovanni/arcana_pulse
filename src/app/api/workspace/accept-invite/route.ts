import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { acceptInvite } from "@/lib/services/members";

export async function POST(request: NextRequest) {
  const { token } = await request.json() as { token: string };
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Sign in to accept this invitation" }, { status: 401 });

  const userId = session.user.userId;
  const email = session.user.email ?? "";
  const firstName = session.user.firstName ?? "User";
  const lastName = session.user.lastName ?? "";

  try {
    const member = acceptInvite(token, userId, firstName, lastName, email);
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Accept failed" }, { status: 400 });
  }
}
