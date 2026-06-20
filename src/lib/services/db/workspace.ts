import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { Workspace, User, WorkspacePlan } from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Document → entity mappers
// ---------------------------------------------------------------------------

function toWorkspace(doc: Models.Document & Record<string, any>): Workspace {
  return {
    workspaceId: doc.$id,
    name: doc.name,
    ownerUserId: doc.ownerUserId,
    plan: doc.plan as WorkspacePlan,
    status: doc.status,
    tradingPaused: doc.tradingPaused ?? false,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

function toUser(doc: Models.Document & Record<string, any>): User {
  return {
    userId: doc.$id,
    workspaceId: doc.workspaceId,
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    imageUrl: doc.imageUrl ?? undefined,
    role: doc.role,
    membershipType: doc.membershipType ?? "standard",
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Workspace operations
// ---------------------------------------------------------------------------

export async function getWorkspace(
  workspaceId: string
): Promise<Workspace | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.workspaces,
      workspaceId
    );
    return toWorkspace(doc);
  } catch {
    return null;
  }
}

export async function updateWorkspace(
  workspaceId: string,
  updates: { name?: string; plan?: WorkspacePlan; tradingPaused?: boolean }
): Promise<Workspace> {
  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.workspaces,
    workspaceId,
    updates
  );
  return toWorkspace(doc);
}

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.users,
      userId
    );
    return toUser(doc);
  } catch {
    return null;
  }
}

export async function getUserByWorkspace(
  workspaceId: string
): Promise<User | null> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.users,
    [Query.equal("workspaceId", workspaceId), Query.limit(1)]
  );
  return result.documents.length > 0 ? toUser(result.documents[0]) : null;
}

export async function getUserByEmail(email: string): Promise<
  | (User & { passwordHash: string })
  | null
> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.users,
    [Query.equal("email", email.toLowerCase()), Query.limit(1)]
  );
  if (result.documents.length === 0) return null;
  const doc = result.documents[0];
  return { ...toUser(doc), passwordHash: doc.passwordHash };
}
