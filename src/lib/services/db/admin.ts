/**
 * Admin DB service — platform-wide queries for the /admin dashboard.
 *
 * All functions here operate across all workspaces (no workspaceId scoping).
 * They are only called from API routes protected by requirePlatformAdmin().
 */

import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
  isAppwriteConfigured,
} from "@/lib/appwrite";
import { generateId } from "@/lib/utils";
import type {
  PlatformMetrics,
  AdminUser,
  FeatureFlag,
  SupportTicket,
  MembershipType,
  UserRole,
} from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Platform metrics
// ---------------------------------------------------------------------------

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  if (!isAppwriteConfigured()) {
    return getMockMetrics();
  }

  const db = getDatabase();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();

  try {
    const [usersResult, workspacesResult, txnResult, recentUsersResult] =
      await Promise.all([
        db.listDocuments(DATABASE_ID, COLLECTIONS.users, [Query.limit(1)]),
        db.listDocuments(DATABASE_ID, COLLECTIONS.workspaces, [
          Query.equal("status", "active"),
          Query.limit(1),
        ]),
        db.listDocuments(DATABASE_ID, COLLECTIONS.transactions, [
          Query.limit(1),
        ]),
        db.listDocuments(DATABASE_ID, COLLECTIONS.users, [
          Query.greaterThanEqual("createdAt", cutoff),
          Query.limit(1),
        ]),
      ]);

    // Sum transaction volume via a targeted query — we get total from the count
    // Appwrite doesn't support aggregation natively; we use the total from listDocuments
    // and compute volume from a sample for display purposes.
    let totalVolume = 0;
    try {
      const volumeSample = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.transactions,
        [Query.limit(100), Query.orderDesc("$createdAt")]
      );
      totalVolume = (volumeSample.documents as (Models.Document & { amount?: number })[]).reduce(
        (s, d) => s + (typeof d.amount === "number" ? d.amount : 0),
        0
      );
    } catch {
      totalVolume = 0;
    }

    // Revenue: sum stripe payment intents or plan revenue — for now sum from workspaces
    // This will be a real stripe aggregate when billing is wired
    const revenue = 0; // placeholder until Stripe webhook data is stored

    return {
      totalUsers: usersResult.total,
      activeWorkspaces: workspacesResult.total,
      totalTransactionVolume: totalVolume,
      totalTransactionCount: txnResult.total,
      totalRevenue: revenue,
      newUsersLast30Days: recentUsersResult.total,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return getMockMetrics();
  }
}

