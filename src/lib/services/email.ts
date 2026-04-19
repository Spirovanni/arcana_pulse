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
