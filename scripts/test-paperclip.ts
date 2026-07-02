// @ts-nocheck
/**
 * Arcana Pulse — Paperclip QA Test Suite
 *
 * Runs unit and integration tests to verify the gated paper-trading execution service (Paperclip).
 * Tests validation guards, confirmation gate, allow-lists, position sizing limits, kill-switches,
 * duplicate order checks, and audit logging.
 *
 * Usage:
 *   npx tsx scripts/test-paperclip.ts
 */

import assert from "assert";
import Module from "module";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// 1. Module & Environment Mocking (Must be first, before any target imports)
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_APPWRITE_PROJECT = "mock-project";
process.env.APPWRITE_API_KEY = "mock-key";
process.env.APPWRITE_DATABASE_ID = "arcana_pulse";
process.env.ALPACA_API_KEY = "mock-alpaca-key";
process.env.ALPACA_API_SECRET = "mock-alpaca-secret";
process.env.ALPACA_ENV = "paper";

const mockSentEmails: any[] = [];
const mockAuditLogs: any[] = [];
let mockAlpacaOrders: any[] = [];
let mockAlpacaPostCallCount = 0;

// Intercept requires to mock next-auth, resend, Sentry, and Alpaca
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "next-auth" || id.includes("/next-auth/") || id.endsWith("/next-auth")) {
    return {
      getServerSession: async () => {
        return mockSession;
      },
    };
  }
  if (id === "resend" || id.includes("/resend/") || id.endsWith("/resend")) {
    return {
      Resend: class MockResend {
        emails = {
          send: async (payload: any) => {
            mockSentEmails.push(payload);
            return { id: "mock-resend-id" };
          },
        };
      },
    };
  }
  if (id === "@sentry/nextjs" || id.includes("/@sentry/") || id.endsWith("/sentry/nextjs")) {
    return {
      captureException: () => {},
      captureMessage: () => {},
    };
  }
  if (id.includes("/lib/alpaca") || id.endsWith("/alpaca")) {
    return {
      alpacaGet: async (path: string) => {
        return mockAlpacaOrders;
      },
      alpacaPost: async (path: string, body: any) => {
        mockAlpacaPostCallCount++;
        const orderId = `alpaca-ord-${Math.random().toString(36).substr(2, 9)}`;
        const res = {
          id: orderId,
          client_order_id: body.client_order_id,
          symbol: body.symbol,
          side: body.side,
          type: body.type,
          time_in_force: body.time_in_force,
          qty: body.qty || "0",
          filled_qty: "0",
          filled_avg_price: null,
          limit_price: body.limit_price || null,
          stop_price: body.stop_price || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          filled_at: null,
          canceled_at: null,
          notional: body.notional || null,
          asset_class: "us_equity",
        };
        mockAlpacaOrders.push(res);
        return res;
      },
      isAlpacaConfigured: () => true,
      AlpacaConfigError: class AlpacaConfigError extends Error {},
      AlpacaAPIError: class AlpacaAPIError extends Error {},
    };
  }
  return originalRequire.apply(this, arguments as any);
};

// Mock Node Appwrite Database Prototype Methods
import { Databases } from "node-appwrite";

interface MockDoc {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  [key: string]: any;
}

let mockDbDocs: Record<string, MockDoc[]> = {};

function resetDb() {
  mockDbDocs = {
    workspaces: [
      {
        $id: "ws-001",
        name: "Alex's Personal Finance",
        ownerUserId: "usr-001",
        plan: "starter",
        status: "active",
        tradingPaused: false,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      },
    ],
    users: [
      {
        $id: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      },
    ],
    paperOrders: [],
    notifications: [],
    auditLogs: [],
  };
  mockSentEmails.length = 0;
  mockAuditLogs.length = 0;
  mockAlpacaOrders.length = 0;
  mockAlpacaPostCallCount = 0;
}

Databases.prototype.listDocuments = async function (dbId, collId, queries = []) {
  let docs = mockDbDocs[collId] || [];
  let limitValue = 100;

  for (const q of queries) {
    const queryObj = typeof q === "string" ? JSON.parse(q) : q;
    const { method, attribute, values } = queryObj;

    if (method === "equal") {
      docs = docs.filter((d) => d[attribute] === values[0]);
    } else if (method === "limit") {
      limitValue = values[0];
    }
  }

  const limitedDocs = docs.slice(0, limitValue);
  return {
    total: docs.length,
    documents: limitedDocs,
  } as any;
};

