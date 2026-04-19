import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { User } from "@/lib/types";
import type { Models } from "node-appwrite";
import { generateId } from "@/lib/utils";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { encryptSafe, decryptSafe } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toUser(doc: Models.Document & Record<string, any>): User {
  return {
    userId: doc.$id,
    workspaceId: doc.workspaceId,
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    imageUrl: doc.imageUrl ?? undefined,
    role: doc.role,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function createSession(userId: string): Promise<string> {
  const token = `sess_${generateId("s")}_${Date.now().toString(36)}`;
  const expiresAt = new Date(Date.now() + SESSION_TTL).toISOString();

  await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.sessions,
    generateId("sess"),
    { userId, token, expiresAt }
  );

  return token;
}

export async function validateSession(
  token: string
): Promise<{ valid: true; userId: string } | { valid: false }> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.sessions,
    [Query.equal("token", token), Query.limit(1)]
  );

  if (result.documents.length === 0) return { valid: false };

  const session = result.documents[0];
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    // Clean up expired session
    await getDatabase().deleteDocument(
      DATABASE_ID,
      COLLECTIONS.sessions,
      session.$id
    );
    return { valid: false };
  }

  return { valid: true, userId: session.userId };
}

export async function destroySession(token: string): Promise<void> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.sessions,
    [Query.equal("token", token), Query.limit(1)]
  );
  if (result.documents.length > 0) {
    await getDatabase().deleteDocument(
      DATABASE_ID,
      COLLECTIONS.sessions,
      result.documents[0].$id
    );
  }
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function signUp(
  input: SignUpInput
): Promise<{ user: User; sessionToken: string }> {
  // Check for existing user
  const existing = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.users,
    [Query.equal("email", input.email.toLowerCase()), Query.limit(1)]
  );
  if (existing.documents.length > 0) {
    throw new Error("An account with this email already exists");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const userId = generateId("usr");

  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId,
    {
      workspaceId: "ws-001", // TODO: create per-user workspace
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "owner",
    }
  );

  const sessionToken = await createSession(userId);
  return { user: toUser(doc), sessionToken };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; sessionToken: string }> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.users,
    [Query.equal("email", email.toLowerCase()), Query.limit(1)]
  );

  if (result.documents.length === 0) {
    throw new Error("Invalid email or password");
  }

  const doc = result.documents[0];
  const valid = await bcrypt.compare(password, doc.passwordHash);
  if (!valid) throw new Error("Invalid email or password");

  const sessionToken = await createSession(doc.$id);
  return { user: toUser(doc), sessionToken };
}

// ---------------------------------------------------------------------------
// User lookup
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.users,
      userId
    );
    return toUser(doc);
  } catch {
    return null;
  }
}

export async function getSessionUser(token: string): Promise<User | null> {
  const result = await validateSession(token);
  if (!result.valid) return null;
  return getUserById(result.userId);
}

// ---------------------------------------------------------------------------
// Email verification tokens
// ---------------------------------------------------------------------------

const VERIFICATION_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function createVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL).toISOString();

  await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.verificationTokens,
    generateId("vtk"),
    { token, userId, email: email.toLowerCase(), expiresAt }
  );

  return token;
}

export async function verifyEmailToken(
  token: string
): Promise<{ userId: string; email: string }> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.verificationTokens,
    [Query.equal("token", token), Query.limit(1)]
  );

  if (result.documents.length === 0) {
    throw new Error("Invalid or expired verification token");
  }

  const doc = result.documents[0];

  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await getDatabase().deleteDocument(
      DATABASE_ID,
      COLLECTIONS.verificationTokens,
      doc.$id
    );
    throw new Error("Verification token has expired");
  }

  // Delete the used token
  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.verificationTokens,
    doc.$id
  );

  return { userId: doc.userId, email: doc.email };
}

export async function markEmailVerified(userId: string): Promise<void> {
  await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId,
    { emailVerified: true }
  );
}

// ---------------------------------------------------------------------------
// Password reset tokens
// ---------------------------------------------------------------------------

const RESET_TTL = 60 * 60 * 1000; // 1 hour

export async function createPasswordResetToken(
  email: string
): Promise<{ token: string; userId: string; firstName: string } | null> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.users,
    [Query.equal("email", email.toLowerCase()), Query.limit(1)]
  );

  if (result.documents.length === 0) {
    return null; // Don't reveal whether email exists
  }

  const user = result.documents[0];
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + RESET_TTL).toISOString();

  await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.resetTokens,
    generateId("rtk"),
    { token, userId: user.$id, expiresAt }
  );

  return { token, userId: user.$id, firstName: user.firstName };
}

export async function verifyResetToken(
  token: string
): Promise<{ userId: string }> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.resetTokens,
    [Query.equal("token", token), Query.limit(1)]
  );

  if (result.documents.length === 0) {
    throw new Error("Invalid or expired reset token");
  }

  const doc = result.documents[0];

  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await getDatabase().deleteDocument(
      DATABASE_ID,
      COLLECTIONS.resetTokens,
      doc.$id
    );
    throw new Error("Reset token has expired");
  }

  // Delete the used token
  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.resetTokens,
    doc.$id
  );

  return { userId: doc.userId };
}

