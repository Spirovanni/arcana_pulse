# MCP Resource Vault — Setup and Integration Guide

The **Resource Vault** lets you save, view, and manage important URLs, documentation links, research references, and project resources inside Arcana Pulse. The same data is accessible to AI clients (Cursor, Claude Desktop) via an authenticated **MCP (Model Context Protocol) server** at `/api/mcp`.

---

## Feature Overview

- **Web UI** at `/resources` — save, search, and delete resources in the browser
- **MCP server** at `/api/mcp` — AI tools can retrieve and create resources
- **Personal Access Tokens (PATs)** — generate and manage MCP credentials from the UI
- **Full ownership isolation** — every operation is scoped to the authenticated user

### MCP Tools Available

| Tool | Description |
|---|---|
| `get_user_resources` | Retrieve the authenticated user's saved resources |
| `create_resource` | Create a new resource for the authenticated user |

---

## Appwrite Collection Setup

The Resource Vault requires two Appwrite collections in your database.

### 1. `resources` collection

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `userId` | String | Yes | Owner's NextAuth user ID |
| `url` | String (URL) | Yes | |
| `title` | String | Yes | Max 500 chars |
| `notes` | String | No | Max 5000 chars |
| `tags` | String (JSON) | No | JSON array of strings |
| `resourceType` | String | No | `documentation`, `grant`, `writing`, `finance`, `code`, `reference`, `other` |
| `projectKey` | String | No | Optional Arcana project key |
| `source` | String | No | `manual`, `mcp`, or `import` |

**Indexes:**
- `userId` (ASC) — for fast ownership-scoped queries
- `$createdAt` (DESC) — for newest-first ordering

### 2. `mcpTokens` collection

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `userId` | String | Yes | Owner's NextAuth user ID |
| `tokenHash` | String | Yes | bcrypt hash of the raw PAT |
| `label` | String | Yes | Human-readable label |
| `lastUsedAt` | DateTime | No | Auto-updated on use |
| `expiresAt` | DateTime | No | Optional expiry |

**Indexes:**
- `userId` (ASC)

---

## Required Environment Variables

These should already be set for Arcana Pulse. No new variables are required for the MCP feature beyond what's already configured.

| Variable | Purpose |
|---|---|
| `NEXTAUTH_URL` | Base URL (used by well-known OAuth endpoints) |
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Appwrite endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | Appwrite project ID |
| `APPWRITE_DATABASE_ID` | Appwrite database ID |
| `APPWRITE_API_KEY` | Appwrite server API key |

---

## Connecting Cursor to the MCP Server

### Step 1: Generate a Personal Access Token

1. Sign in to Arcana Pulse.
2. Navigate to `/resources` (Resource Vault).
3. Scroll to **MCP Access Tokens**.
4. Click **Generate New Token**.
5. Copy the token — it starts with `ap_` and is shown **only once**.

### Step 2: Add the MCP server in Cursor

Open Cursor settings and add the following MCP server configuration:

```json
{
  "mcpServers": {
    "arcana-pulse": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer ap_<YOUR_TOKEN>"
      }
    }
  }
}
```

For production, replace `http://localhost:3000` with your deployed Arcana Pulse URL:

```json
{
  "mcpServers": {
    "arcana-pulse": {
      "url": "https://arcanacu.org/api/mcp",
      "headers": {
        "Authorization": "Bearer ap_<YOUR_TOKEN>"
      }
    }
  }
}
```

### Step 3: Test the connection

In Cursor, try these prompts:

- `"What Arcana Pulse resources do I have saved?"`
- `"Save the React docs (https://react.dev) as a resource in Arcana Pulse."`
- `"Add this URL to my Arcana Pulse vault: https://example.com — title: Example, notes: For reference."`

Verify that MCP-created resources appear in the web UI at `/resources`.

---

## OAuth Metadata Endpoints

Two well-known endpoints are provided for MCP client discovery:

| Endpoint | Purpose |
|---|---|
| `/.well-known/oauth-authorization-server` | OAuth 2.0 Authorization Server Metadata (RFC 8414) |
| `/.well-known/oauth-protected-resource` | Protected Resource Metadata |

These endpoints describe the MCP endpoint, available scopes, and point to the Arcana Pulse sign-in page for interactive login.

---

## Authentication Architecture

Arcana Pulse uses **Personal Access Tokens (PATs)** for MCP authentication, not the full OAuth PKCE flow. This is intentional for simplicity at MVP stage:

- Users generate PATs from the `/resources` page
- PATs are prefixed with `ap_` and are bcrypt-hashed before storage in Appwrite
- Raw tokens are displayed once and never stored in plaintext
- Each MCP request must include `Authorization: Bearer ap_<token>`
- Tokens can be revoked individually from the UI

---

## Known Limitations

- **No OAuth PKCE flow**: MCP clients that require interactive OAuth (e.g., Claude Desktop OAuth mode) will not auto-complete the login dance. Use the bearer token approach instead.
- **In-memory token validation**: Token validation performs a bcrypt scan over all tokens. For users with many tokens this is still fast (< 100ms for typical use), but a prefix-based lookup could be added for scale.
- **No token expiry by default**: PATs do not expire unless an `expiresAt` field is set. Revoke tokens manually when they are no longer needed.
- **Appwrite required**: The MCP server returns a 503 if Appwrite is not configured.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `401 Unauthorized` from MCP | Check that the `Authorization: Bearer` header is set and the token starts with `ap_` |
| Token not working | Tokens are shown only once — generate a new one if lost |
| Resources not appearing in UI | Ensure the web app and MCP server share the same Appwrite instance and `userId` |
| `503 Appwrite not configured` | Set all required Appwrite environment variables |
| Cursor doesn't see tools | Check network access to the MCP endpoint; confirm the `url` in Cursor settings is reachable |

---

## Future Roadmap

- **v1.1**: Tags UI, `search_resources` MCP tool, project filters
- **v1.2**: AI-generated summaries for saved resources
- **v1.3**: Link resources to Beads tasks and project keys
- **v1.4**: Vector search / RAG retrieval for semantic queries
- **v1.5**: Browser extension or share sheet for quick capture
- **v2.0**: Full OAuth PKCE flow for MCP clients that require interactive auth
