import { generateId } from "@/lib/utils";

export type PushPlatform = "ios" | "android" | "web";

export interface PushSubscription {
  pushSubscriptionId: string;
  workspaceId: string;
  userId: string;
  deviceId: string;
  expoPushToken: string;
  platform: PushPlatform;
  appVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const store = new Map<string, PushSubscription>();

function isValidExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[[\w-]+\]$/.test(token);
}

function storeKey(workspaceId: string, userId: string, deviceId: string): string {
  return `${workspaceId}:${userId}:${deviceId}`;
}

export function registerPushSubscription(input: {
  workspaceId: string;
  userId: string;
  deviceId: string;
  expoPushToken: string;
  platform: PushPlatform;
  appVersion?: string;
}): PushSubscription {
  if (!isValidExpoPushToken(input.expoPushToken)) {
    throw new Error("Invalid Expo push token");
  }

  const now = new Date().toISOString();
  const key = storeKey(input.workspaceId, input.userId, input.deviceId);
  const existing = store.get(key);

  const subscription: PushSubscription = existing
    ? {
        ...existing,
        expoPushToken: input.expoPushToken,
        platform: input.platform,
        appVersion: input.appVersion,
        updatedAt: now,
      }
    : {
        pushSubscriptionId: generateId("pushsub"),
        workspaceId: input.workspaceId,
        userId: input.userId,
        deviceId: input.deviceId,
        expoPushToken: input.expoPushToken,
        platform: input.platform,
        appVersion: input.appVersion,
        createdAt: now,
        updatedAt: now,
      };

  store.set(key, subscription);
  return subscription;
}

export function unregisterPushSubscription(input: {
  workspaceId: string;
  userId: string;
  deviceId?: string;
  expoPushToken?: string;
}): number {
  let removed = 0;
  for (const [key, sub] of store.entries()) {
    if (sub.workspaceId !== input.workspaceId || sub.userId !== input.userId) continue;
    if (input.deviceId && sub.deviceId !== input.deviceId) continue;
    if (input.expoPushToken && sub.expoPushToken !== input.expoPushToken) continue;
    store.delete(key);
    removed += 1;
  }
  return removed;
}

function listWorkspaceTokens(workspaceId: string): string[] {
  return Array.from(store.values())
    .filter((sub) => sub.workspaceId === workspaceId)
    .map((sub) => sub.expoPushToken);
}

export async function routePushToWorkspace(
  workspaceId: string,
  payload: PushMessagePayload
): Promise<{ delivered: number; attempted: number }> {
  const tokens = listWorkspaceTokens(workspaceId);
  if (tokens.length === 0) return { attempted: 0, delivered: 0 };

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    return { attempted: tokens.length, delivered: 0 };
  }

  const result = (await response.json().catch(() => ({}))) as {
    data?: Array<{ status?: string }>;
  };
  const delivered =
    result.data?.filter((entry) => entry.status === "ok").length ?? 0;

  return { attempted: tokens.length, delivered };
}
