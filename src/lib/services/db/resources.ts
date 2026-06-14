import { ID, Query } from "node-appwrite";
import { getDatabase, DATABASE_ID, COLLECTIONS, isAppwriteConfigured } from "@/lib/appwrite";
import type { ArcanaResource, CreateResourceInput } from "@/lib/types";
import type { Models } from "node-appwrite";

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toResource(doc: Models.Document & Record<string, unknown>): ArcanaResource {
  return {
    resourceId: doc.$id,
    userId: doc.userId as string,
    url: doc.url as string,
    title: doc.title as string,
    notes: (doc.notes as string) || undefined,
    tags: doc.tags ? JSON.parse(doc.tags as string) : undefined,
    resourceType: (doc.resourceType as ArcanaResource["resourceType"]) || undefined,
    projectKey: (doc.projectKey as string) || undefined,
    source: (doc.source as ArcanaResource["source"]) ?? "manual",
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface GetResourcesOptions {
  limit?: number;
  query?: string;
  tag?: string;
  projectKey?: string;
}

/**
 * Returns resources for a user, newest first. All queries are scoped to userId
 * — no cross-user access is possible.
 */
export async function getUserResources(
  userId: string,
  options: GetResourcesOptions = {}
): Promise<ArcanaResource[]> {
  if (!isAppwriteConfigured()) return [];

  const db = getDatabase();
  const queries: string[] = [
    Query.equal("userId", userId),
    Query.orderDesc("$createdAt"),
    Query.limit(options.limit ?? 100),
  ];

  if (options.tag) queries.push(Query.search("tags", options.tag));
  if (options.projectKey) queries.push(Query.equal("projectKey", options.projectKey));

  const res = await db.listDocuments(DATABASE_ID, COLLECTIONS.resources, queries);
  const resources = res.documents.map(toResource);

  // Optional title/URL search filter (Appwrite free tier doesn't support full-text on arbitrary fields)
  if (options.query) {
    const q = options.query.toLowerCase();
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
    );
  }

  return resources;
}

/**
 * Fetches a single resource, verifying userId ownership.
 */
export async function getResourceById(
  userId: string,
  resourceId: string
): Promise<ArcanaResource | null> {
  if (!isAppwriteConfigured()) return null;

  try {
    const db = getDatabase();
    const doc = await db.getDocument(DATABASE_ID, COLLECTIONS.resources, resourceId);
    if (doc.userId !== userId) return null; // ownership check
    return toResource(doc as Models.Document & Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Creates a resource owned by userId.
 */
export async function createUserResource(
  userId: string,
  data: CreateResourceInput
): Promise<ArcanaResource> {
  const db = getDatabase();

  const doc = await db.createDocument(
    DATABASE_ID,
    COLLECTIONS.resources,
    ID.unique(),
    {
      userId,
      url: data.url,
      title: data.title,
      notes: data.notes ?? null,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      resourceType: data.resourceType ?? null,
      projectKey: data.projectKey ?? null,
      source: data.source ?? "manual",
    }
  );

  return toResource(doc as Models.Document & Record<string, unknown>);
}

/**
 * Deletes a resource, verifying userId ownership before deletion.
 * Returns true if deleted, false if not found or not owned.
 */
export async function deleteUserResource(
  userId: string,
  resourceId: string
): Promise<boolean> {
  const db = getDatabase();

  // Ownership check first
  const resource = await getResourceById(userId, resourceId);
  if (!resource) return false;

  await db.deleteDocument(DATABASE_ID, COLLECTIONS.resources, resourceId);
  return true;
}
