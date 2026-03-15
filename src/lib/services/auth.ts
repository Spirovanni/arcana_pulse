import type { User } from "@/lib/types";
import { mockUser } from "@/lib/mock/data";
import { generateId } from "@/lib/utils";

// ─── In-memory stores (mock persistence) ────────────────────────────
// Structured for future replacement with Appwrite auth.

interface StoredUser extends User {
  passwordHash: string;
}

let users: StoredUser[] = [
  { ...mockUser, passwordHash: hashPassword("password123") },
];

// Session store: token → userId
const sessions = new Map<string, { userId: string; expiresAt: number }>();

// ─── Password hashing (mock — NOT production-safe) ──────────────────
// In production, use bcrypt/argon2 via Appwrite auth.

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `mock_hash_${Math.abs(hash).toString(36)}`;
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ─── Session management ─────────────────────────────────────────────

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

function generateSessionToken(): string {
  return `sess_${generateId("s")}_${Date.now().toString(36)}`;
}

export function createSession(userId: string): string {
  const token = generateSessionToken();
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL,
  });
  return token;
}

export function validateSession(
  token: string
): { valid: true; userId: string } | { valid: false } {
  const session = sessions.get(token);
  if (!session) return { valid: false };
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return { valid: false };
  }
  return { valid: true, userId: session.userId };
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

// ─── Auth actions ───────────────────────────────────────────────────

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function signUp(
  input: SignUpInput
): { user: User; sessionToken: string } {
  const existing = users.find(
    (u) => u.email.toLowerCase() === input.email.toLowerCase()
  );
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const now = new Date().toISOString();
  const stored: StoredUser = {
    userId: generateId("usr"),
    workspaceId: "ws-001", // In production, create a new workspace per user
    email: input.email.toLowerCase(),
    firstName: input.firstName,
    lastName: input.lastName,
    role: "owner",
    createdAt: now,
    updatedAt: now,
    passwordHash: hashPassword(input.password),
  };

  users = [...users, stored];
  const sessionToken = createSession(stored.userId);

  const { passwordHash: _, ...user } = stored;
  void _;
  return { user, sessionToken };
}

export function signIn(
  email: string,
  password: string
): { user: User; sessionToken: string } {
  const stored = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (!stored || !verifyPassword(password, stored.passwordHash)) {
    throw new Error("Invalid email or password");
  }

  const sessionToken = createSession(stored.userId);
  const { passwordHash: _, ...user } = stored;
  void _;
  return { user, sessionToken };
}

// ─── User lookup ────────────────────────────────────────────────────

export function getUserById(userId: string): User | null {
  const stored = users.find((u) => u.userId === userId);
  if (!stored) return null;
  const { passwordHash: _, ...user } = stored;
  void _;
  return user;
}

export function getSessionUser(token: string): User | null {
  const result = validateSession(token);
  if (!result.valid) return null;
  return getUserById(result.userId);
}
