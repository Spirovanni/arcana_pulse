/**
 * Arcana Pulse — Appwrite Database Migration Script
 *
 * Creates the database, collections, attributes, and indexes
 * defined in SCHEMA.md.
 *
 * Usage:
 *   npx tsx scripts/db-setup.ts
 *
 * Required env vars:
 *   APPWRITE_ENDPOINT    (default: https://cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 */

import { Client, Databases, IndexType, OrderBy } from "node-appwrite";

const DATABASE_ID =
  process.env.APPWRITE_DATABASE_ID ?? "arcana_pulse";
const DATABASE_NAME = "Arcana Pulse";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  process.env.APPWRITE_ENDPOINT ??
  "https://cloud.appwrite.io/v1";
const projectId =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !apiKey) {
  console.error(
    "Missing required env vars: APPWRITE_PROJECT_ID, APPWRITE_API_KEY"
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new Databases(client);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDatabase() {
  try {
    await db.get(DATABASE_ID);
    console.log(`  Database "${DATABASE_ID}" already exists`);
  } catch {
    await db.create(DATABASE_ID, DATABASE_NAME);
    console.log(`  Created database "${DATABASE_ID}"`);
  }
}

async function createCollection(id: string, name: string) {
  try {
    await db.getCollection(DATABASE_ID, id);
    console.log(`  Collection "${id}" already exists — skipping`);
    return false;
  } catch {
    await db.createCollection(DATABASE_ID, id, name);
    console.log(`  Created collection "${id}"`);
    return true;
  }
}

/** Pause between attribute/index creations to let Appwrite process them. */
const wait = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Collection: workspaces
// ---------------------------------------------------------------------------

async function setupWorkspaces() {
  console.log("\n[workspaces]");
  await createCollection("workspaces", "Workspaces");

  await db.createStringAttribute(DATABASE_ID, "workspaces", "name", 128, true);
  await db.createStringAttribute(
    DATABASE_ID,
    "workspaces",
    "ownerUserId",
    36,
    true
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "workspaces",
    "plan",
    ["starter", "pro", "team"],
    true
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "workspaces",
    "status",
    ["active", "suspended"],
    true
  );

  await wait();

  await db.createIndex(
    DATABASE_ID,
    "workspaces",
    "idx_owner",
    IndexType.Key,
    ["ownerUserId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "workspaces",
    "idx_status",
    IndexType.Key,
    ["status"],
    [OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: users
// ---------------------------------------------------------------------------

async function setupUsers() {
  console.log("\n[users]");
  await createCollection("users", "Users");

  await db.createStringAttribute(
    DATABASE_ID,
    "users",
    "workspaceId",
    36,
    true
  );
  await db.createStringAttribute(DATABASE_ID, "users", "email", 320, true);
  await db.createStringAttribute(
    DATABASE_ID,
    "users",
    "passwordHash",
    256,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "users",
    "firstName",
    64,
    true
  );
  await db.createStringAttribute(DATABASE_ID, "users", "lastName", 64, true);
  await db.createStringAttribute(
    DATABASE_ID,
    "users",
    "imageUrl",
    2048,
    false
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "users",
    "role",
    ["owner", "admin", "member"],
    true
  );

  await wait();

  await db.createIndex(
    DATABASE_ID,
    "users",
    "idx_email",
    IndexType.Unique,
    ["email"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "users",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "users",
    "idx_workspace_role",
    IndexType.Key,
    ["workspaceId", "role"],
    [OrderBy.Asc, OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: banks
// ---------------------------------------------------------------------------

async function setupBanks() {
  console.log("\n[banks]");
  await createCollection("banks", "Banks");

  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "workspaceId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "institutionName",
    128,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "accountId",
    128,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "displayMask",
    4,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "accessTokenRef",
    256,
    false
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "fundingSourceUrl",
    512,
    false
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "banks",
    "shareableId",
    128,
    true
  );
  await db.createFloatAttribute(DATABASE_ID, "banks", "balance", true);

  await wait();

  await db.createIndex(
    DATABASE_ID,
    "banks",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "banks",
    "idx_shareable",
    IndexType.Unique,
    ["shareableId"],
    [OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: transactions
// ---------------------------------------------------------------------------

async function setupTransactions() {
  console.log("\n[transactions]");
  await createCollection("transactions", "Transactions");

  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "workspaceId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "bankId",
    36,
    false
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "transactions",
    "sourceType",
    ["synced", "manual", "transfer"],
    true
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "transactions",
    "transactionType",
    ["income", "expense", "transfer"],
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "title",
    256,
    true
  );
  // category stored as string (not enum) — the category list may grow
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "category",
    32,
    true
  );
  await db.createFloatAttribute(DATABASE_ID, "transactions", "amount", true);
  await db.createDatetimeAttribute(
    DATABASE_ID,
    "transactions",
    "date",
    true
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "transactions",
    "status",
    ["pending", "posted", "failed", "cancelled"],
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "note",
    1024,
    false
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "externalReference",
    256,
    false
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "createdBy",
    36,
    true
  );

  await wait(2000); // more attributes → longer wait for Appwrite

  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace_date",
    IndexType.Key,
    ["workspaceId", "date"],
    [OrderBy.Asc, OrderBy.Desc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace_type",
    IndexType.Key,
    ["workspaceId", "transactionType"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace_bank",
    IndexType.Key,
    ["workspaceId", "bankId"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace_source",
    IndexType.Key,
    ["workspaceId", "sourceType"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace_category",
    IndexType.Key,
    ["workspaceId", "category"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_workspace_status",
    IndexType.Key,
    ["workspaceId", "status"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_external_ref",
    IndexType.Unique,
    ["externalReference"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transactions",
    "idx_search",
    IndexType.Fulltext,
    ["title"]
  );
}

// ---------------------------------------------------------------------------
// Collection: transfers
// ---------------------------------------------------------------------------

async function setupTransfers() {
  console.log("\n[transfers]");
  await createCollection("transfers", "Transfers");

  await db.createStringAttribute(
    DATABASE_ID,
    "transfers",
    "workspaceId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transfers",
    "senderBankId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transfers",
    "receiverShareableId",
    128,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transfers",
    "recipientEmail",
    320,
    false
  );
  await db.createFloatAttribute(DATABASE_ID, "transfers", "amount", true);
  await db.createStringAttribute(
    DATABASE_ID,
    "transfers",
    "note",
    1024,
    false
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "transfers",
    "status",
    ["initiated", "pending", "processing", "posted", "failed", "reversed"],
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "transfers",
    "providerReference",
    256,
    false
  );

  await wait();

  await db.createIndex(
    DATABASE_ID,
    "transfers",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transfers",
    "idx_workspace_status",
    IndexType.Key,
    ["workspaceId", "status"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "transfers",
    "idx_provider_ref",
    IndexType.Key,
    ["providerReference"],
    [OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: sessions
// ---------------------------------------------------------------------------

async function setupSessions() {
  console.log("\n[sessions]");
  await createCollection("sessions", "Sessions");

  await db.createStringAttribute(
    DATABASE_ID,
    "sessions",
    "userId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "sessions",
    "token",
    128,
    true
  );
  await db.createDatetimeAttribute(
    DATABASE_ID,
    "sessions",
    "expiresAt",
    true
  );

  await wait();

  await db.createIndex(
    DATABASE_ID,
    "sessions",
    "idx_token",
    IndexType.Unique,
    ["token"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "sessions",
    "idx_user",
    IndexType.Key,
    ["userId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "sessions",
    "idx_expires",
    IndexType.Key,
    ["expiresAt"],
    [OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Arcana Pulse — Database Setup");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}`);

  await ensureDatabase();

  await setupWorkspaces();
  await setupUsers();
  await setupBanks();
  await setupTransactions();
  await setupTransfers();
  await setupSessions();

  console.log("\nDone — all collections, attributes, and indexes created.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
