import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createInvite, canInvite, getMembersByWorkspace } from "@/lib/services/members";
import { sendEmail } from "@/lib/services/email";
import { getWorkspace } from "@/lib/services/workspace";
import { canAddWorkspaceMember } from "@/lib/planLimits";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canInvite(session.user.role)) {
    return NextResponse.json({ error: "Only owners and admins can invite members" }, { status: 403 });
  }

  const body = await request.json() as { email: string; role: UserRole; workspaceId?: string };
  const { email, role, workspaceId = "ws-001" } = body;

  if (!email || !role) return NextResponse.json({ error: "email and role required" }, { status: 400 });

  const validRoles: UserRole[] = ["admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, member, or viewer" }, { status: 400 });
  }

  // ── Plan enforcement: member limit ──────────────────────────────────────
  const workspace = getWorkspace(workspaceId);
  if (workspace) {
    const currentMembers = getMembersByWorkspace(workspaceId);
    const check = canAddWorkspaceMember(workspace.plan, currentMembers.length);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason, planLimit: true }, { status: 403 });
    }
  }

  const userId = session.user.userId;
  const invite = createInvite(workspaceId, userId, email, role);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${appUrl}/accept-invite?token=${invite.token}`;

  try {
    await sendEmail({
      to: email,
      subject: "You've been invited to Arcana Pulse",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #fff; border: 1px solid #222;">
          <h1 style="font-size: 24px; font-weight: 300; letter-spacing: -0.5px; color: #C5A059; margin-bottom: 16px;">Arcana Pulse</h1>
          <p style="color: #888; font-size: 14px; margin-bottom: 24px;">
            ${session.user.firstName} ${session.user.lastName} has invited you to join their workspace as <strong style="color: #fff;">${role}</strong>.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; background: transparent; border: 1px solid #C5A059; color: #C5A059; padding: 12px 24px; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">
            Accept Invitation
          </a>
          <p style="color: #555; font-size: 11px; margin-top: 24px;">
            This invitation expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch {
    // Email failure doesn't block the invite — return the accept URL so owner can share manually
    return NextResponse.json({ invite, acceptUrl, emailSent: false });
  }

  return NextResponse.json({ invite, acceptUrl, emailSent: true }, { status: 201 });
}
