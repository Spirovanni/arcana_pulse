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
