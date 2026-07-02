// @ts-nocheck
/**
 * Arcana Pulse — Hermes QA Test Suite
 *
 * Runs unit and integration tests to verify the event-driven notification system (Hermes).
 * Tests evaluation logic, cooldown controls, authentication guards, audit logging,
 * and Appwrite persistent store behavior.
 *
 * Usage:
 *   npx tsx scripts/test-hermes.ts
 */

import assert from "assert";
import Module from "module";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// 1. Module & Environment Mocking (Must be first, before any target imports)
// ---------------------------------------------------------------------------

// Enforce configured Appwrite state
process.env.NEXT_PUBLIC_APPWRITE_PROJECT = "mock-project";
process.env.APPWRITE_API_KEY = "mock-key";
process.env.APPWRITE_DATABASE_ID = "arcana_pulse";
process.env.RESEND_API_KEY = "mock-resend-key";

const mockSentEmails: any[] = [];
const mockAuditLogs: any[] = [];

// Intercept requires to mock next-auth, resend, and Sentry
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

let mockDbDocs: Record<string, MockDoc[]> = {
  alertRules: [],
  notifications: [],
  auditLogs: [],
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
};

function resetDb() {
  mockDbDocs = {
    alertRules: [],
    notifications: [],
    auditLogs: [],
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
  };
  mockSentEmails.length = 0;
  mockAuditLogs.length = 0;
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

  // Capture audit logs locally if it's the auditLogs collection
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
// 3. Dynamic import of route handlers and services after mocking is active
// ---------------------------------------------------------------------------
const { evaluateAndNotify } = require("../src/lib/services/hermes");
const { GET: getAlertRules, POST: postAlertRules } = require("../src/app/api/alerts/rules/route");
const { GET: getAlertRule, PUT: putAlertRule, DELETE: deleteAlertRule } = require("../src/app/api/alerts/rules/[id]/route");
const { GET: getNotifications, PATCH: patchNotifications } = require("../src/app/api/notifications/route");

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
  console.log("=== Hermes Alerts & Notifications QA Test Suite ===\n");

  const tests: { name: string; fn: () => Promise<void> }[] = [];

  function test(name: string, fn: () => Promise<void>) {
    tests.push({ name, fn });
  }

  // ---------------------------------------------------------------------------
  // UNIT TESTS: Rule Evaluation Logic
  // ---------------------------------------------------------------------------

  test("Unit: evaluate price_threshold (above triggers, below does not)", async () => {
    // Setup rule in mocked Appwrite db
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-1", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "AAPL price target",
      kind: "price_threshold",
      config: JSON.stringify({ symbol: "AAPL", operator: "above", value: 150 }),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: null,
    });

    // 1. Under value
    await evaluateAndNotify("ws-001", "price_threshold", { symbol: "AAPL", currentPrice: 145 });
    assert.strictEqual(mockDbDocs.notifications.length, 0, "Should not notify if price is below threshold");

    // 2. Over value -> triggers
    await evaluateAndNotify("ws-001", "price_threshold", { symbol: "AAPL", currentPrice: 155 });
    assert.strictEqual(mockDbDocs.notifications.length, 1, "Should notify if price is above threshold");
    assert.strictEqual(mockDbDocs.notifications[0].title, "AAPL Price Threshold Crossed");
    assert.strictEqual(
      mockDbDocs.notifications[0].body,
      "AAPL is now $155.00, crossing above the threshold of $150.00."
    );
  });

  test("Unit: evaluate price_threshold (below operator)", async () => {
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-2", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "AAPL bottom target",
      kind: "price_threshold",
      config: JSON.stringify({ symbol: "AAPL", operator: "below", value: 100 }),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: null,
    });

    // 1. Above value
    await evaluateAndNotify("ws-001", "price_threshold", { symbol: "AAPL", currentPrice: 105 });
    assert.strictEqual(mockDbDocs.notifications.length, 0, "Should not notify if price is above bottom threshold");

    // 2. Below value -> triggers
    await evaluateAndNotify("ws-001", "price_threshold", { symbol: "AAPL", currentPrice: 95 });
    assert.strictEqual(mockDbDocs.notifications.length, 1, "Should notify if price is below bottom threshold");
  });

  test("Unit: evaluate strategy_signal", async () => {
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-3", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "MACD alerts",
      kind: "strategy_signal",
      config: JSON.stringify({ symbol: "AAPL", strategyName: "MACD-Cross" }),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: null,
    });

    // 1. Mismatch strategy
    await evaluateAndNotify("ws-001", "strategy_signal", {
      symbol: "AAPL",
      strategyName: "RSI-Cross",
      signalType: "entry",
      label: "simulated",
    });
    assert.strictEqual(mockDbDocs.notifications.length, 0, "Should mismatch on strategyName");

    // 2. Match
    await evaluateAndNotify("ws-001", "strategy_signal", {
      symbol: "AAPL",
      strategyName: "MACD-Cross",
      signalType: "entry",
      label: "simulated",
    });
    assert.strictEqual(mockDbDocs.notifications.length, 1, "Should trigger signal alert");
    assert.strictEqual(mockDbDocs.notifications[0].title, "Strategy Signal: MACD-Cross");
    assert.ok(mockDbDocs.notifications[0].body.includes("[simulated]"));
  });

  test("Unit: evaluate paper_order_event", async () => {
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-4", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "Order Fills",
      kind: "paper_order_event",
      config: JSON.stringify({ symbol: "AAPL" }),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: null,
    });

    await evaluateAndNotify("ws-001", "paper_order_event", {
      symbol: "AAPL",
      side: "buy",
      qty: 10,
      status: "filled",
    });

    assert.strictEqual(mockDbDocs.notifications.length, 1, "Should trigger order fill alert");
    assert.strictEqual(mockDbDocs.notifications[0].title, "Paper Order FILLED");
  });

  test("Unit: evaluate risk_limit_breach (always triggers)", async () => {
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-5", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "Risk Breach Warning",
      kind: "risk_limit_breach",
      config: JSON.stringify({}),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: null,
    });

    await evaluateAndNotify("ws-001", "risk_limit_breach", {
      limitType: "MaxOrderSize",
      attemptedValue: 1500,
      limitValue: 1000,
      label: "paper-trading",
    });

    assert.strictEqual(mockDbDocs.notifications.length, 1, "Should trigger on risk breach");
    assert.strictEqual(mockDbDocs.notifications[0].title, "Risk Limit Breach: MaxOrderSize");
    assert.ok(mockDbDocs.notifications[0].body.includes("[paper-trading]"));
  });

  // ---------------------------------------------------------------------------
  // UNIT TESTS: Cooldown Control
  // ---------------------------------------------------------------------------

  test("Unit: cooldown suppression (suppressed for price threshold, bypassed for risk breach)", async () => {
    // 1. Setup price rule with lastTriggeredAt = now - 5 mins
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-cooldown-price", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "Price Watch",
      kind: "price_threshold",
      config: JSON.stringify({ symbol: "AAPL", operator: "above", value: 150 }),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    });

    // Evaluate -> should suppress
    await evaluateAndNotify("ws-001", "price_threshold", { symbol: "AAPL", currentPrice: 160 });
    assert.strictEqual(mockDbDocs.notifications.length, 0, "Price Threshold should be suppressed during cooldown");

    // 2. Setup risk rule with lastTriggeredAt = now - 5 mins
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-cooldown-risk", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "Risk Watch",
      kind: "risk_limit_breach",
      config: JSON.stringify({}),
      channels: ["in_app"],
      active: true,
      lastTriggeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });

    // Evaluate -> should bypass cooldown and trigger!
    await evaluateAndNotify("ws-001", "risk_limit_breach", {
      limitType: "MaxOrderSize",
      attemptedValue: 1500,
      limitValue: 1000,
      label: "paper-trading",
    });
    assert.strictEqual(mockDbDocs.notifications.length, 1, "Risk breaches should bypass cooldown and trigger");
  });

  // ---------------------------------------------------------------------------
  // INTEGRATION TESTS: Route Authentication Guards
  // ---------------------------------------------------------------------------

  test("Integration: requireAuth on GET/POST alert rules and GET notifications routes", async () => {
    // Set session to null to simulate logged-out user
    mockSession = null;

    // GET /api/alerts/rules
    const reqGetRules = new NextRequest("http://localhost/api/alerts/rules");
    const resGetRules = await getAlertRules(reqGetRules);
    assert.strictEqual(resGetRules.status, 401, "GET rules should require auth (401)");

    // POST /api/alerts/rules
    const reqPostRules = new NextRequest("http://localhost/api/alerts/rules", {
      method: "POST",
      body: JSON.stringify({ name: "Rule", kind: "price_threshold", config: "{}", channels: ["in_app"] }),
    });
    const resPostRules = await postAlertRules(reqPostRules);
    assert.strictEqual(resPostRules.status, 401, "POST rules should require auth (401)");

    // GET /api/notifications
    const reqGetNotifs = new NextRequest("http://localhost/api/notifications");
    const resGetNotifs = await getNotifications(reqGetNotifs);
    assert.strictEqual(resGetNotifs.status, 401, "GET notifications should require auth (401)");
  });

  test("Integration: requireAuth role checks", async () => {
    // Set user role to viewer
    mockSession = {
      user: {
        userId: "usr-002",
        workspaceId: "ws-001",
        email: "viewer@arcanacu.org",
        role: "viewer",
      },
    };

    // GET should pass for viewer
    const reqGetRules = new NextRequest("http://localhost/api/alerts/rules");
    const resGetRules = await getAlertRules(reqGetRules);
    assert.strictEqual(resGetRules.status, 200, "GET rules should allow viewer (200)");

    // POST should fail for viewer (requires member)
    const reqPostRules = new NextRequest("http://localhost/api/alerts/rules", {
      method: "POST",
      body: JSON.stringify({ name: "Rule", kind: "price_threshold", config: "{}", channels: ["in_app"] }),
    });
    const resPostRules = await postAlertRules(reqPostRules);
    assert.strictEqual(resPostRules.status, 403, "POST rules should block viewer (403)");
  });

  test("Integration: workspace boundary check on individual rule route", async () => {
    // Add rule in workspace ws-002
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-other", {
      workspaceId: "ws-002",
      createdBy: "usr-002",
      name: "Secret Rule",
      kind: "price_threshold",
      config: JSON.stringify({}),
      channels: ["in_app"],
      active: true,
    });

    // Session belongs to ws-001
    mockSession = {
      user: {
        userId: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
      },
    };

    // GET /api/alerts/rules/alr-other -> should return 403
    const reqGet = new NextRequest("http://localhost/api/alerts/rules/alr-other");
    const resGet = await getAlertRule(reqGet, { params: Promise.resolve({ id: "alr-other" }) });
    assert.strictEqual(resGet.status, 403, "Access to other workspace rule should return 403");

    // PUT /api/alerts/rules/alr-other -> should return 403
    const reqPut = new NextRequest("http://localhost/api/alerts/rules/alr-other", {
      method: "PUT",
      body: JSON.stringify({ name: "Hacked" }),
    });
    const resPut = await putAlertRule(reqPut, { params: Promise.resolve({ id: "alr-other" }) });
    assert.strictEqual(resPut.status, 403, "Modification to other workspace rule should return 403");

    // DELETE /api/alerts/rules/alr-other -> should return 403
    const reqDelete = new NextRequest("http://localhost/api/alerts/rules/alr-other", {
      method: "DELETE",
    });
    const resDelete = await deleteAlertRule(reqDelete, { params: Promise.resolve({ id: "alr-other" }) });
    assert.strictEqual(resDelete.status, 403, "Deletion of other workspace rule should return 403");
  });

  // ---------------------------------------------------------------------------
  // INTEGRATION TESTS: CRUD Operations
  // ---------------------------------------------------------------------------

  test("Integration: Alert rules CRUD endpoints behavior", async () => {
    mockSession = {
      user: {
        userId: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
      },
    };

    // 1. Create (POST)
    const reqPost = new NextRequest("http://localhost/api/alerts/rules", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Rule",
        kind: "price_threshold",
        config: JSON.stringify({ symbol: "AAPL", operator: "above", value: 150 }),
        channels: ["in_app", "email"],
      }),
    });
    const resPost = await postAlertRules(reqPost);
    assert.strictEqual(resPost.status, 201, "POST should create rule (201)");
    const created = await responseJson(resPost);
    assert.ok(created.id, "Created rule should have an id");
    assert.strictEqual(created.name, "Test Rule");

    // Verify audit log
    const createAudit = mockAuditLogs.find((l) => l.action === "alert_rule_created");
    assert.ok(createAudit, "Rule creation should produce alert_rule_created audit event");
    assert.strictEqual(createAudit.targetId, created.id);

    // 2. Fetch (GET single)
    const reqGet = new NextRequest(`http://localhost/api/alerts/rules/${created.id}`);
    const resGet = await getAlertRule(reqGet, { params: Promise.resolve({ id: created.id }) });
    assert.strictEqual(resGet.status, 200);
    const fetched = await responseJson(resGet);
    assert.strictEqual(fetched.name, "Test Rule");

    // 3. Update (PUT)
    const reqPut = new NextRequest(`http://localhost/api/alerts/rules/${created.id}`, {
      method: "PUT",
      body: JSON.stringify({
        active: false,
      }),
    });
    const resPut = await putAlertRule(reqPut, { params: Promise.resolve({ id: created.id }) });
    assert.strictEqual(resPut.status, 200);
    const updated = await responseJson(resPut);
    assert.strictEqual(updated.active, false);

    // Verify active transition deletion audit log
    const deactAudit = mockAuditLogs.find((l) => l.action === "alert_rule_deleted" && l.metadata.includes("deactivated"));
    assert.ok(deactAudit, "Rule deactivation should produce alert_rule_deleted audit event");

    // 4. Delete (DELETE)
    const reqDel = new NextRequest(`http://localhost/api/alerts/rules/${created.id}`, {
      method: "DELETE",
    });
    const resDel = await deleteAlertRule(reqDel, { params: Promise.resolve({ id: created.id }) });
    assert.strictEqual(resDel.status, 200);

    // Verify deletion audit log
    const delAudit = mockAuditLogs.find((l) => l.action === "alert_rule_deleted" && l.metadata.includes("deleted"));
    assert.ok(delAudit, "Rule deletion should produce alert_rule_deleted audit event");
  });

  // ---------------------------------------------------------------------------
  // INTEGRATION TESTS: Alert Delivery & Audit Logging
  // ---------------------------------------------------------------------------

  test("Integration: delivered alert produces exactly one alert_sent audit entry per channel", async () => {
    // Setup rule
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-delivery", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "Delivery Rule",
      kind: "price_threshold",
      config: JSON.stringify({ symbol: "AAPL", operator: "above", value: 150 }),
      channels: ["in_app", "email"],
      active: true,
      lastTriggeredAt: null,
    });

    // Evaluate trigger
    await evaluateAndNotify("ws-001", "price_threshold", { symbol: "AAPL", currentPrice: 160 });

    // Assertions
    assert.strictEqual(mockDbDocs.notifications.length, 1, "Should create one in-app notification");
    assert.strictEqual(mockSentEmails.length, 1, "Should send one email");

    // Check audits
    const alertSentAudits = mockAuditLogs.filter((l) => l.action === "alert_sent");
    assert.strictEqual(alertSentAudits.length, 2, "Should log exactly two alert_sent events (in_app & email)");

    const inAppAudit = alertSentAudits.find((a) => a.metadata.includes("in_app"));
    const emailAudit = alertSentAudits.find((a) => a.metadata.includes("email"));

    assert.ok(inAppAudit, "Missing in_app alert_sent audit log");
    assert.ok(emailAudit, "Missing email alert_sent audit log");
  });

  test("Integration: email template formatting and source labels", async () => {
    // Setup strategy rule with email channel
    await Databases.prototype.createDocument(null as any, "alertRules", "alr-email-tmpl", {
      workspaceId: "ws-001",
      createdBy: "usr-001",
      name: "Strategy alerts",
      kind: "strategy_signal",
      config: JSON.stringify({ symbol: "AAPL" }),
      channels: ["email"],
      active: true,
      lastTriggeredAt: null,
    });

    await evaluateAndNotify("ws-001", "strategy_signal", {
      symbol: "AAPL",
      strategyName: "SMA-Cross",
      signalType: "entry",
      label: "educational", // MUST contain the source label
    });

    assert.strictEqual(mockSentEmails.length, 1);
    const email = mockSentEmails[0];
    assert.ok(email.subject.includes("Strategy Signal: SMA-Cross"), "Email subject mismatch");
    assert.ok(email.html.includes("[educational]"), "Email body must carry the educational source label");
    assert.ok(email.html.includes("style="), "Email body should render styles");
  });

  // ---------------------------------------------------------------------------
  // INTEGRATION TESTS: Persistent Appwrite Store
  // ---------------------------------------------------------------------------

  test("Integration: notifications persist across simulated restart (Appwrite migration confirmation)", async () => {
    mockSession = {
      user: {
        userId: "usr-001",
        workspaceId: "ws-001",
        email: "alex@arcanacu.org",
        role: "owner",
      },
    };

    // 1. Add notification through simulated endpoint or evaluateAndNotify
    await Databases.prototype.createDocument(null as any, "notifications", "notif-persist-1", {
      workspaceId: "ws-001",
      type: "anomaly",
      severity: "critical",
      title: "Suspicious login",
      body: "An login attempt from unknown IP address was recorded.",
      read: false,
    });

    // Verify stored
    assert.strictEqual(mockDbDocs.notifications.length, 1);

    // 2. Simulate process restart by rebuilding/clearing process-level mock arrays, BUT keeping the db state
    const savedNotificationsState = [...mockDbDocs.notifications];

    // Clear notifications array in our db object
    mockDbDocs.notifications = [];

    // Re-verify it was cleared
    assert.strictEqual(mockDbDocs.notifications.length, 0);

    // Restore the database state (represents Appwrite server storage continuing to exist)
    mockDbDocs.notifications = savedNotificationsState;

    // 3. Fetch notifications via GET route -> should retrieve it from the persistent store mock
    const req = new NextRequest("http://localhost/api/notifications");
    const res = await getNotifications(req);
    assert.strictEqual(res.status, 200);

    const body = await responseJson(res);
    assert.strictEqual(body.notifications.length, 1, "Notifications should be retrieved from persisted DB");
    assert.strictEqual(body.notifications[0].title, "Suspicious login");
  });

  // Execute sequentially to avoid state sharing collisions
  let passedCount = 0;
  let failedCount = 0;

  for (const t of tests) {
    resetDb();
    // Default session context
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