Databases.prototype.createDocument = async function (dbId, collId, docId, data) {
  const newDoc: MockDoc = {
    $id: docId === "unique()" ? `mock-id-${Math.random().toString(36).substr(2, 9)}` : docId,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
    ...data,
  };
  if (!mockDbDocs[collId]) {
    mockDbDocs[collId] = [];
  }
  mockDbDocs[collId].push(newDoc);

  if (collId === "auditLogs") {
    mockAuditLogs.push(newDoc);
  }
  return newDoc as any;
};

Databases.prototype.updateDocument = async function (dbId, collId, docId, data) {
  const docs = mockDbDocs[collId] || [];
  const idx = docs.findIndex((d) => d.$id === docId);
  if (idx === -1) {
    throw new Error(`Document not found in ${collId}: ${docId}`);
  }
  docs[idx] = {
    ...docs[idx],
    ...data,
    $updatedAt: new Date().toISOString(),
  };
  return docs[idx] as any;
};

Databases.prototype.deleteDocument = async function (dbId, collId, docId) {
  const docs = mockDbDocs[collId] || [];
  const idx = docs.findIndex((d) => d.$id === docId);
  if (idx !== -1) {
    docs.splice(idx, 1);
  }
  return {} as any;
};

Databases.prototype.getDocument = async function (dbId, collId, docId) {
  const docs = mockDbDocs[collId] || [];
  const doc = docs.find((d) => d.$id === docId);
  if (!doc) {
    throw new Error(`Document not found in ${collId}: ${docId}`);
  }
  return doc as any;
};

// ---------------------------------------------------------------------------
// 2. Session Auth Controlling Variable
// ---------------------------------------------------------------------------
let mockSession: any = {
  user: {
    userId: "usr-001",
    workspaceId: "ws-001",
    email: "alex@arcanacu.org",
    role: "owner",
  },
};

// ---------------------------------------------------------------------------
// 3. Dynamic import of route handlers
// ---------------------------------------------------------------------------
const { POST: placeOrder, GET: getOrders } = require("../src/app/api/alpaca/orders/route");

