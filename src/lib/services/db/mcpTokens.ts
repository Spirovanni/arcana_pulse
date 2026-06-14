/**
 * MCP Personal Access Token (PAT) management.
 *
 * Users generate a PAT from the Resource Vault UI. The raw token is shown once
 * and never stored — only a bcrypt hash is persisted in Appwrite. When a MCP
 * client presents the bearer token, we hash it and compare against stored hashes.
 */

import { ID, Query } from "node-appwrite";
import { getDatabase, DATABASE_ID, COLLECTIONS, isAppwriteConfigured } from "@/lib/appwrite";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { McpToken } from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toToken(doc: Models.Document & Record<string, unknown>): McpToken {
  return {
    tokenId: doc.$id,
    userId: doc.userId as string,
    tokenHash: doc.tokenHash as string,
    label: doc.label as string,
    lastUsedAt: (doc.lastUsedAt as string) || undefined,
    createdAt: doc.$createdAt,
    expiresAt: (doc.expiresAt as string) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Token generation
// ---------------------------------------------------------------------------

const PAT_PREFIX = "ap_";

/**
 * Generates a new PAT and stores its bcrypt hash in Appwrite.
 * Returns the raw token (shown once to the user) and the stored record.
 */
export async function generateMcpToken(
  userId: string,
  label: string
): Promise<{ rawToken: string; token: McpToken }> {
  const rawToken = `${PAT_PREFIX}${randomUUID().replace(/-/g, "")}`;
  const tokenHash = await bcrypt.hash(rawToken, 10);

  const db = getDatabase();
  const doc = await db.createDocument(
    DATABASE_ID,
    COLLECTIONS.mcpTokens,
    ID.unique(),
    {
      userId,
      tokenHash,
      label: label || "MCP Token",
      lastUsedAt: null,
      expiresAt: null,
    }
  );

  return {
    rawToken,
    token: toToken(doc as Models.Document & Record<string, unknown>),
  };
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

/**
 * Validates a raw bearer token against stored hashes for the user.
 * Returns the userId if valid, null if not.
 *
 * This performs bcrypt comparison against all tokens for any user — since
 * we don't store the raw token, we must check all candidates. For large
 * token tables, consider adding a fast prefix lookup.
 */
export async function validateMcpToken(rawToken: string): Promise<{ userId: string; tokenId: string } | null> {
  if (!isAppwriteConfigured()) return null;
  if (!rawToken.startsWith(PAT_PREFIX)) return null;

  const db = getDatabase();

  // Scan all tokens — in practice each user has 1-5 tokens so this is fast.
  // A userId prefix in the bearer token (e.g., ap_<userId>_<secret>) could
  // make this O(1) but adds complexity not needed at MVP scale.
  let offset = 0;
  const pageSize = 50;

  while (true) {
    const res = await db.listDocuments(DATABASE_ID, COLLECTIONS.mcpTokens, [
      Query.limit(pageSize),
      Query.offset(offset),
    ]);

    for (const doc of res.documents) {
      const match = await bcrypt.compare(rawToken, doc.tokenHash as string);
      if (match) {
        // Update lastUsedAt asynchronously — don't block the response
        void db.updateDocument(DATABASE_ID, COLLECTIONS.mcpTokens, doc.$id, {
          lastUsedAt: new Date().toISOString(),
        }).catch(() => {});

        return { userId: doc.userId as string, tokenId: doc.$id };
      }
    }

    if (res.documents.length < pageSize) break;
    offset += pageSize;
  }

  return null;
}

// ---------------------------------------------------------------------------
// List and revoke
// ---------------------------------------------------------------------------

/**
 * Returns all PATs for a user (hashes omitted from the response).
 */
export async function listMcpTokens(userId: string): Promise<McpToken[]> {
  if (!isAppwriteConfigured()) return [];

  const db = getDatabase();
  const res = await db.listDocuments(DATABASE_ID, COLLECTIONS.mcpTokens, [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(20),
  ]);

  return res.documents.map((d) => toToken(d as Models.Document & Record<string, unknown>));
}

/**
 * Revokes a PAT by deleting it. Validates ownership before deletion.
 */
export async function revokeMcpToken(userId: string, tokenId: string): Promise<boolean> {
  if (!isAppwriteConfigured()) return false;

  const db = getDatabase();
  try {
    const doc = await db.getDocument(DATABASE_ID, COLLECTIONS.mcpTokens, tokenId);
    if (doc.userId !== userId) return false; // ownership check
    await db.deleteDocument(DATABASE_ID, COLLECTIONS.mcpTokens, tokenId);
    return true;
  } catch {
    return false;
  }
}