export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId,
    { passwordHash }
  );
}

// ---------------------------------------------------------------------------
// MFA / TOTP
// ---------------------------------------------------------------------------

import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";

const MFA_PENDING_TTL = 10 * 60 * 1000; // 10 minutes

function totpVerify(token: string, secret: string): boolean {
  const result = verifySync({ token, secret, strategy: "totp" });
  return typeof result === "object" ? result.valid : !!result;
}

function generateRecoveryCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 3 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    ).join("-")
  );
}

/** Generate a new TOTP secret and OTPAuth URI for QR code display. */
export async function generateMfaSetup(
  userId: string,
  email: string
): Promise<{ secret: string; otpauthUrl: string }> {
  const secret = otpGenerateSecret();
  const otpauthUrl = generateURI({
    label: email,
    issuer: "Arcana Pulse",
    secret,
    strategy: "totp",
  });

  // Encrypt before storing so the raw TOTP secret never lives in plaintext in DB
  await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId,
    { mfaSecretPending: encryptSafe(secret) }
  );

  return { secret, otpauthUrl };
}

/** Verify pending TOTP code and enable MFA, storing secret + recovery codes. */
export async function enableMfa(
  userId: string,
  code: string
): Promise<{ recoveryCodes: string[] }> {
  const doc = await getDatabase().getDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId
  );

  const pendingEncrypted = (doc as any).mfaSecretPending;
  if (!pendingEncrypted) throw new Error("No pending MFA setup found");

  const pending = decryptSafe(pendingEncrypted);
  if (!totpVerify(code, pending)) throw new Error("Invalid verification code");

  const recoveryCodes = generateRecoveryCodes();

  await getDatabase().updateDocument(DATABASE_ID, COLLECTIONS.users, userId, {
    mfaEnabled: true,
    mfaSecret: encryptSafe(pending),
    mfaSecretPending: null,
    mfaRecoveryCodes: JSON.stringify(recoveryCodes),
  });

  return { recoveryCodes };
}

/** Disable MFA for the user. */
export async function disableMfa(userId: string): Promise<void> {
  await getDatabase().updateDocument(DATABASE_ID, COLLECTIONS.users, userId, {
    mfaEnabled: false,
    mfaSecret: null,
    mfaRecoveryCodes: null,
  });
}

/** Verify a TOTP code (or recovery code) during sign-in. */
export async function verifyMfaCode(
  userId: string,
  code: string
): Promise<void> {
  const doc = await getDatabase().getDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId
  );

  const secretEncrypted = (doc as any).mfaSecret;
  if (!secretEncrypted) throw new Error("MFA not configured");

  const secret = decryptSafe(secretEncrypted);

  // Check TOTP first
  if (totpVerify(code, secret)) return;

  // Check recovery codes
  const stored: string[] = JSON.parse((doc as any).mfaRecoveryCodes ?? "[]");
  const normalized = code.toUpperCase().replace(/\s/g, "");
  const idx = stored.indexOf(normalized);
  if (idx === -1) throw new Error("Invalid MFA code");

  // Burn the used recovery code
  stored.splice(idx, 1);
  await getDatabase().updateDocument(DATABASE_ID, COLLECTIONS.users, userId, {
    mfaRecoveryCodes: JSON.stringify(stored),
  });
}

/** Check if a user has MFA enabled (used in authorize). */
export async function getUserMfaStatus(
  userId: string
): Promise<{ mfaEnabled: boolean }> {
  const doc = await getDatabase().getDocument(
    DATABASE_ID,
    COLLECTIONS.users,
    userId
  );
  return { mfaEnabled: !!(doc as any).mfaEnabled };
}

/** Create a short-lived pending MFA token after password verification. */
export async function createMfaPendingToken(userId: string): Promise<string> {
  const token = `mfa_${generateId("p")}_${Date.now().toString(36)}`;
  const expiresAt = new Date(Date.now() + MFA_PENDING_TTL).toISOString();

  await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.mfaPending,
    generateId("mfap"),
    { userId, token, expiresAt }
  );

  return token;
}

/** Validate and consume a pending MFA token, returning the userId. */
export async function consumeMfaPendingToken(
  token: string
): Promise<string> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.mfaPending,
    [Query.equal("token", token), Query.limit(1)]
  );

  if (result.documents.length === 0) throw new Error("Invalid MFA session");

  const doc = result.documents[0];

  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    await getDatabase().deleteDocument(
      DATABASE_ID,
      COLLECTIONS.mfaPending,
      doc.$id
    );
    throw new Error("MFA session expired");
  }

  await getDatabase().deleteDocument(
    DATABASE_ID,
    COLLECTIONS.mfaPending,
    doc.$id
  );

  return doc.userId;
}
