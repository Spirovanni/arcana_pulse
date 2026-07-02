// @ts-nocheck
/**
 * Arcana Pulse — End-to-End Integration Smoke Test Runner
 *
 * Simulates a full workspace scenario:
 * 1. Creating alert rule -> triggers 'alert_rule_created' audit
 * 2. Placing unconfirmed order -> confirmation gate verification
 * 3. Placing confirmed order -> triggers 'paper_order_submit' audit,
 *    submits to Alpaca, triggers Hermes, matches rule, sends notifications,
 *    and logs 'alert_sent' audit logs for both channels
 * 4. Canceling order -> triggers 'paper_order_cancel' audit and updates local store
 * 5. Attempting invalid order -> triggers allowlist 'risk_limit_breach' audit and Hermes warning
 * 6. Deactivating rule -> triggers 'alert_rule_deleted' audit
 * 7. Deleting rule -> triggers 'alert_rule_deleted' audit
 *
 * Usage:
 *   npx tsx scripts/test-e2e.ts
 */

import assert from "assert";
import Module from "module";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// 1. Module & Environment Mocking
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_APPWRITE_PROJECT = "mock-project";
process.env.APPWRITE_API_KEY = "mock-key";
process.env.APPWRITE_DATABASE_ID = "arcana_pulse";
process.env.ALPACA_API_KEY = "mock-alpaca-key";
process.env.ALPACA_API_SECRET = "mock-alpaca-secret";
process.env.ALPACA_ENV = "paper";
process.env.RESEND_API_KEY = "mock-resend-key";

const mockSentEmails: any[] = [];
const mockAuditLogs: any[] = [];
let mockAlpacaOrders: any[] = [];
let mockAlpacaPostCallCount = 0;
let mockAlpacaDeleteCallCount = 0;
let sentryInited = false;

