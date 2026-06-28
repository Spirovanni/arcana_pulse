import { API_BASE_URL } from "./config";
import { clearAuthSession, readAuthSession, writeAuthSession } from "./storage";

export type MobileSession = {
  accessToken: string;
  expiresAt: string;
  user: {
    userId: string;
    workspaceId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    membershipType: string;
    imageUrl?: string | null;
  };
};

function isExpired(expiresAt: string): boolean {
  const expiry = Date.parse(expiresAt);
  if (Number.isNaN(expiry)) return true;
  return Date.now() >= expiry - 60_000;
}

export async function signInMobileSession(params: {
  email: string;
  password: string;
  mfaCode?: string;
}): Promise<MobileSession> {
  const response = await fetch(`${API_BASE_URL}/api/auth/mobile-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    accessToken?: string;
    expiresAt?: string;
    user?: MobileSession["user"];
  };

  if (!response.ok || !payload.accessToken || !payload.expiresAt || !payload.user) {
    throw new Error(payload.error ?? "Unable to sign in");
  }

  const session: MobileSession = {
    accessToken: payload.accessToken,
    expiresAt: payload.expiresAt,
    user: payload.user,
  };
  await writeAuthSession(session);
  return session;
}

export async function getMobileSession(): Promise<MobileSession | null> {
  const session = await readAuthSession<MobileSession>();
  if (!session) return null;
  if (isExpired(session.expiresAt)) {
    await clearAuthSession();
    return null;
  }
  return session;
}

export async function getMobileAccessToken(): Promise<string | null> {
  const session = await getMobileSession();
  return session?.accessToken ?? null;
}

export async function signOutMobileSession(): Promise<void> {
  const session = await readAuthSession<MobileSession>();
  if (session?.accessToken) {
    await fetch(`${API_BASE_URL}/api/auth/mobile-token/revoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    }).catch(() => undefined);
  }
  await clearAuthSession();
}
