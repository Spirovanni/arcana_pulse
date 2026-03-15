/**
 * Appwrite server-side client factory.
 *
 * Used exclusively in API routes — never import this from
 * "use client" components (it depends on node-appwrite).
 */

import { Client, Databases, Query } from "node-appwrite";

export const DATABASE_ID = "arcana_pulse";

export const COLLECTIONS = {
  workspaces: "workspaces",
  users: "users",
  banks: "banks",
  transactions: "transactions",
  transfers: "transfers",
  sessions: "sessions",
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
// Database helper
// ---------------------------------------------------------------------------

let _db: Databases | null = null;

export function getDatabase(): Databases {
  if (_db) return _db;
  _db = new Databases(getClient());
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