// Intercept requires
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
      init: () => {
        sentryInited = true;
      },
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
      alpacaDelete: async (path: string) => {
        mockAlpacaDeleteCallCount++;
        // extract alpacaOrderId
        const orderId = path.split("/").pop();
        const o = mockAlpacaOrders.find((x) => x.id === orderId);
        if (o) {
          o.status = "canceled";
          o.canceled_at = new Date().toISOString();
        }
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
        notificationPreferences: JSON.stringify({ email: true, in_app: true }),
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      },
    ],
    alertRules: [],
    paperOrders: [],
    notifications: [],
    auditLogs: [],
  };
  mockSentEmails.length = 0;
  mockAuditLogs.length = 0;
  mockAlpacaOrders.length = 0;
  mockAlpacaPostCallCount = 0;
  mockAlpacaDeleteCallCount = 0;
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
// 2. Session Auth
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
// 3. Imports of route handlers after mocking is active
// ---------------------------------------------------------------------------
const { POST: postAlertRules } = require("../src/app/api/alerts/rules/route");
const { PUT: putAlertRule, DELETE: deleteAlertRule } = require("../src/app/api/alerts/rules/[id]/route");
const { POST: placeOrder } = require("../src/app/api/alpaca/orders/route");
const { DELETE: cancelOrder } = require("../src/app/api/alpaca/orders/[orderId]/route");

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
// Main E2E Execution Flow
// ---------------------------------------------------------------------------
async function main() {
  console.log("Starting End-to-End Smoke Test Integration and Audits Verification...\n");
  resetDb();

  // Test Sentry is mock-initialized
  const sentryServer = require("../sentry.server.config.ts");
  assert.ok(sentryInited, "Sentry server initialization was not called");
  console.log("✓ Sentry server config initialized successfully.");

  // --- Step 1: Create alert rule ---
  console.log("\nStep 1: Creating alert rule...");
  const reqCreateRule = new NextRequest("http://localhost/api/alerts/rules", {
    method: "POST",
    body: JSON.stringify({
      name: "AAPL Order Fills Alert",
      kind: "paper_order_event",
      config: JSON.stringify({ symbol: "AAPL" }),
      channels: ["in_app", "email"],
    }),
  });

  const resCreateRule = await postAlertRules(reqCreateRule);
  assert.strictEqual(resCreateRule.status, 201, "Alert rule creation should return 201");
  const rule = await responseJson(resCreateRule);
  assert.ok(rule.id, "Should return created alert rule");

  // Verify 'alert_rule_created' audit log
  const audit1 = mockAuditLogs.find((l) => l.action === "alert_rule_created");
  assert.ok(audit1, "Missing alert_rule_created audit event");
  assert.strictEqual(audit1.targetId, rule.id);
  console.log("✓ Step 1 complete: Rule created & audited.");

  // --- Step 2: Place unconfirmed order ---
  console.log("\nStep 2: Placing unconfirmed order...");
  const clientOrderId = "pco-e2e-order-12345";
  const reqUnconfirmed = new NextRequest("http://localhost/api/alpaca/orders", {
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

  const resUnconfirmed = await placeOrder(reqUnconfirmed);
  assert.strictEqual(resUnconfirmed.status, 422, "Unconfirmed order should return 422");
  const unconfirmedData = await responseJson(resUnconfirmed);
  assert.strictEqual(unconfirmedData.error, "confirmation required");

  // Verify order in local DB in pending_confirmation state
  assert.strictEqual(mockDbDocs.paperOrders.length, 1);
  assert.strictEqual(mockDbDocs.paperOrders[0].status, "pending_confirmation");
  console.log("✓ Step 2 complete: Gated by confirmation check.");

  // --- Step 3: Place confirmed order (triggers order, Hermes, Resend, and logs audits) ---
  console.log("\nStep 3: Confirming order submission...");
  const reqConfirmed = new NextRequest("http://localhost/api/alpaca/orders", {
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

  const resConfirmed = await placeOrder(reqConfirmed);
  assert.strictEqual(resConfirmed.status, 201, "Confirmed order should return 201");
  const orderRes = await responseJson(resConfirmed);
  assert.strictEqual(orderRes.order.status, "submitted");
  const alpacaOrderId = orderRes.order.orderId;

  // Local order record updated to submitted
  assert.strictEqual(mockDbDocs.paperOrders.length, 1);
  assert.strictEqual(mockDbDocs.paperOrders[0].status, "submitted");

  // Verify 'paper_order_submit' audit log
  const submitAudit = mockAuditLogs.find((l) => l.action === "paper_order_submit");
  assert.ok(submitAudit, "Missing paper_order_submit audit log");
  assert.strictEqual(submitAudit.targetId, alpacaOrderId);

  // Verify Hermes triggered and sent alerts to both channels
  assert.strictEqual(mockDbDocs.notifications.length, 1, "Should create 1 in-app notification");
  assert.strictEqual(mockSentEmails.length, 1, "Should send 1 email notification via Resend");

  // Verify two 'alert_sent' audit logs (in_app & email)
  const alertSentAudits = mockAuditLogs.filter((l) => l.action === "alert_sent");
  assert.strictEqual(alertSentAudits.length, 2, "Should log exactly 2 alert_sent audits");

  const inAppAudit = alertSentAudits.find((a) => JSON.parse(a.metadata).channel === "in_app");
  const emailAudit = alertSentAudits.find((a) => JSON.parse(a.metadata).channel === "email");
  assert.ok(inAppAudit, "Missing in_app alert_sent audit");
  assert.ok(emailAudit, "Missing email alert_sent audit");
  console.log("✓ Step 3 complete: Order submitted, matched, delivered, and audited.");

  // --- Step 4: Cancel the placed order ---
  console.log("\nStep 4: Canceling the order...");
  // Reset the cooldown timestamp on the alert rule so the cancel event triggers a second notification
  mockDbDocs.alertRules[0].lastTriggeredAt = undefined;

  const reqCancel = new NextRequest(`http://localhost/api/alpaca/orders/${alpacaOrderId}`, {
    method: "DELETE",
  });

  const resCancel = await cancelOrder(reqCancel, { params: Promise.resolve({ orderId: alpacaOrderId }) });
  assert.strictEqual(resCancel.status, 200, "Cancel order should return 200");

  // Local record status updated to canceled
  assert.strictEqual(mockDbDocs.paperOrders[0].status, "canceled");

  // Verify 'paper_order_cancel' audit log
  const cancelAudit = mockAuditLogs.find((l) => l.action === "paper_order_cancel");
  assert.ok(cancelAudit, "Missing paper_order_cancel audit log");
  assert.strictEqual(cancelAudit.targetId, alpacaOrderId);

  // Hermes delivers cancellation alert
  assert.strictEqual(mockDbDocs.notifications.length, 2, "Should create cancellation in-app notification");
  assert.strictEqual(mockSentEmails.length, 2, "Should send cancellation email via Resend");
  console.log("✓ Step 4 complete: Cancel flow verified.");

  // --- Step 5: Trigger a risk limit breach ---
  console.log("\nStep 5: Attempting invalid order (triggers breach)...");
  
  // First, create a risk limit breach alert rule so Hermes is configured to match it
  const reqCreateRiskRule = new NextRequest("http://localhost/api/alerts/rules", {
    method: "POST",
    body: JSON.stringify({
      name: "Risk Breach Alert Rule",
      kind: "risk_limit_breach",
      config: JSON.stringify({}),
      channels: ["in_app"],
    }),
  });
  const resCreateRiskRule = await postAlertRules(reqCreateRiskRule);
  assert.strictEqual(resCreateRiskRule.status, 201);

  const reqBreach = new NextRequest("http://localhost/api/alpaca/orders", {
    method: "POST",
    body: JSON.stringify({
      symbol: "XYZ", // not allow-listed
      qty: 10,
      side: "buy",
      type: "market",
      timeInForce: "day",
      confirmed: true,
    }),
  });

  const resBreach = await placeOrder(reqBreach);
  assert.strictEqual(resBreach.status, 400, "XYZ order should be blocked (400)");

  // Verify 'risk_limit_breach' audit log
  const breachAudit = mockAuditLogs.find((l) => l.action === "risk_limit_breach");
  assert.ok(breachAudit, "Missing risk_limit_breach audit event");
  const breachMeta = JSON.parse(breachAudit.metadata);
  assert.strictEqual(breachMeta.limitType, "symbol_scope");
  assert.strictEqual(breachMeta.attemptedValue, "XYZ");

  // Verify risk breach alert rule evaluated (always triggers risk_limit_breach kind)
  const riskNotif = mockDbDocs.notifications.find((n) => n.type === "risk_limit_breach");
  assert.ok(riskNotif, "Hermes should deliver a notification for risk limit breach");
  console.log("✓ Step 5 complete: Gated symbols allowlist, audited, and alert matched.");

  // --- Step 6: Deactivate alert rule ---
  console.log("\nStep 6: Deactivating alert rule...");
  const reqDeact = new NextRequest(`http://localhost/api/alerts/rules/${rule.id}`, {
    method: "PUT",
    body: JSON.stringify({ active: false }),
  });

  const resDeact = await putAlertRule(reqDeact, { params: Promise.resolve({ id: rule.id }) });
  assert.strictEqual(resDeact.status, 200);

  // Verify 'alert_rule_deleted' with reason: deactivated
  const deactAudit = mockAuditLogs.find((l) => l.action === "alert_rule_deleted" && JSON.parse(l.metadata).reason === "deactivated");
  assert.ok(deactAudit, "Missing alert_rule_deleted deactivated audit log");
  console.log("✓ Step 6 complete: Rule deactivation audited.");

  // --- Step 7: Delete alert rule ---
  console.log("\nStep 7: Deleting alert rule...");
  const reqDel = new NextRequest(`http://localhost/api/alerts/rules/${rule.id}`, {
    method: "DELETE",
  });

  const resDel = await deleteAlertRule(reqDel, { params: Promise.resolve({ id: rule.id }) });
  assert.strictEqual(resDel.status, 200);

  // Verify 'alert_rule_deleted' with reason: deleted
  const delAudit = mockAuditLogs.find((l) => l.action === "alert_rule_deleted" && JSON.parse(l.metadata).reason === "deleted");
  assert.ok(delAudit, "Missing alert_rule_deleted deleted audit log");
  console.log("✓ Step 7 complete: Rule deletion audited.");

  console.log("\n========================================================");
  console.log("ALL END-TO-END SMOKE TESTS PASSED SUCCESSFULLY!");
  console.log("========================================================");
}

main().catch((err) => {
  console.error("\nE2E Smoke Test Failed!");
  console.error(err);
  process.exit(1);
});
