import { Resend } from "resend";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (_resend) return _resend;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured. Add it to .env.local.");
  }

  _resend = new Resend(apiKey);
  return _resend;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const APP_NAME = "Arcana Pulse";

// ---------------------------------------------------------------------------
// Generic send
// ---------------------------------------------------------------------------

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  await getResendClient().emails.send({
    from: getSenderAddress(),
    to,
    subject,
    html,
  });
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getSenderAddress(): string {
  // Use Resend sandbox default in dev; custom domain in production
  return process.env.EMAIL_FROM ?? "Arcana Pulse <onboarding@resend.dev>";
}

// ---------------------------------------------------------------------------
// Verification email
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<void> {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;

  await getResendClient().emails.send({
    from: getSenderAddress(),
    to: email,
    subject: `Verify your ${APP_NAME} email`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Welcome to ${APP_NAME}, ${firstName}!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Please verify your email address by clicking the button below.
        </p>
        <div style="margin: 32px 0;">
          <a href="${verifyUrl}"
             style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          This link expires in 24 hours. If you didn&apos;t create an account with ${APP_NAME}, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          If the button doesn&apos;t work, copy and paste this URL into your browser:<br />
          <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Workspace invite email (fallback / branded template)
// ---------------------------------------------------------------------------

export async function sendWorkspaceInviteEmail(
  toEmail: string,
  inviterName: string,
  role: string,
  acceptUrl: string
): Promise<void> {
  await getResendClient().emails.send({
    from: getSenderAddress(),
    to: toEmail,
    subject: `You've been invited to join Arcana Pulse`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fff;">
        <h2 style="color: #C5A059; margin-bottom: 8px; font-weight: 300; letter-spacing: -0.5px;">${APP_NAME}</h2>
        <p style="color: #888; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          <strong style="color: #fff;">${inviterName}</strong> has invited you to collaborate as <strong style="color: #fff;">${role}</strong> on their ${APP_NAME} workspace.
        </p>
        <div style="margin: 32px 0;">
          <a href="${acceptUrl}"
             style="display: inline-block; background: transparent; border: 1px solid #C5A059; color: #C5A059; text-decoration: none; padding: 12px 32px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #555; font-size: 12px;">
          This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Billing emails
// ---------------------------------------------------------------------------

export async function sendSubscriptionWelcomeEmail(
  email: string,
  firstName: string,
  planName: string
): Promise<void> {
  const appUrl = getAppUrl();

  await getResendClient().emails.send({
    from: getSenderAddress(),
    to: email,
    subject: `Welcome to ${APP_NAME} ${planName} 🎉`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">You're on the ${planName} plan!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Hi ${firstName}, your subscription to ${APP_NAME} <strong>${planName}</strong> is now active. Here's what you've unlocked:
        </p>
        <ul style="color: #475569; font-size: 14px; line-height: 2; padding-left: 20px;">
          ${planName === "Pro" || planName === "Team" ? `
          <li>Unlimited bank account connections</li>
          <li>Full transaction history</li>
          <li>AI financial insights &amp; forecasting</li>
          <li>Tax-loss harvesting analysis</li>
          <li>CSV &amp; PDF exports</li>
          ` : ""}
          ${planName === "Team" ? `
          <li>Up to 10 workspace members</li>
          <li>1-year audit log</li>
          <li>Dedicated support</li>
          ` : ""}
        </ul>
        <div style="margin: 32px 0;">
          <a href="${appUrl}/dashboard"
             style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          Manage your subscription anytime in <a href="${appUrl}/settings#billing" style="color: #2563eb;">Settings → Billing</a>.
          Questions? Reply to this email and we'll help.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">${APP_NAME} · <a href="${appUrl}/privacy" style="color: #94a3b8;">Privacy</a> · <a href="${appUrl}/terms" style="color: #94a3b8;">Terms</a></p>
      </div>
    `,
  });
}

export async function sendSubscriptionCancelledEmail(
  email: string,
  firstName: string,
  expiresAt: string
): Promise<void> {
  const appUrl = getAppUrl();
  const expiresFormatted = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  await getResendClient().emails.send({
    from: getSenderAddress(),
    to: email,
    subject: `Your ${APP_NAME} subscription has been cancelled`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Subscription Cancelled</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Hi ${firstName}, your ${APP_NAME} paid subscription has been cancelled. You'll keep access to your plan features until <strong>${expiresFormatted}</strong>, then you'll be moved to the free Starter plan.
        </p>
        <div style="margin: 32px 0;">
          <a href="${appUrl}/pricing"
             style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Reactivate Subscription
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
          We're sorry to see you go. If there's anything we can improve, reply to this email — we read every response.
        </p>
      </div>
    `,
  });
}

// ---------------------------------------------------------------------------
// Password reset email
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
): Promise<void> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  await getResendClient().emails.send({
    from: getSenderAddress(),
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">Password Reset</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Hi ${firstName}, we received a request to reset your ${APP_NAME} password. Click the button below to choose a new password.
        </p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
          This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          If the button doesn&apos;t work, copy and paste this URL into your browser:<br />
          <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
    `,
  });
}
