/**
 * Arcana Pulse MCP Server — Streamable HTTP transport (stateless per-request)
 *
 * Authentication: Personal Access Token (PAT) via Authorization: Bearer <token>
 * Tools:
 *   - get_user_resources: Retrieve authenticated user's saved resources
 *   - create_resource:    Create a new resource for the authenticated user
 *
 * MCP SDK: @modelcontextprotocol/sdk v1.x (WebStandardStreamableHTTPServerTransport)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { validateMcpToken } from "@/lib/services/db/mcpTokens";
import { getUserResources, createUserResource } from "@/lib/services/db/resources";
import { isAppwriteConfigured } from "@/lib/appwrite";

// Next.js must run this on Node.js runtime (not Edge) for Appwrite SDK compatibility
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="arcana-pulse"',
      },
    }
  );
}

function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "arcana-pulse",
    version: "1.0.0",
  });

  // ── Tool: get_user_resources ───────────────────────────────────────────
  server.tool(
    "get_user_resources",
    "Get saved Arcana Pulse resources for the authenticated user. Use this when the user asks what links, references, documents, or project resources they have saved.",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of resources to return (default 50)"),
      query: z
        .string()
        .optional()
        .describe("Optional search query to filter resources by title, URL, or notes"),
      tag: z.string().optional().describe("Filter by tag"),
      projectKey: z.string().optional().describe("Filter by project key"),
    },
    async (params) => {
      if (!isAppwriteConfigured()) {
        return {
          content: [{ type: "text", text: "Appwrite is not configured on this server." }],
        };
      }

      try {
        const resources = await getUserResources(userId, {
          limit: params.limit ?? 50,
          query: params.query,
          tag: params.tag,
          projectKey: params.projectKey,
        });

        if (resources.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "You have no saved resources yet. Use create_resource to save your first link.",
              },
            ],
          };
        }

        const formatted = resources.map((r) => ({
          id: r.resourceId,
          title: r.title,
          url: r.url,
          notes: r.notes ?? null,
          tags: r.tags ?? [],
          resourceType: r.resourceType ?? null,
          projectKey: r.projectKey ?? null,
          source: r.source,
          createdAt: r.createdAt,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { content: [{ type: "text", text: `Error retrieving resources: ${msg}` }] };
      }
    }
  );

  // ── Tool: create_resource ──────────────────────────────────────────────
  server.tool(
    "create_resource",
    "Create a new saved Arcana Pulse resource for the authenticated user. Use this when the user asks to save, bookmark, store, or remember a URL, documentation link, or web reference.",
    {
      url: z.string().url().describe("The URL to save"),
      title: z.string().min(1).max(500).describe("Human-readable title for the resource"),
      notes: z
        .string()
        .max(5000)
        .optional()
        .describe("Optional notes or context about this resource"),
      tags: z
        .array(z.string().max(50))
        .max(20)
        .optional()
        .describe("Optional tags for organizing the resource"),
      projectKey: z
        .string()
        .max(100)
        .optional()
        .describe("Optional project association key"),
      resourceType: z
        .enum(["documentation", "grant", "writing", "finance", "code", "reference", "other"])
        .optional()
        .describe("Category of this resource"),
    },
    async (params) => {
      if (!isAppwriteConfigured()) {
        return {
          content: [{ type: "text", text: "Appwrite is not configured on this server." }],
        };
      }

      try {
        const resource = await createUserResource(userId, {
          url: params.url,
          title: params.title,
          notes: params.notes,
          tags: params.tags,
          projectKey: params.projectKey,
          resourceType: params.resourceType,
          source: "mcp",
        });

        return {
          content: [
            {
              type: "text",
              text: `✓ Resource saved: "${resource.title}" (${resource.url})\nID: ${resource.resourceId}`,
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { content: [{ type: "text", text: `Error creating resource: ${msg}` }] };
      }
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Route handlers (POST = MCP messages, GET = SSE stream negotiation)
// ---------------------------------------------------------------------------

async function handleMcpRequest(request: Request): Promise<Response> {
  // 1. Extract and validate PAT
  const authHeader = request.headers.get("Authorization") ?? "";
  const rawToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!rawToken) {
    return unauthorizedResponse("Missing Authorization: Bearer <token>");
  }

  const identity = await validateMcpToken(rawToken);
  if (!identity) {
    return unauthorizedResponse("Invalid or expired MCP access token");
  }

  // 2. Build a fresh MCP server scoped to this user (stateless per-request)
  const server = buildMcpServer(identity.userId);

  // 3. Create stateless transport
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,      // simpler JSON for clients that don't need SSE
  });

  // 4. Connect server ↔ transport, handle request
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export async function GET(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleMcpRequest(request);
}
