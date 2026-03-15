/**
 * Arcana Pulse — Appwrite Database Seed Script
 *
 * Populates all collections with the canonical mock data
 * from src/lib/mock/data.ts for development and demo purposes.
 *
 * Usage:
 *   npx tsx scripts/db-seed.ts
 *
 * Required env vars:
 *   APPWRITE_ENDPOINT    (default: https://cloud.appwrite.io/v1)
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 */

import { Client, Databases } from "node-appwrite";

const DATABASE_ID = "arcana_pulse";

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const endpoint =
  process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID;
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
// Mock data (mirrors src/lib/mock/data.ts)
// ---------------------------------------------------------------------------

const MOCK_WORKSPACE = {
  name: "Alex's Personal Finance",
  ownerUserId: "usr-001",
  plan: "starter",
  status: "active",
};

const MOCK_USER = {
  workspaceId: "ws-001",
  email: "alex@arcanacu.org",
  // bcrypt hash of "password123" — generated via: await bcrypt.hash("password123", 12)
  passwordHash:
    "$2b$12$LJ3m4ys3Lk0TSwMCfVBXlOGJONFjRMbGIH0s9Q3XQ9KmFAaGZc.e6",
  firstName: "Alex",
  lastName: "Morgan",
  role: "owner",
};

const MOCK_BANKS = [
  {
    $id: "bnk-001",
    workspaceId: "ws-001",
    institutionName: "Chase",
    accountId: "acc-chase-001",
    displayMask: "4829",
    shareableId: "ARC-CHASE-4829",
    balance: 12450.75,
  },
  {
    $id: "bnk-002",
    workspaceId: "ws-001",
    institutionName: "Bank of America",
    accountId: "acc-boa-001",
    displayMask: "7231",
    shareableId: "ARC-BOA-7231",
    balance: 8320.5,
  },
  {
    $id: "bnk-003",
    workspaceId: "ws-001",
    institutionName: "Wells Fargo",
    accountId: "acc-wf-001",
    displayMask: "1058",
    shareableId: "ARC-WF-1058",
    balance: 3200.0,
  },
];

