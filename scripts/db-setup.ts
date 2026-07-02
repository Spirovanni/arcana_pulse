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
import fs from "fs";
import path from "path";

let DATABASE_ID = "";
let DATABASE_NAME = "Arcana Pulse";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function loadEnvFromFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const envRoot = process.cwd();
loadEnvFromFile(path.join(envRoot, ".env.local"));
loadEnvFromFile(path.join(envRoot, ".env"));

DATABASE_ID = (process.env.APPWRITE_DATABASE_ID ?? "").trim();
DATABASE_NAME = process.env.APPWRITE_DATABASE_NAME ?? "Arcana Pulse";

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  process.env.APPWRITE_ENDPOINT ??
  "https://cloud.appwrite.io/v1";
const projectId =
  process.env.APPWRITE_PROJECT_ID ??
  process.env.APPWRITE_PROJECT ??
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
const apiKey =
  process.env.APPWRITE_API_KEY ??
  process.env.APPWRITE_KEY ??
  process.env.APPWRITE_API_TOKEN;

if (!projectId || !apiKey) {
  const missing: string[] = [];
  if (!projectId) {
    missing.push("APPWRITE_PROJECT_ID (or APPWRITE_PROJECT / NEXT_PUBLIC_APPWRITE_PROJECT)");
  }
  if (!apiKey) {
    missing.push("APPWRITE_API_KEY (or APPWRITE_KEY / APPWRITE_API_TOKEN)");
  }
  console.error(
    `Missing required env vars: ${missing.join(", ")}`
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new Databases(client);

type AppwriteDatabaseInfo = {
  $id: string;
  name?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureDatabase() {
  try {
    await db.get(DATABASE_ID);
    console.log(`  Database "${DATABASE_ID}" already exists`);
  } catch (err: unknown) {
    const code = (err as { code?: number } | null)?.code;
    if (code !== 404) {
      throw err;
    }
    try {
      await db.create(DATABASE_ID, DATABASE_NAME);
      console.log(`  Created database "${DATABASE_ID}"`);
    } catch (createErr: unknown) {
      const createCode = (createErr as { code?: number } | null)?.code;
      const createType = (createErr as { type?: string } | null)?.type;
      if (createCode === 403 && createType === "additional_resource_not_allowed") {
        throw new Error(
          `Unable to create database "${DATABASE_ID}" because your Appwrite plan has reached the database limit. ` +
            `Set APPWRITE_DATABASE_ID to an existing database ID in your env, or upgrade your Appwrite plan.`
        );
      }
      throw createErr;
    }
  }
}

async function listExistingDatabases(): Promise<AppwriteDatabaseInfo[]> {
  try {
    // list() exists on modern node-appwrite Databases but may lag in typings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (db as any).list();
    const items = Array.isArray(response?.databases)
      ? (response.databases as AppwriteDatabaseInfo[])
      : [];
    return items.filter((item) => typeof item?.$id === "string");
  } catch {
    return [];
  }
}

async function resolveDatabaseId() {
  if (DATABASE_ID) {
    console.log(`Using database from env: ${DATABASE_ID}`);
    return;
  }

  const databases = await listExistingDatabases();
  if (databases.length === 0) {
    DATABASE_ID = "arcana_pulse";
    console.log(`No existing databases listed; defaulting to create "${DATABASE_ID}"`);
    return;
  }

  const byName = databases.find((dbInfo) => dbInfo.name === DATABASE_NAME);
  if (byName) {
    DATABASE_ID = byName.$id;
    console.log(`Selected existing database by name "${DATABASE_NAME}": ${DATABASE_ID}`);
    return;
  }

  if (databases.length === 1) {
    DATABASE_ID = databases[0].$id;
    console.log(`Selected only existing database: ${DATABASE_ID}`);
    return;
  }

  console.error("Multiple databases found in Appwrite. Set APPWRITE_DATABASE_ID to choose one.");
  for (const dbInfo of databases) {
    console.error(`  - ${dbInfo.$id}${dbInfo.name ? ` (${dbInfo.name})` : ""}`);
  }
  process.exit(1);
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
  const created = await createCollection("workspaces", "Workspaces");
  if (!created) return;

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
  await db.createBooleanAttribute(
    DATABASE_ID,
    "workspaces",
    "tradingPaused",
    false,
    false
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
  const created = await createCollection("users", "Users");
  if (!created) return;

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
  await db.createStringAttribute(
    DATABASE_ID,
    "users",
    "notificationPreferences",
    1024,
    false
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
  const created = await createCollection("banks", "Banks");
  if (!created) return;

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
  const created = await createCollection("transactions", "Transactions");
  if (!created) return;

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
  // AI categorisation fields (optional — added after initial schema)
  await db.createStringAttribute(
    DATABASE_ID,
    "transactions",
    "aiCategory",
    32,
    false
  );
  await db.createFloatAttribute(DATABASE_ID, "transactions", "aiConfidence", false);

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
  const created = await createCollection("transfers", "Transfers");
  if (!created) return;

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
  const created = await createCollection("sessions", "Sessions");
  if (!created) return;

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
// Collection: paperOrders
// ---------------------------------------------------------------------------

async function setupPaperOrders() {
  console.log("\n[paperOrders]");
  const created = await createCollection("paperOrders", "Paper Orders");
  if (!created) return;

  await db.createStringAttribute(DATABASE_ID, "paperOrders", "workspaceId", 36, true);
  await db.createStringAttribute(DATABASE_ID, "paperOrders", "strategyId", 36, false);
  await db.createStringAttribute(DATABASE_ID, "paperOrders", "submittedBy", 36, true);
  await db.createEnumAttribute(DATABASE_ID, "paperOrders", "side", ["buy", "sell"], true);
  await db.createStringAttribute(DATABASE_ID, "paperOrders", "symbol", 32, true);
  await db.createFloatAttribute(DATABASE_ID, "paperOrders", "qty", false);
  await db.createFloatAttribute(DATABASE_ID, "paperOrders", "notional", false);
  await db.createEnumAttribute(DATABASE_ID, "paperOrders", "orderType", ["market", "limit"], true);
  await db.createEnumAttribute(DATABASE_ID, "paperOrders", "timeInForce", ["day", "gtc", "ioc", "fok"], true);
  await db.createStringAttribute(DATABASE_ID, "paperOrders", "clientOrderId", 128, true);
  await db.createStringAttribute(DATABASE_ID, "paperOrders", "alpacaOrderId", 128, false);
  await db.createEnumAttribute(DATABASE_ID, "paperOrders", "status", ["pending_confirmation", "submitted", "filled", "canceled", "rejected"], true);
  await db.createDatetimeAttribute(DATABASE_ID, "paperOrders", "confirmedAt", false);

  await wait(2000);

  await db.createIndex(
    DATABASE_ID,
    "paperOrders",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "paperOrders",
    "idx_workspace_status",
    IndexType.Key,
    ["workspaceId", "status"],
    [OrderBy.Asc, OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: aiReports
// ---------------------------------------------------------------------------

async function setupAiReports() {
  console.log("\n[aiReports]");
  const created = await createCollection("aiReports", "AI Reports");
  if (!created) return;

  await db.createStringAttribute(DATABASE_ID, "aiReports", "workspaceId", 36, true);
  await db.createStringAttribute(DATABASE_ID, "aiReports", "userId", 36, true);
  await db.createStringAttribute(DATABASE_ID, "aiReports", "reportKey", 120, true);
  await db.createStringAttribute(DATABASE_ID, "aiReports", "payloadJson", 60000, true);
  await db.createDatetimeAttribute(DATABASE_ID, "aiReports", "lastRunAt", true);

  await wait(1500);

  await db.createIndex(
    DATABASE_ID,
    "aiReports",
    "idx_workspace_user",
    IndexType.Key,
    ["workspaceId", "userId"],
    [OrderBy.Asc, OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "aiReports",
    "idx_workspace_user_report",
    IndexType.Unique,
    ["workspaceId", "userId", "reportKey"],
    [OrderBy.Asc, OrderBy.Asc, OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: creditMonitoring
// ---------------------------------------------------------------------------

async function setupCreditMonitoring() {
  console.log("\n[creditMonitoring]");
  const created = await createCollection("creditMonitoring", "Credit Monitoring");
  if (!created) return;

  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "workspaceId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "userId",
    36,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "title",
    160,
    true
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "reportText",
    60000,
    true
  );
  await db.createIntegerAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "currentScore",
    false,
    300,
    850
  );
  await db.createIntegerAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "targetScore",
    false,
    300,
    850
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "strategyRevisionsJson",
    60000,
    false
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "timelineJson",
    60000,
    false
  );
  await db.createStringAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "remindersJson",
    60000,
    false
  );
  await db.createDatetimeAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "lastAnalyzedAt",
    false
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "creditMonitoring",
    "status",
    ["active", "archived"],
    true
  );

  await wait(1500);

  await db.createIndex(
    DATABASE_ID,
    "creditMonitoring",
    "idx_workspace_user",
    IndexType.Key,
    ["workspaceId", "userId"],
    [OrderBy.Asc, OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: notifications
// ---------------------------------------------------------------------------

async function setupNotifications() {
  console.log("\n[notifications]");
  const created = await createCollection("notifications", "Notifications");
  if (!created) return;

  await db.createStringAttribute(DATABASE_ID, "notifications", "workspaceId", 36, true);
  await db.createEnumAttribute(
    DATABASE_ID,
    "notifications",
    "type",
    [
      "large_transaction",
      "budget_warning",
      "ai_insight",
      "transfer_status",
      "anomaly",
      "goal_progress",
      "price_threshold",
      "strategy_signal",
      "paper_order_event",
      "risk_limit_breach",
    ],
    true
  );
  await db.createEnumAttribute(
    DATABASE_ID,
    "notifications",
    "severity",
    ["info", "warning", "critical"],
    true
  );
  await db.createStringAttribute(DATABASE_ID, "notifications", "title", 256, true);
  await db.createStringAttribute(DATABASE_ID, "notifications", "body", 1024, true);
  await db.createBooleanAttribute(DATABASE_ID, "notifications", "read", false, false);
  await db.createStringAttribute(DATABASE_ID, "notifications", "href", 256, false);
  await db.createStringAttribute(DATABASE_ID, "notifications", "alertRuleId", 36, false);

  await wait(2000);

  await db.createIndex(
    DATABASE_ID,
    "notifications",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "notifications",
    "idx_workspace_read",
    IndexType.Key,
    ["workspaceId", "read"],
    [OrderBy.Asc, OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Collection: alertRules
// ---------------------------------------------------------------------------

async function setupAlertRules() {
  console.log("\n[alertRules]");
  const created = await createCollection("alertRules", "Alert Rules");
  if (!created) return;

  await db.createStringAttribute(DATABASE_ID, "alertRules", "workspaceId", 36, true);
  await db.createStringAttribute(DATABASE_ID, "alertRules", "createdBy", 36, true);
  await db.createStringAttribute(DATABASE_ID, "alertRules", "name", 128, true);
  await db.createEnumAttribute(
    DATABASE_ID,
    "alertRules",
    "kind",
    ["price_threshold", "strategy_signal", "paper_order_event", "risk_limit_breach"],
    true
  );
  await db.createStringAttribute(DATABASE_ID, "alertRules", "config", 4096, true);
  await db.createStringAttribute(DATABASE_ID, "alertRules", "channels", 256, true, undefined, true);
  await db.createBooleanAttribute(DATABASE_ID, "alertRules", "active", true, true);
  await db.createDatetimeAttribute(DATABASE_ID, "alertRules", "lastTriggeredAt", false);

  await wait(2000);

  await db.createIndex(
    DATABASE_ID,
    "alertRules",
    "idx_workspace",
    IndexType.Key,
    ["workspaceId"],
    [OrderBy.Asc]
  );
  await db.createIndex(
    DATABASE_ID,
    "alertRules",
    "idx_workspace_active",
    IndexType.Key,
    ["workspaceId", "active"],
    [OrderBy.Asc, OrderBy.Asc]
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Arcana Pulse — Database Setup");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}`);
  await resolveDatabaseId();
  console.log(`Database: ${DATABASE_ID}`);

  await ensureDatabase();

  await setupWorkspaces();
  await setupUsers();
  await setupBanks();
  await setupTransactions();
  await setupTransfers();
  await setupSessions();
  await setupPaperOrders();
  await setupAiReports();
  await setupCreditMonitoring();
  await setupNotifications();
  await setupAlertRules();

  console.log("\nDone — all collections, attributes, and indexes created.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