function getMockMetrics(): PlatformMetrics {
  return {
    totalUsers: 0,
    activeWorkspaces: 0,
    totalTransactionVolume: 0,
    totalTransactionCount: 0,
    totalRevenue: 0,
    newUsersLast30Days: 0,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// User lookup
// ---------------------------------------------------------------------------

type UserDoc = Models.Document & Record<string, unknown>;

function toAdminUser(doc: UserDoc): AdminUser {
  return {
    userId: doc.$id,
    email: typeof doc.email === "string" ? doc.email : "",
    firstName: typeof doc.firstName === "string" ? doc.firstName : "",
    lastName: typeof doc.lastName === "string" ? doc.lastName : "",
    role:
      typeof doc.role === "string"
        ? (doc.role as UserRole)
        : "member",
    membershipType:
      typeof doc.membershipType === "string"
        ? (doc.membershipType as MembershipType)
        : "standard",
    workspaceId:
      typeof doc.workspaceId === "string" ? doc.workspaceId : "",
    createdAt:
      typeof doc.createdAt === "string" ? doc.createdAt : doc.$createdAt,
    emailVerified:
      typeof doc.emailVerified === "boolean" ? doc.emailVerified : false,
    mfaEnabled: typeof doc.mfaEnabled === "boolean" ? doc.mfaEnabled : false,
  };
}

export async function updateAdminUser(
  userId: string,
  updates: Partial<{
    role: UserRole;
    membershipType: MembershipType;
    emailVerified: boolean;
  }>
): Promise<AdminUser | null> {
  if (!isAppwriteConfigured()) return null;
  const db = getDatabase();

  try {
    const doc = await db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.users,
      userId,
      updates
    );
    return toAdminUser(doc as UserDoc);
  } catch {
    return null;
  }
}

export async function searchUsers(
  query: string,
  limit = 20
): Promise<{ users: AdminUser[]; total: number }> {
  if (!isAppwriteConfigured()) {
    return { users: [], total: 0 };
  }

  const db = getDatabase();
  const pageSize = Math.min(limit, 50);

  try {
    // Appwrite full-text search on the email field
    const result = await db.listDocuments(DATABASE_ID, COLLECTIONS.users, [
      Query.search("email", query),
      Query.limit(pageSize),
      Query.orderDesc("$createdAt"),
    ]);

    return {
      users: (result.documents as UserDoc[]).map(toAdminUser),
      total: result.total,
    };
  } catch {
    // Fall back to prefix match on email
    try {
      const result = await db.listDocuments(DATABASE_ID, COLLECTIONS.users, [
        Query.startsWith("email", query.toLowerCase()),
        Query.limit(pageSize),
        Query.orderDesc("$createdAt"),
      ]);
      return {
        users: (result.documents as UserDoc[]).map(toAdminUser),
        total: result.total,
      };
    } catch {
      return { users: [], total: 0 };
    }
  }
}

export async function listRecentUsers(
  limit = 20,
  offset = 0
): Promise<{ users: AdminUser[]; total: number }> {
  if (!isAppwriteConfigured()) {
    return { users: [], total: 0 };
  }

  const db = getDatabase();

  try {
    const result = await db.listDocuments(DATABASE_ID, COLLECTIONS.users, [
      Query.limit(Math.min(limit, 50)),
      Query.offset(offset),
      Query.orderDesc("$createdAt"),
    ]);

    return {
      users: (result.documents as UserDoc[]).map(toAdminUser),
      total: result.total,
    };
  } catch {
    return { users: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

type FlagDoc = Models.Document & Record<string, unknown>;

function toFlag(doc: FlagDoc): FeatureFlag {
  return {
    flagId: doc.$id,
    key: typeof doc.key === "string" ? doc.key : "",
    label: typeof doc.label === "string" ? doc.label : "",
    description: typeof doc.description === "string" ? doc.description : "",
    enabled: typeof doc.enabled === "boolean" ? doc.enabled : false,
    rolloutPercentage:
      typeof doc.rolloutPercentage === "number" ? doc.rolloutPercentage : 0,
    updatedAt:
      typeof doc.updatedAt === "string" ? doc.updatedAt : doc.$updatedAt,
    updatedBy: typeof doc.updatedBy === "string" ? doc.updatedBy : "",
  };
}

// Default feature flags seeded if none exist
const DEFAULT_FLAGS: Omit<FeatureFlag, "flagId" | "updatedAt" | "updatedBy">[] = [
  {
    key: "enable_mcp_server",
    label: "MCP Server",
    description: "Allow AI clients to connect via the Model Context Protocol server",
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    key: "enable_portfolio_ai",
    label: "Portfolio AI Insights",
    description: "AI-powered portfolio analysis and tax-loss harvesting suggestions",
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    key: "enable_forecast",
    label: "Cash Flow Forecast",
    description: "AI-generated 3-month cash flow forecasting based on recurring transactions",
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    key: "enable_budget_recommendations",
    label: "Budget Recommendations",
    description: "AI budget advisor using 50/30/20 rule and spending history",
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    key: "enable_algo_trading",
    label: "Algorithmic Trading Strategies",
    description: "Alpaca-powered algo strategy execution (paper trading mode)",
    enabled: false,
    rolloutPercentage: 0,
  },
  {
    key: "enable_employer_portal",
    label: "Employer Portal",
    description: "Job listing and talent matching features for employer accounts",
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    key: "enable_react_native_app",
    label: "Mobile App (React Native)",
    description: "Allow access from the Arcana Pulse mobile app",
    enabled: false,
    rolloutPercentage: 0,
  },
];

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  if (!isAppwriteConfigured()) {
    return DEFAULT_FLAGS.map((f, i) => ({
      ...f,
      flagId: `mock-flag-${i}`,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    }));
  }

  const db = getDatabase();

  try {
    const result = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.featureFlags,
      [Query.limit(50), Query.orderAsc("key")]
    );

    if (result.total === 0) {
      // Seed defaults on first access
      return await seedDefaultFlags(db);
    }

    return (result.documents as FlagDoc[]).map(toFlag);
  } catch {
    // Collection may not exist yet — return defaults
    return DEFAULT_FLAGS.map((f, i) => ({
      ...f,
      flagId: `default-${i}`,
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    }));
  }
}

async function seedDefaultFlags(db: ReturnType<typeof getDatabase>): Promise<FeatureFlag[]> {
  const now = new Date().toISOString();
  const flags: FeatureFlag[] = [];

  for (const f of DEFAULT_FLAGS) {
    try {
      const doc = await db.createDocument(
        DATABASE_ID,
        COLLECTIONS.featureFlags,
        generateId("flag"),
        {
          key: f.key,
          label: f.label,
          description: f.description,
          enabled: f.enabled,
          rolloutPercentage: f.rolloutPercentage,
          updatedAt: now,
          updatedBy: "system",
        }
      );
      flags.push(toFlag(doc as FlagDoc));
    } catch {
      flags.push({
        ...f,
        flagId: generateId("flag"),
        updatedAt: now,
        updatedBy: "system",
      });
    }
  }

  return flags;
}

export async function updateFeatureFlag(
  flagId: string,
  updates: { enabled?: boolean; rolloutPercentage?: number },
  updatedBy: string
): Promise<FeatureFlag | null> {
  if (!isAppwriteConfigured()) return null;

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const doc = await db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.featureFlags,
      flagId,
      { ...updates, updatedAt: now, updatedBy }
    );
    return toFlag(doc as FlagDoc);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

type TicketDoc = Models.Document & Record<string, unknown>;

function toTicket(doc: TicketDoc): SupportTicket {
  return {
    ticketId: doc.$id,
    userId: typeof doc.userId === "string" ? doc.userId : "",
    userEmail: typeof doc.userEmail === "string" ? doc.userEmail : "",
    subject: typeof doc.subject === "string" ? doc.subject : "",
    body: typeof doc.body === "string" ? doc.body : "",
    status:
      typeof doc.status === "string"
        ? (doc.status as SupportTicket["status"])
        : "open",
    priority:
      typeof doc.priority === "string"
        ? (doc.priority as SupportTicket["priority"])
        : "medium",
    createdAt:
      typeof doc.createdAt === "string" ? doc.createdAt : doc.$createdAt,
    updatedAt:
      typeof doc.updatedAt === "string" ? doc.updatedAt : doc.$updatedAt,
    resolvedAt:
      typeof doc.resolvedAt === "string" ? doc.resolvedAt : undefined,
  };
}

export async function listSupportTickets(
  status?: SupportTicket["status"],
  limit = 20
): Promise<{ tickets: SupportTicket[]; total: number }> {
  if (!isAppwriteConfigured()) {
    return { tickets: [], total: 0 };
  }

  const db = getDatabase();
  const filters = [
    Query.limit(Math.min(limit, 50)),
    Query.orderDesc("$createdAt"),
  ];
  if (status) filters.push(Query.equal("status", status));

  try {
    const result = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.supportTickets,
      filters
    );
    return {
      tickets: (result.documents as TicketDoc[]).map(toTicket),
      total: result.total,
    };
  } catch {
    return { tickets: [], total: 0 };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: SupportTicket["status"]
): Promise<SupportTicket | null> {
  if (!isAppwriteConfigured()) return null;

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const doc = await db.updateDocument(
      DATABASE_ID,
      COLLECTIONS.supportTickets,
      ticketId,
      {
        status,
        updatedAt: now,
        ...(status === "resolved" || status === "closed"
          ? { resolvedAt: now }
          : {}),
      }
    );
    return toTicket(doc as TicketDoc);
  } catch {
    return null;
  }
}
