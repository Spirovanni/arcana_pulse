import { API_BASE_URL, DEFAULT_WORKSPACE_ID } from "./config";
import { getMobileAccessToken, getMobileSession } from "./auth";
import { readCache, writeCache } from "./storage";
import {
  enqueueOfflineMutation,
  flushOfflineMutations,
  getOfflineSyncStatus,
  type OfflineMutation,
  type OfflineMutationType,
} from "./offlineQueue";

export class MobileAuthError extends Error {}

function isLikelyNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
}

async function authorizedFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getMobileAccessToken();
  if (!token) {
    throw new MobileAuthError("Sign in required");
  }

  const mergedHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: mergedHeaders,
  });

  if (response.status === 401) {
    throw new MobileAuthError("Session expired");
  }

  return response;
}

async function getWithCache<T>(
  path: string,
  cacheKey: string
): Promise<T | null> {
  try {
    const res = await authorizedFetch(path);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = (await res.json()) as T;
    await writeCache(cacheKey, data);
    return data;
  } catch {
    return readCache<T>(cacheKey);
  }
}

async function resolveWorkspaceId(): Promise<string> {
  const session = await getMobileSession();
  return session?.user.workspaceId ?? DEFAULT_WORKSPACE_ID;
}

async function queueMutation(
  type: OfflineMutationType,
  endpoint: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
  workspaceId: string
) {
  return enqueueOfflineMutation({
    type,
    endpoint,
    method,
    body,
    workspaceId,
  });
}

async function executeOfflineMutation(
  mutation: OfflineMutation
): Promise<{ outcome: "success" | "retry" | "conflict"; statusCode?: number; reason?: string }> {
  try {
    const res = await authorizedFetch(mutation.endpoint, {
      method: mutation.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mutation.body),
    });

    if (res.ok) return { outcome: "success" };

    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    const reason = payload.error ?? `HTTP ${res.status}`;

    const isTransactionMutation = mutation.type.startsWith("transaction_");
    if (isTransactionMutation && [400, 404, 409, 412].includes(res.status)) {
      return { outcome: "conflict", statusCode: res.status, reason };
    }
    if (res.status >= 500) {
      return { outcome: "retry", statusCode: res.status, reason };
    }
    return { outcome: "retry", statusCode: res.status, reason };
  } catch (error: unknown) {
    if (error instanceof MobileAuthError) {
      return { outcome: "retry", reason: error.message };
    }
    return {
      outcome: "retry",
      reason: error instanceof Error ? error.message : "Offline queue mutation failed",
    };
  }
}

export async function syncOfflineMutations() {
  return flushOfflineMutations(executeOfflineMutation);
}

export async function getMobileOfflineSyncStatus() {
  return getOfflineSyncStatus();
}

export async function getDashboard() {
  const workspaceId = await resolveWorkspaceId();
  return getWithCache<{ metrics: unknown }>(
    `/api/dashboard?workspaceId=${workspaceId}`,
    "mobile:dashboard"
  );
}

export async function getTransactions() {
  const workspaceId = await resolveWorkspaceId();
  return getWithCache<{ items?: unknown[]; transactions?: unknown[] }>(
    `/api/transactions?workspaceId=${workspaceId}&pageSize=25`,
    "mobile:transactions"
  );
}

export async function getBanks() {
  const workspaceId = await resolveWorkspaceId();
  return getWithCache<{ banks: unknown[] }>(
    `/api/banks?workspaceId=${workspaceId}`,
    "mobile:banks"
  );
}