// Helper to convert Response/NextResponse to JSON
async function responseJson(res: any): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------
async function runTests() {
  console.log("=== Paperclip Gated Trading Execution QA Test Suite ===\n");

  const tests: { name: string; fn: () => Promise<void> }[] = [];

  function test(name: string, fn: () => Promise<void>) {
    tests.push({ name, fn });
  }

  // ---------------------------------------------------------------------------
  // TESTS
  // ---------------------------------------------------------------------------

  test("Unit: order rejected when requireAuth fails", async () => {
    mockSession = null;

    const req = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
      }),
    });

    const res = await placeOrder(req);
    assert.strictEqual(res.status, 401, "Order placement should fail with 401 when unauthenticated");
  });

  test("Unit: order rejected when request workspaceId doesn't match session", async () => {
    mockSession = {
      user: {
        userId: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
      },
    };

    const req = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "ws-other",
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
      }),
    });

    const res = await placeOrder(req);
    assert.strictEqual(res.status, 403, "Order placement should fail with 403 when requesting cross-workspace access");
  });

  test("Unit: order rejected when confirmed !== true (confirmation gate)", async () => {
    mockSession = {
      user: {
        userId: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
      },
    };

    const req = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: false,
      }),
    });

    const res = await placeOrder(req);
    assert.strictEqual(res.status, 422, "Unconfirmed order should fail with 422 (confirmation required)");
    const data = await responseJson(res);
    assert.strictEqual(data.error, "confirmation required");

    // Local DB should store order in pending_confirmation
    assert.strictEqual(mockDbDocs.paperOrders.length, 1);
    assert.strictEqual(mockDbDocs.paperOrders[0].status, "pending_confirmation");
  });

  test("Unit: order rejected when symbol isn't allow-listed", async () => {
    const req = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "XYZ", // Invalid symbol
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: true,
      }),
    });

    const res = await placeOrder(req);
    assert.strictEqual(res.status, 400, "Non-allowlisted symbol order should return 400");
    const data = await responseJson(res);
    assert.ok(data.error.includes("is not allow-listed"));

    // Verify audit log for risk limit breach
    const breachAudit = mockAuditLogs.find((l) => l.action === "risk_limit_breach");
    assert.ok(breachAudit, "Should log a risk limit breach audit event");
    const meta = JSON.parse(breachAudit.metadata);
    assert.strictEqual(meta.limitType, "symbol_scope");
  });

  test("Unit: order rejected when qty/notional exceeds limit", async () => {
    // 1. Qty exceeds limit for market order (safe ceiling 500)
    const reqMarket = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 1000, // exceeds 500 max
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: true,
      }),
    });

    const resMarket = await placeOrder(reqMarket);
    assert.strictEqual(resMarket.status, 400);
    const dataMarket = await responseJson(resMarket);
    assert.ok(dataMarket.error.includes("exceeds safe ceiling"));

    // Verify audit log
    const breachAuditMarket = mockAuditLogs.find((l) => l.action === "risk_limit_breach");
    assert.ok(breachAuditMarket, "Should audit market qty breach");
    const metaMarket = JSON.parse(breachAuditMarket.metadata);
    assert.strictEqual(metaMarket.limitType, "position_sizing");

    // 2. Notional value exceeds limit for limit order (max limit $10,000)
    const reqLimit = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 100,
        limitPrice: 200, // 100 * 200 = $20,000 (exceeds $10,000)
        side: "buy",
        type: "limit",
        timeInForce: "day",
        confirmed: true,
      }),
    });

    const resLimit = await placeOrder(reqLimit);
    assert.strictEqual(resLimit.status, 400);
    const dataLimit = await responseJson(resLimit);
    assert.ok(dataLimit.error.includes("exceeds max limit"));
  });

  test("Unit: kill-switch flag blocks submission regardless of role", async () => {
    // Toggle tradingPaused on workspace
    mockDbDocs.workspaces[0].tradingPaused = true;

    const req = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: true,
      }),
    });

    const res = await placeOrder(req);
    assert.strictEqual(res.status, 403, "Should fail with 403 when workspace trading is paused");
    const data = await responseJson(res);
    assert.ok(data.error.includes("currently paused"));

    // Verify audit log
    const breachAudit = mockAuditLogs.find((l) => l.action === "risk_limit_breach");
    assert.ok(breachAudit, "Should log a kill-switch breach audit event");
    const meta = JSON.parse(breachAudit.metadata);
    assert.strictEqual(meta.limitType, "kill_switch");
  });

  test("Integration: every accepted submit produces exactly one paper_order_submit audit entry", async () => {
    const req = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: true,
      }),
    });

    const res = await placeOrder(req);
    assert.strictEqual(res.status, 201, "Valid confirmed order should place successfully");

    // Check audits
    const submitAudits = mockAuditLogs.filter((l) => l.action === "paper_order_submit");
    assert.strictEqual(submitAudits.length, 1, "Should write exactly one paper_order_submit audit entry");
  });

  test("Integration: clientOrderId is preserved across confirmation flow (stops duplicates)", async () => {
    const clientOrderId = "pco-test-unique-id-12345";

    // 1. Initial POST (unconfirmed)
    const req1 = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: false,
        clientOrderId,
      }),
    });

    const res1 = await placeOrder(req1);
    assert.strictEqual(res1.status, 422);

    // Verify stored local order count
    assert.strictEqual(mockDbDocs.paperOrders.length, 1);
    assert.strictEqual(mockDbDocs.paperOrders[0].status, "pending_confirmation");
    assert.strictEqual(mockDbDocs.paperOrders[0].clientOrderId, clientOrderId);

    // 2. Confirm POST (same clientOrderId)
    const req2 = new NextRequest("http://localhost/api/alpaca/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: "AAPL",
        qty: 10,
        side: "buy",
        type: "market",
        timeInForce: "day",
        confirmed: true,
        clientOrderId,
      }),
    });

    const res2 = await placeOrder(req2);
    assert.strictEqual(res2.status, 201);

    // Verify it updated the existing record instead of adding a new one
    assert.strictEqual(mockDbDocs.paperOrders.length, 1, "Should not create duplicate local order record");
    assert.strictEqual(mockDbDocs.paperOrders[0].status, "submitted");

    // Verify Alpaca post call count is exactly 1
    assert.strictEqual(mockAlpacaPostCallCount, 1, "Should make exactly one call to Alpaca API");
  });

  // Execute sequentially
  let passedCount = 0;
  let failedCount = 0;

  for (const t of tests) {
    resetDb();
    mockSession = {
      user: {
        userId: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
      },
    };
    try {
      await t.fn();
      console.log(`✓ PASS: ${t.name}`);
      passedCount++;
    } catch (err) {
      console.error(`✗ FAIL: ${t.name}`);
      console.error(err);
      failedCount++;
    }
  }

  console.log(`\n=== Test Results ===`);
  console.log(`Total: ${passedCount + failedCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Runner crashed:", err);
  process.exit(1);
});
