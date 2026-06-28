import AsyncStorage from "@react-native-async-storage/async-storage";

export type OfflineMutationType =
  | "transaction_create"
  | "transaction_update"
  | "transaction_delete"
  | "transfer_create"
  | "assistant_prompt";

export interface OfflineMutation {
  id: string;
  type: OfflineMutationType;
  workspaceId: string;
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface OfflineConflict {
  id: string;
  mutationId: string;
  type: OfflineMutationType;
  workspaceId: string;
  statusCode: number;
  reason: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export type FlushResult = {
  processed: number;
  remaining: number;
  conflicts: number;
};

type MutationExecutionResult = {
  outcome: "success" | "retry" | "conflict";
  statusCode?: number;
  reason?: string;
};

const QUEUE_KEY = "mobile:offline:mutationQueue:v1";
const CONFLICT_KEY = "mobile:offline:conflicts:v1";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

async function readJson<T>(key: string): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [] as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return [] as T;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function enqueueOfflineMutation(
  input: Omit<OfflineMutation, "id" | "createdAt" | "attempts">
): Promise<OfflineMutation> {
  const queue = await readJson<OfflineMutation[]>(QUEUE_KEY);
  const mutation: OfflineMutation = {
    ...input,
    id: makeId("mut"),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  queue.push(mutation);
  await writeJson(QUEUE_KEY, queue);
  return mutation;
}

export async function getOfflineMutations(): Promise<OfflineMutation[]> {
  return readJson<OfflineMutation[]>(QUEUE_KEY);
}

export async function getOfflineConflicts(): Promise<OfflineConflict[]> {
  return readJson<OfflineConflict[]>(CONFLICT_KEY);
}

export async function clearOfflineConflicts(): Promise<void> {
  await writeJson(CONFLICT_KEY, []);
}

export async function getOfflineSyncStatus(): Promise<{
  pendingMutations: number;
  conflictCount: number;
}> {
  const [queue, conflicts] = await Promise.all([
    getOfflineMutations(),
    getOfflineConflicts(),
  ]);
  return {
    pendingMutations: queue.length,
    conflictCount: conflicts.length,
  };
}

export async function flushOfflineMutations(
  executeMutation: (mutation: OfflineMutation) => Promise<MutationExecutionResult>
): Promise<FlushResult> {
  const queue = await getOfflineMutations();
  if (queue.length === 0) {
    const status = await getOfflineSyncStatus();
    return { processed: 0, remaining: status.pendingMutations, conflicts: status.conflictCount };
  }

  const conflicts = await getOfflineConflicts();
  const nextQueue: OfflineMutation[] = [];
  let processed = 0;

  for (let i = 0; i < queue.length; i += 1) {
    const mutation = queue[i];

    try {
      const result = await executeMutation(mutation);
      if (result.outcome === "success") {
        processed += 1;
        continue;
      }

      if (result.outcome === "conflict") {
        conflicts.unshift({
          id: makeId("cnf"),
          mutationId: mutation.id,
          type: mutation.type,
          workspaceId: mutation.workspaceId,
          statusCode: result.statusCode ?? 409,
          reason: result.reason ?? "Conflict while applying queued mutation",
          createdAt: new Date().toISOString(),
          payload: mutation.body,
        });
        processed += 1;
        continue;
      }

      // retry -> keep item and stop flush to avoid hammering while offline
      nextQueue.push({
        ...mutation,
        attempts: mutation.attempts + 1,
        lastError: result.reason ?? "Retry requested",
      });
      for (let j = i + 1; j < queue.length; j += 1) {
        nextQueue.push(queue[j]);
      }
      break;
    } catch (error: unknown) {
      nextQueue.push({
        ...mutation,
        attempts: mutation.attempts + 1,
        lastError: error instanceof Error ? error.message : "Unknown queue execution error",
      });
      for (let j = i + 1; j < queue.length; j += 1) {
        nextQueue.push(queue[j]);
      }
      break;
    }
  }

  await Promise.all([
    writeJson(QUEUE_KEY, nextQueue),
    writeJson(CONFLICT_KEY, conflicts),
  ]);

  return {
    processed,
    remaining: nextQueue.length,
    conflicts: conflicts.length,
  };
}