const MOCK_TRANSACTIONS = [
  {
    $id: "txn-001",
    workspaceId: "ws-001",
    bankId: "bnk-001",
    sourceType: "synced",
    transactionType: "income",
    title: "Monthly Salary - Acme Corp",
    category: "salary",
    amount: 5200.0,
    date: "2026-03-01T00:00:00.000+00:00",
    status: "posted",
    note: "March payroll deposit",
    createdBy: "system",
  },
  {
    $id: "txn-002",
    workspaceId: "ws-001",
    bankId: "bnk-001",
    sourceType: "synced",
    transactionType: "expense",
    title: "Rent Payment",
    category: "housing",
    amount: 1800.0,
    date: "2026-03-02T00:00:00.000+00:00",
    status: "posted",
    note: "March rent",
    createdBy: "system",
  },
  {
    $id: "txn-003",
    workspaceId: "ws-001",
    bankId: "bnk-002",
    sourceType: "synced",
    transactionType: "expense",
    title: "Whole Foods Market",
    category: "food",
    amount: 127.83,
    date: "2026-03-04T00:00:00.000+00:00",
    status: "posted",
    note: "Weekly groceries",
    createdBy: "system",
  },
  {
    $id: "txn-004",
    workspaceId: "ws-001",
    sourceType: "manual",
    transactionType: "income",
    title: "Freelance Web Design",
    category: "freelance",
    amount: 1500.0,
    date: "2026-03-05T00:00:00.000+00:00",
    status: "posted",
    note: "Logo project for client",
    createdBy: "usr-001",
  },
  {
    $id: "txn-005",
    workspaceId: "ws-001",
    bankId: "bnk-001",
    sourceType: "synced",
    transactionType: "expense",
    title: "Electric Company",
    category: "utilities",
    amount: 142.5,
    date: "2026-03-06T00:00:00.000+00:00",
    status: "posted",
    note: "Monthly electricity",
    createdBy: "system",
  },
  {
    $id: "txn-006",
    workspaceId: "ws-001",
    bankId: "bnk-002",
    sourceType: "synced",
    transactionType: "expense",
    title: "Netflix Subscription",
    category: "subscriptions",
    amount: 15.99,
    date: "2026-03-07T00:00:00.000+00:00",
    status: "posted",
    note: "",
    createdBy: "system",
  },
  {
    $id: "txn-007",
    workspaceId: "ws-001",
    sourceType: "manual",
    transactionType: "expense",
    title: "Coffee & Pastries",
    category: "food",
    amount: 24.5,
    date: "2026-03-08T00:00:00.000+00:00",
    status: "posted",
    note: "Working session at cafe",
    createdBy: "usr-001",
  },
  {
    $id: "txn-008",
    workspaceId: "ws-001",
    bankId: "bnk-003",
    sourceType: "synced",
    transactionType: "income",
    title: "Investment Dividend",
    category: "investment",
    amount: 320.0,
    date: "2026-03-10T00:00:00.000+00:00",
    status: "posted",
    note: "Quarterly dividend payout",
    createdBy: "system",
  },
  {
    $id: "txn-009",
    workspaceId: "ws-001",
    bankId: "bnk-001",
    sourceType: "synced",
    transactionType: "expense",
    title: "Gas Station",
    category: "transportation",
    amount: 55.0,
    date: "2026-03-11T00:00:00.000+00:00",
    status: "posted",
    note: "Fill up",
    createdBy: "system",
  },
  {
    $id: "txn-010",
    workspaceId: "ws-001",
    bankId: "bnk-001",
    sourceType: "transfer",
    transactionType: "transfer",
    title: "Transfer to Bank of America",
    category: "transfer",
    amount: 500.0,
    date: "2026-03-12T00:00:00.000+00:00",
    status: "posted",
    note: "Savings allocation",
    externalReference: "xfr-001",
    createdBy: "system",
  },
  {
    $id: "txn-011",
    workspaceId: "ws-001",
    sourceType: "manual",
    transactionType: "income",
    title: "Tax Refund",
    category: "refund",
    amount: 2100.0,
    date: "2026-03-13T00:00:00.000+00:00",
    status: "pending",
    note: "Federal tax refund 2025",
    createdBy: "usr-001",
  },
  {
    $id: "txn-012",
    workspaceId: "ws-001",
    bankId: "bnk-002",
    sourceType: "synced",
    transactionType: "expense",
    title: "Amazon Purchase",
    category: "shopping",
    amount: 89.99,
    date: "2026-03-13T00:00:00.000+00:00",
    status: "posted",
    note: "Desk organizer",
    createdBy: "system",
  },
];

const MOCK_TRANSFERS = [
  {
    $id: "xfr-001",
    workspaceId: "ws-001",
    senderBankId: "bnk-001",
    receiverShareableId: "ARC-BOA-7231",
    amount: 500.0,
    note: "Savings allocation",
    status: "posted",
  },
  {
    $id: "xfr-002",
    workspaceId: "ws-001",
    senderBankId: "bnk-002",
    receiverShareableId: "ARC-WF-1058",
    recipientEmail: "alex@arcanacu.org",
    amount: 250.0,
    note: "Emergency fund top-up",
    status: "pending",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedDoc(
  collectionId: string,
  docId: string,
  data: Record<string, unknown>
) {
  try {
    await db.getDocument(DATABASE_ID, collectionId, docId);
    console.log(`  [skip] ${collectionId}/${docId} already exists`);
  } catch {
    await db.createDocument(DATABASE_ID, collectionId, docId, data);
    console.log(`  [seed] ${collectionId}/${docId}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Arcana Pulse — Database Seed");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}\n`);

  // Workspace
  console.log("[workspaces]");
  await seedDoc("workspaces", "ws-001", MOCK_WORKSPACE);

  // User
  console.log("\n[users]");
  await seedDoc("users", "usr-001", MOCK_USER);

  // Banks
  console.log("\n[banks]");
  for (const bank of MOCK_BANKS) {
    const { $id, ...data } = bank;
    await seedDoc("banks", $id, data);
  }

  // Transactions
  console.log("\n[transactions]");
  for (const txn of MOCK_TRANSACTIONS) {
    const { $id, ...data } = txn;
    await seedDoc("transactions", $id, data);
  }

  // Transfers
  console.log("\n[transfers]");
  for (const xfr of MOCK_TRANSFERS) {
    const { $id, ...data } = xfr;
    await seedDoc("transfers", $id, data);
  }

  console.log("\nDone — all mock data seeded.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