export async function sendTransfer(payload: {
  amount: number;
  senderBankId: string;
  receiverShareableId: string;
  note?: string;
}) {
  const workspaceId = await resolveWorkspaceId();
  const body = { workspaceId, ...payload } as Record<string, unknown>;
  try {
    const res = await authorizedFetch("/api/dwolla/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status >= 500) throw new Error(data.error ?? `Transfer failed: ${res.status}`);
      return data;
    }
    return res.json();
  } catch (error: unknown) {
    if (error instanceof MobileAuthError) throw error;
    if (isLikelyNetworkError(error) || error instanceof Error) {
      const queued = await queueMutation(
        "transfer_create",
        "/api/dwolla/transfer",
        "POST",
        body,
        workspaceId
      );
      return {
        queued: true,
        queueId: queued.id,
        message: "Transfer queued offline and will sync automatically.",
      };
    }
    throw error;
  }
}

export async function askAssistant(message: string) {
  const workspaceId = await resolveWorkspaceId();
  const body = {
    workspaceId,
    message,
    history: [],
  } as Record<string, unknown>;

  try {
    const res = await authorizedFetch("/api/ai/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status >= 500) throw new Error(data.error ?? `Assistant failed: ${res.status}`);
      return data;
    }
    return res.json();
  } catch (error: unknown) {
    if (error instanceof MobileAuthError) throw error;
    if (isLikelyNetworkError(error) || error instanceof Error) {
      const queued = await queueMutation(
        "assistant_prompt",
        "/api/ai/assistant",
        "POST",
        body,
        workspaceId
      );
      return {
        queued: true,
        queueId: queued.id,
        reply:
          "Your request was queued offline. Arcana will run it automatically when connection returns.",
      };
    }
    throw error;
  }
}

export async function createTransaction(payload: Record<string, unknown>) {
  const workspaceId = await resolveWorkspaceId();
  const body = { workspaceId, ...payload } as Record<string, unknown>;
  try {
    const res = await authorizedFetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status >= 500) throw new Error(data.error ?? "Transaction create failed");
      return data;
    }
    return res.json();
  } catch (error: unknown) {
    if (error instanceof MobileAuthError) throw error;
    const queued = await queueMutation(
      "transaction_create",
      "/api/transactions",
      "POST",
      body,
      workspaceId
    );
    return { queued: true, queueId: queued.id };
  }
}

export async function updateTransaction(
  transactionId: string,
  payload: Record<string, unknown>
) {
  const workspaceId = await resolveWorkspaceId();
  const body = { workspaceId, ...payload } as Record<string, unknown>;
  try {
    const res = await authorizedFetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status >= 500) throw new Error(data.error ?? "Transaction update failed");
      return data;
    }
    return res.json();
  } catch (error: unknown) {
    if (error instanceof MobileAuthError) throw error;
    const queued = await queueMutation(
      "transaction_update",
      `/api/transactions/${transactionId}`,
      "PATCH",
      body,
      workspaceId
    );
    return { queued: true, queueId: queued.id };
  }
}

export async function deleteTransaction(transactionId: string) {
  const workspaceId = await resolveWorkspaceId();
  const body = { workspaceId } as Record<string, unknown>;
  try {
    const res = await authorizedFetch(`/api/transactions/${transactionId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status >= 500) throw new Error(data.error ?? "Transaction delete failed");
      return data;
    }
    return res.json();
  } catch (error: unknown) {
    if (error instanceof MobileAuthError) throw error;
    const queued = await queueMutation(
      "transaction_delete",
      `/api/transactions/${transactionId}`,
      "DELETE",
      body,
      workspaceId
    );
    return { queued: true, queueId: queued.id };
  }
}

export async function registerPushToken(payload: {
  deviceId: string;
  expoPushToken: string;
  platform: "ios" | "android" | "web";
  appVersion?: string;
}) {
  const workspaceId = await resolveWorkspaceId();
  const res = await authorizedFetch("/api/notifications/push-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      ...payload,
    }),
  });
  return res.json();
}

export async function unregisterPushToken(payload: {
  deviceId?: string;
  expoPushToken?: string;
}) {
  const workspaceId = await resolveWorkspaceId();
  const res = await authorizedFetch("/api/notifications/push-token", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId,
      ...payload,
    }),
  });
  return res.json();
}
