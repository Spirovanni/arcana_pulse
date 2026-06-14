/**
 * Appwrite server-side client factory.
 *
 * Used exclusively in API routes — never import this from
 * "use client" components (it depends on node-appwrite).
 *
 * The Databases instance returned by getDatabase() is wrapped in a
 * resilient Proxy that adds exponential-backoff retry and circuit
 * breaker protection transparently — service layer code is unchanged.
 */

import { Client, Databases, Query } from "node-appwrite";
import { withRetry } from "./resilience/retry";
import { appwriteCircuit } from "./resilience/circuit-breaker";
import * as Sentry from "@sentry/nextjs";

export const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ?? "arcana_pulse";

export const STORAGE_BUCKET_ID =
  process.env.APPWRITE_BUCKET_ID ?? "69b6148a000ce565e917";

export const COLLECTIONS = {
  workspaces: "workspaces",
  users: "users",
  banks: "banks",
  transactions: "transactions",
  transfers: "transfers",
  sessions: "sessions",
  budgets: "budgets",
  goals: "goals",
  verificationTokens: "verificationTokens",
  resetTokens: "resetTokens",
  mfaPending: "mfaPending",
  auditLogs: "auditLogs",
  workspaceMembers: "workspaceMembers",
  workspaceInvites: "workspaceInvites",
  resources: "resources",
  mcpTokens: "mcpTokens",
  featureFlags: "featureFlags",
  supportTickets: "supportTickets",
} as const;

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;

  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
    "https://cloud.appwrite.io/v1";
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_PROJECT and APPWRITE_API_KEY."
    );
  }

  _client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return _client;
}

// ---------------------------------------------------------------------------
// Resilient database proxy
// ---------------------------------------------------------------------------

function createResilientDatabase(db: Databases): Databases {
  return new Proxy(db, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== "function") return original;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return function (this: unknown, ...args: any[]) {
        return appwriteCircuit
          .execute(() =>
            withRetry(() => (original as Function).apply(target, args), {
              maxRetries: 3,
              baseDelayMs: 200,
              maxDelayMs: 5000,
              onRetry: (attempt, error) => {
                Sentry.captureMessage(
                  `Appwrite retry ${attempt} for ${String(prop)}`,
                  {
                    level: "warning",
                    extra: { error: error.message, method: String(prop) },
                  },
                );
              },
            }),
          )
          .catch((error: unknown) => {
            Sentry.captureException(error, {
              tags: { service: "appwrite", method: String(prop) },
            });
            throw error;
          });
      };
    },
  }) as Databases;
}

// ---------------------------------------------------------------------------
// Database helper
// ---------------------------------------------------------------------------

let _db: Databases | null = null;

export function getDatabase(): Databases {
  if (_db) return _db;
  _db = createResilientDatabase(new Databases(getClient()));
  return _db;
}

// ---------------------------------------------------------------------------
// Environment check
// ---------------------------------------------------------------------------

/** Returns true if Appwrite env vars are configured. */
export function isAppwriteConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT && process.env.APPWRITE_API_KEY
  );
}

// Re-export Query for convenience
export { Query };
