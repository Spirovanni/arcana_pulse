# Product Requirements Document: Arcana_Pulse MCP Resource Vault

**Project Name:** Arcana_Pulse MCP Resource Vault  
**Target Repo:** `Arcana_Pulse`  
**Document Type:** PRD / Build Specification  
**Prepared For:** Xavier “Max” Martinez  
**Prepared Date:** June 13, 2026  
**Status:** Draft v1.0  
**Source Inspiration:** YouTube tutorial transcript for a full-stack Next.js bookmark manager with Clerk-authenticated MCP server access.

---

## 1. Executive Summary

Arcana_Pulse will add an authenticated **Resource Vault** that lets a signed-in user save, view, and manage important URLs, research links, documentation references, notes, and project resources inside the Arcana_Pulse web app. The same saved resources will also be exposed through an authenticated **Model Context Protocol (MCP) server**, allowing AI tools such as Cursor, Claude Desktop, and other MCP-compatible clients to retrieve and create resources on behalf of the authenticated user.

The YouTube project demonstrates a small bookmark manager built with Next.js, Clerk authentication, a database layer, browser-based bookmark management, and an MCP server with tools such as `get_user_bookmarks` and `create_bookmark`. This PRD adapts that pattern into the Arcana_Pulse ecosystem as a production-ready feature rather than a standalone demo.

The MVP should focus on three core outcomes:

1. A signed-in Arcana_Pulse user can save a resource with `url`, `title`, `notes`, and optional metadata.
2. The user can view and manage their own saved resources in the Arcana_Pulse web UI.
3. The user can connect an MCP-compatible AI client and securely retrieve or create resources through authenticated MCP tools.

This feature turns Arcana_Pulse into a personal/project knowledge bridge. In plain English: the website gets the filing cabinet, and the AI tools get the keys — but only after checking ID at the door.

---

## 2. Product Vision

Arcana_Pulse is intended to become a high-trust digital workspace connected to creative, financial, and AI-assisted project workflows. The Resource Vault becomes a foundational layer for that vision by storing reference material that can be reused across the website, coding workflows, research sessions, planning documents, and AI agents.

The long-term vision is not just “bookmarks.” The goal is a user-owned knowledge surface where Arcana_Pulse can store:

- Project research links
- Technical documentation
- Grant and funding sources
- Arcana Credit Union / Arcana Pulse resources
- Writing and worldbuilding references
- AI tool outputs worth preserving
- Codebase documentation links
- Future “agent memory” entries
- Curated sources tied to projects, chapters, campaigns, products, or workflows

The MVP should keep the data model simple but extensible enough to support later upgrades such as tagging, full-text search, AI summaries, vector search, project association, and cross-agent context retrieval.

---

## 3. Source Project Summary

The YouTube tutorial project builds a basic full-stack bookmark manager. The app uses:

- **Next.js** as the full-stack application framework.
- **Clerk** for user authentication.
- A database layer for user-owned bookmarks.
- A web UI where a signed-in user can add, view, and delete bookmarks.
- API routes for bookmark CRUD operations.
- An MCP server that exposes tools to AI clients.
- An authenticated OAuth-style flow so MCP clients must log in before accessing user data.
- MCP tools that allow an AI client to get the authenticated user’s bookmarks and create a new bookmark.

The tutorial also emphasizes that each user only receives access to their own data, and that the MCP server is authorized with the same user credentials as the web application.

---

## 4. Problem Statement

Arcana_Pulse needs a secure way to connect user-owned web app data to AI tools without exposing private data publicly or forcing manual copy/paste between the website and coding/AI environments.

Current pain points this feature solves:

- Important links and references are scattered across chats, browser tabs, notes, documents, and AI tools.
- AI tools cannot reliably access the user’s curated Arcana_Pulse resources.
- A user may want Cursor or another MCP client to save or retrieve project links while actively coding.
- Existing AI workflows often lack proper authentication boundaries.
- The website needs a practical first MCP integration that proves Arcana_Pulse can safely expose useful tools to AI clients.

---

## 5. Goals

### 5.1 MVP Goals

- Add a Resource Vault page or section inside Arcana_Pulse.
- Allow authenticated users to create, view, and delete saved resources.
- Store resources in the existing Arcana_Pulse database.
- Protect all resource data by user ownership.
- Add authenticated MCP server support.
- Expose at least two MCP tools:
  - `get_user_resources`
  - `create_resource`
- Support OAuth-style MCP login through Clerk.
- Confirm the MCP server works in Cursor or another MCP-compatible host.
- Document local and production setup clearly.

### 5.2 Product Goals

- Give Arcana_Pulse a working bridge between web app data and AI agents.
- Establish the pattern for future MCP tools.
- Make the feature simple enough to ship quickly but structured enough to scale.
- Preserve clean separation between web UI, API routes, database utilities, and MCP tool definitions.
- Build the first authenticated “Arcana agent interface” that can later support deeper project workflows.

### 5.3 Developer Goals

- Keep implementation compatible with Next.js App Router.
- Use Clerk for both web app auth and MCP authorization.
- Use the existing Arcana_Pulse styling system and UI components where possible.
- Use the existing Arcana_Pulse database approach. If the repo already uses Neon + Drizzle, use that. If Prisma is already installed, Prisma is acceptable. Do not introduce a second ORM unless unavoidable.
- Keep the MCP tool layer reusable so future Arcana_Pulse tools can be added without rewriting auth.

---

## 6. Non-Goals

The MVP will not include:

- Public sharing of resources.
- Team/shared vault permissions.
- Browser extension capture.
- Automatic web scraping of saved URLs.
- AI-generated summaries of each resource.
- Vector embeddings or semantic search.
- Paid subscriptions or feature gating.
- Mobile-native app support.
- Complex folder hierarchies.
- Full OAuth provider customization beyond what Clerk requires.
- Multi-tenant organization support unless already present in Arcana_Pulse.

These items can be revisited after the MCP foundation is stable.

---

## 7. Target Users

### 7.1 Primary User: Arcana_Pulse Owner / Builder

As the Arcana_Pulse owner and builder, the user needs a trusted way to save technical documentation, planning resources, funding links, writing references, and code resources, then retrieve them through AI coding tools.

### 7.2 Secondary User: Future Arcana_Pulse Account User

A future user signs into Arcana_Pulse, saves resources, and connects an AI tool to their personal Resource Vault. They should only see their own data.

### 7.3 AI Client / MCP Host

An MCP host such as Cursor, Claude Desktop, or another AI application connects to Arcana_Pulse’s MCP endpoint. The MCP host must authenticate the user before calling tools.

---

## 8. User Stories

### 8.1 Web App User Stories

**US-001: Save a resource**  
As a signed-in user, I want to save a URL with a title and notes so I can preserve important project references.

**Acceptance Criteria**
- User can enter a valid URL.
- User can enter a title.
- User can optionally enter notes.
- System stores the resource under the authenticated user ID.
- Newly saved resource appears in the Resource Vault list.

---

**US-002: View my resources**  
As a signed-in user, I want to view my saved resources so I can quickly return to important references.

**Acceptance Criteria**
- User sees only their own resources.
- Most recent resources appear first.
- Empty state appears when no resources exist.
- Loading and error states are displayed clearly.

---

**US-003: Delete a resource**  
As a signed-in user, I want to delete a resource I no longer need so my vault stays clean.

**Acceptance Criteria**
- User can delete a resource from the UI.
- System confirms ownership before deletion.
- Deleted resource no longer appears in the list.
- User cannot delete another user’s resource.

---

**US-004: Sign-in required**  
As a visitor, I should be prompted to sign in before accessing the Resource Vault.

**Acceptance Criteria**
- Signed-out users cannot view resource data.
- Signed-out users see a sign-in prompt.
- API calls from signed-out users return `401 Unauthorized`.

---

### 8.2 MCP User Stories

**US-005: Connect AI client to Arcana_Pulse MCP server**  
As a signed-in user, I want to connect Cursor or another MCP host to Arcana_Pulse so my AI tools can access approved Resource Vault functions.

**Acceptance Criteria**
- MCP client can connect to `/mcp` or the configured MCP endpoint.
- MCP client receives auth metadata from the required well-known endpoints.
- MCP client prompts the user to sign in through Clerk.
- MCP client receives access after login and consent.

---

**US-006: Retrieve resources through AI tool**  
As a user in Cursor, I want to ask “What resources do I have saved?” and receive my Arcana_Pulse resources.

**Acceptance Criteria**
- MCP tool `get_user_resources` returns authenticated user resources.
- Data belongs only to the logged-in user.
- Tool response is formatted clearly as JSON or readable text.
- Unauthorized requests are rejected.

---

**US-007: Create resource through AI tool**  
As a user in Cursor, I want to ask the AI to save a useful documentation URL to Arcana_Pulse.

**Acceptance Criteria**
- MCP tool `create_resource` accepts `url`, `title`, and optional `notes`.
- Tool validates required fields.
- Tool stores resource under authenticated user ID.
- Newly created resource appears in the Arcana_Pulse web UI after refresh.

---

## 9. Feature Scope

### 9.1 Resource Vault Web UI

The Resource Vault should be available in Arcana_Pulse as either:

- `/resources`
- `/vault`
- `/pulse/resources`
- or an existing dashboard section

Recommended MVP route: `/resources`.

The UI should include:

- Header/title: “Resource Vault”
- Short description
- Add Resource button
- Add Resource form
- Resource list/card layout
- Empty state
- Loading state
- Error state
- Delete action
- External link action

Suggested copy:

> Save important project links, documentation, research, and AI-ready references. Connect your vault to Cursor or another MCP client when you want your AI tools to work with your saved resources.

### 9.2 Resource Form Fields

MVP required fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `url` | string | Yes | Must be a valid URL. |
| `title` | string | Yes | Human-readable title. |
| `notes` | string | No | User-provided context. |

Recommended optional fields for Arcana_Pulse extensibility:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `tags` | string[] | No | Can be added after MVP or stored as JSON/text array. |
| `resourceType` | enum | No | `documentation`, `grant`, `writing`, `finance`, `code`, `reference`, `other`. |
| `projectKey` | string | No | Allows future tie-in to Arcana projects or Beads issues. |
| `source` | enum | No | `web`, `mcp`, `manual`, `import`. |

### 9.3 Resource List

Each resource card should show:

- Title
- URL/domain
- Notes preview
- Created date
- Tags if present
- Open link button
- Delete button

Recommended list behavior:

- Sort newest first.
- Keep cards readable and compact.
- Show clear empty state: “No resources saved yet.”
- Avoid over-engineering filters in MVP.

### 9.4 MCP Tools

#### Tool 1: `get_user_resources`

**Purpose:** Return saved resources for the authenticated user.

**Input Parameters**
- Optional `limit`: number
- Optional `query`: string
- Optional `tag`: string
- Optional `projectKey`: string

For strict MVP, only no-argument retrieval is required. The optional fields can be added quickly if the database supports them.

**Output**
- JSON string or structured content containing user resources.

**MVP Acceptance**
- Returns only authenticated user’s resources.
- Returns newest first.
- Does not expose internal user IDs unless needed for tool operations.

---

#### Tool 2: `create_resource`

**Purpose:** Create a new saved resource for the authenticated user.

**Input Parameters**

| Parameter | Type | Required | Description |
|---|---:|---:|---|
| `url` | string | Yes | URL to save. |
| `title` | string | Yes | Resource title. |
| `notes` | string | No | Optional context. |
| `tags` | string[] | No | Optional tags if supported. |
| `projectKey` | string | No | Optional project association. |

**Output**
- Confirmation message.
- Created resource object or resource summary.

**MVP Acceptance**
- Validates URL and title.
- Creates record with authenticated user ID.
- Returns success message.
- Handles validation errors gracefully.

---

#### Stretch Tool 3: `delete_resource`

**Purpose:** Delete one authenticated user-owned resource by ID.

**Input Parameters**
- `resourceId`: string

**MVP Status**
- Not required for first MCP release.
- Web UI delete is required.
- Add after get/create are stable.

---

#### Stretch Tool 4: `search_resources`

**Purpose:** Search user resources by title, notes, URL, tags, or project association.

**MVP Status**
- Not required.
- Recommended for v1.1.

---

## 10. Technical Architecture

### 10.1 Recommended Stack

Use existing Arcana_Pulse stack where possible:

- **Framework:** Next.js 15+ App Router
- **Language:** TypeScript
- **Auth:** Clerk
- **Database:** Existing Arcana_Pulse database, preferably Neon PostgreSQL if already configured
- **ORM:** Existing ORM, preferably Drizzle if the repo already uses it; Prisma is acceptable if already installed
- **MCP Packages:** Clerk MCP tools and Vercel MCP adapter pattern from the tutorial
- **Validation:** Zod
- **Hosting:** Vercel or current Arcana_Pulse deployment host

### 10.2 Transcript-to-Arcana Mapping

| YouTube Demo Concept | Arcana_Pulse Implementation |
|---|---|
| Bookmark Manager | Resource Vault |
| Bookmark | Resource |
| `url`, `title`, `notes` | Same fields, with optional tags/project metadata |
| Clerk app auth | Arcana_Pulse Clerk auth |
| SQLite local dev | Existing production DB; Neon Postgres preferred |
| Prisma model | Drizzle/Prisma schema equivalent |
| `/api/bookmarks` | `/api/resources` |
| `/api/bookmarks/[id]` | `/api/resources/[id]` |
| `get_user_bookmarks` MCP tool | `get_user_resources` |
| `create_bookmark` MCP tool | `create_resource` |
| Cursor test | Cursor + future Claude Desktop test |
| Standalone tutorial app | Integrated Arcana_Pulse feature |

### 10.3 High-Level System Flow

1. User signs into Arcana_Pulse through Clerk.
2. User opens Resource Vault.
3. User creates a resource through the web UI.
4. Resource is stored with the user’s Clerk `userId`.
5. User configures an MCP host to connect to Arcana_Pulse’s MCP endpoint.
6. MCP host requests access and is redirected through Clerk auth.
7. Authenticated MCP calls are routed to the MCP server handler.
8. MCP tools use the authenticated user ID to access only that user’s resources.
9. AI client can read or create resources using allowed tools.

---

## 11. Authentication and Authorization Requirements

### 11.1 Web Authentication

- Use Clerk middleware to protect Resource Vault pages and API routes.
- API routes must call Clerk auth server utilities to retrieve the authenticated user ID.
- If `userId` is absent, return `401 Unauthorized`.

### 11.2 MCP Authentication

The MCP server must use Clerk-backed OAuth-style authentication.

Required behavior:

- Unauthenticated MCP request should return an auth challenge.
- MCP client should discover auth instructions through well-known metadata endpoints.
- User should complete Clerk login/allow flow in browser.
- MCP client should receive access token.
- All subsequent MCP requests must include valid token.
- Server must verify token before calling tools.
- Tool code must use the authenticated user identity from the MCP auth context.

### 11.3 Required Well-Known Routes

Add both current and backward-compatible metadata routes as demonstrated in the tutorial pattern:

```txt
/.well-known/oauth-authorization-server
/.well-known/oauth-protected-resource
```

Each route should be implemented according to the Clerk MCP tools package guidance.

### 11.4 Clerk Dashboard Requirement

Enable OAuth application support needed for MCP client registration.

Required Clerk setup:

- Create or use Arcana_Pulse Clerk app.
- Confirm allowed redirect settings.
- Enable dynamic client registration if required by the MCP client flow.
- Store Clerk environment variables securely.
- Never commit Clerk secrets.

---

## 12. Data Model

### 12.1 MVP Entity: Resource

Recommended table name:

```txt
arcana_resources
```

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | string / uuid / cuid | Yes | Primary key. |
| `userId` | string | Yes | Clerk user ID. |
| `url` | text | Yes | Resource URL. |
| `title` | text | Yes | Resource title. |
| `notes` | text | No | Optional user notes. |
| `tags` | text[] / json | No | Optional for MVP, useful for future. |
| `resourceType` | text / enum | No | Optional category. |
| `projectKey` | text | No | Optional Arcana project association. |
| `source` | text / enum | No | `manual`, `mcp`, etc. |
| `createdAt` | timestamp | Yes | Default now. |
| `updatedAt` | timestamp | Yes | Auto-update on change. |

### 12.2 Minimum Schema

If keeping MVP very close to the tutorial, use only:

```txt
id
userId
url
title
notes
createdAt
updatedAt
```

### 12.3 Ownership Rule

Every query must include:

```txt
where userId == authenticatedUserId
```

No resource operation may rely only on resource ID. This prevents cross-user access.

---

## 13. API Requirements

### 13.1 `GET /api/resources`

Returns resources for the authenticated user.

**Auth:** Required  
**Success Response:** `200` with resource array  
**Failure Responses:**
- `401` if not authenticated
- `500` if database read fails

### 13.2 `POST /api/resources`

Creates a resource for the authenticated user.

**Auth:** Required  
**Required Body:**

```json
{
  "url": "https://example.com",
  "title": "Example Resource",
  "notes": "Optional notes"
}
```

**Success Response:** `201` with created resource  
**Failure Responses:**
- `400` if URL/title missing or invalid
- `401` if not authenticated
- `500` if database create fails

### 13.3 `DELETE /api/resources/[id]`

Deletes a resource for the authenticated user.

**Auth:** Required  
**Success Response:** `200` with confirmation  
**Failure Responses:**
- `401` if not authenticated
- `404` if resource not found or does not belong to user
- `500` if database delete fails

### 13.4 Future `PATCH /api/resources/[id]`

Updates resource fields.

**MVP Status:** Optional  
**Recommended v1.1:** Add edit resource support.

---

## 14. MCP Server Requirements

### 14.1 MCP Route

Recommended endpoint:

```txt
/mcp
```

Possible Next.js implementation pattern:

```txt
src/app/[transport]/route.ts
```

The dynamic transport route should allow `/mcp` to resolve to the MCP handler, matching the tutorial configuration.

### 14.2 MCP Handler Responsibilities

- Define Arcana_Pulse MCP tools.
- Verify Clerk token.
- Pass authenticated user identity to tool handlers.
- Reject unauthenticated access.
- Return tool results as MCP-compatible content.
- Handle errors without leaking secrets.

### 14.3 MCP Tool Naming Rules

Tool names should be clear, action-oriented, and easy for an LLM to understand.

Recommended MVP names:

```txt
get_user_resources
create_resource
```

Avoid vague names such as:

```txt
get_data
make_thing
resource_tool
```

### 14.4 MCP Tool Descriptions

Each tool must include a strong description because the LLM uses this to decide when to call the tool.

Example:

```txt
get_user_resources:
Get saved Arcana_Pulse resources for the authenticated user. Use this when the user asks what links, references, documents, or project resources they have saved.
```

```txt
create_resource:
Create a new saved Arcana_Pulse resource for the authenticated user. Use this when the user asks to save, bookmark, store, or remember a URL or web reference.
```

### 14.5 MCP Validation

Use Zod schemas for all tool inputs.

Example requirements:

- `url` must be a non-empty string and should validate as a URL.
- `title` must be a non-empty string.
- `notes` may be optional.
- `tags` must be optional array of strings if implemented.

---

## 15. Suggested File Structure

Adjust to match the existing Arcana_Pulse repo structure.

```txt
src/
  app/
    resources/
      page.tsx
    api/
      resources/
        route.ts
        [id]/
          route.ts
    [transport]/
      route.ts
    .well-known/
      oauth-authorization-server/
        route.ts
      oauth-protected-resource/
        route.ts
  components/
    resources/
      ResourceForm.tsx
      ResourceList.tsx
      ResourceCard.tsx
      ResourceEmptyState.tsx
  hooks/
    useResources.ts
  lib/
    resources/
      resource-utils.ts
      resource-validation.ts
    mcp/
      resource-tools.ts
  types/
    resource.ts
db/
  schema/
    resources.ts
```

If the repo already uses a different component or app convention, follow the repo’s existing pattern instead of forcing this exact structure.

---

## 16. UX Requirements

### 16.1 Visual Tone

The feature should feel like part of Arcana_Pulse, not like a tutorial copy/paste. Use existing colors, typography, cards, buttons, and layout conventions.

Suggested page title:

```txt
Resource Vault
```

Suggested subtitle:

```txt
Save research, documentation, references, and AI-ready links for your Arcana_Pulse workflows.
```

### 16.2 Empty State

When no resources exist:

```txt
Your Resource Vault is empty.
Save your first project link, research source, or documentation reference.
```

Button:

```txt
Add Resource
```

### 16.3 Error State

Example:

```txt
We could not load your resources. Try again.
```

Button:

```txt
Retry
```

### 16.4 Loading State

Use a simple spinner or skeleton card layout.

### 16.5 Form Behavior

- Validate URL and title before submit.
- Disable submit while saving.
- Clear form after successful save.
- Show user-friendly error if save fails.
- Keep notes field optional.
- Avoid forcing tags or categories in MVP.

---

## 17. Security Requirements

### 17.1 User Data Isolation

Every database read, create, update, and delete operation must be scoped by authenticated `userId`.

### 17.2 Secret Handling

Do not commit:

- Clerk secret keys
- Database URLs
- MCP OAuth secrets
- Production environment values

Use `.env.local` for local development and deployment provider environment variables for production.

### 17.3 API Protection

- Validate all request bodies.
- Return `401` for unauthenticated users.
- Return `404` or access denied for records not owned by the user.
- Avoid returning stack traces to the client.
- Log server errors safely.

### 17.4 MCP Protection

- MCP tools must never execute without verified auth.
- MCP tool output must not include secrets or raw auth tokens.
- MCP tool output should not include internal fields unless useful.
- Rate limit MCP endpoints if abuse becomes possible.

### 17.5 URL Safety

MVP should validate the URL format. Future versions may add:

- Blocklist/allowlist rules
- Malware scanning
- Safe browsing checks
- Content fetch restrictions

---

## 18. Performance Requirements

MVP performance targets:

- Resource Vault initial load: under 1.5 seconds for fewer than 100 resources on normal broadband.
- Create resource: under 750 ms excluding network variance.
- MCP `get_user_resources`: under 1 second for default limit.
- MCP `create_resource`: under 1 second for normal DB write.

Recommended safeguards:

- Add default query limit, such as 50 resources.
- Add pagination after 100+ resources.
- Index by `userId` and `createdAt`.
- Consider full-text search indexes in v1.1.

---

## 19. Analytics and Success Metrics

Track the following events if Arcana_Pulse has analytics:

| Event | Description |
|---|---|
| `resource_created_web` | User created resource in UI. |
| `resource_deleted_web` | User deleted resource in UI. |
| `resource_created_mcp` | Resource created through MCP tool. |
| `resources_retrieved_mcp` | MCP client requested resources. |
| `mcp_auth_success` | MCP connection completed auth. |
| `mcp_auth_failure` | MCP auth failed. |

Success metrics for MVP:

- User can create and retrieve at least 5 resources through the UI.
- Cursor can connect to the MCP endpoint and display available tools.
- MCP client can retrieve resources from the authenticated user.
- MCP client can create a resource that appears in the UI.
- No cross-user data exposure in testing.

---

## 20. Implementation Plan

### Phase 0: Prep and Branch

Tasks:

- Create feature branch: `feature/mcp-resource-vault`.
- Confirm Arcana_Pulse auth provider.
- Confirm database/ORM currently used.
- Confirm existing UI component conventions.
- Add required packages only if not already installed.

Potential packages:

```bash
npm install @clerk/mcp-tools @vercel/mcp-adapter zod
```

If Prisma is needed and not currently present:

```bash
npm install @prisma/client
npm install -D prisma
```

If Drizzle is already used, do not add Prisma just for this feature.

---

### Phase 1: Data Layer

Tasks:

- Add `resources` table/schema.
- Add migration.
- Add utility functions:
  - `getUserResources(userId)`
  - `createUserResource(userId, data)`
  - `deleteUserResource(userId, resourceId)`
- Add validation schema.

Acceptance:

- Local database migration runs successfully.
- Utility functions are covered by basic tests or manual script.
- Ownership checks are enforced.

---

### Phase 2: API Routes

Tasks:

- Build `GET /api/resources`.
- Build `POST /api/resources`.
- Build `DELETE /api/resources/[id]`.
- Add request body validation.
- Add auth checks.
- Add error handling.

Acceptance:

- Signed-out user receives `401`.
- Signed-in user can create/list/delete own resources.
- User cannot delete resource owned by another user.

---

### Phase 3: Web UI

Tasks:

- Create Resource Vault page.
- Create form component.
- Create resource list/card components.
- Create `useResources` hook or server action equivalent.
- Add loading, error, and empty states.
- Add navigation link to Resource Vault if appropriate.

Acceptance:

- User can add resource through UI.
- User sees new resource immediately.
- User can delete resource.
- UI matches Arcana_Pulse design direction.

---

### Phase 4: MCP Server

Tasks:

- Add MCP route.
- Add Clerk MCP auth handler.
- Add `get_user_resources` tool.
- Add `create_resource` tool.
- Add Zod tool input schemas.
- Add safe error responses.
- Add well-known OAuth metadata routes:
  - `/.well-known/oauth-authorization-server`
  - `/.well-known/oauth-protected-resource`

Acceptance:

- MCP host sees `get_user_resources` and `create_resource`.
- Unauthenticated MCP client is prompted to log in.
- Authenticated MCP client can retrieve resources.
- Authenticated MCP client can create resources.
- Tool operations are scoped to authenticated user.

---

### Phase 5: Local MCP Client Testing

Tasks:

- Run Arcana_Pulse locally.
- Configure Cursor MCP server entry.
- Use local endpoint, likely:

```txt
http://localhost:3000/mcp
```

- Trigger login flow.
- Ask Cursor:
  - “What Arcana_Pulse resources do I have saved?”
  - “Save the React docs as a resource in Arcana_Pulse.”
- Confirm UI updates.

Acceptance:

- Cursor loads tools after login.
- Cursor can call both MVP tools.
- Newly created resource appears in web UI.

---

### Phase 6: Production Deployment

Tasks:

- Add environment variables in deployment platform.
- Confirm Clerk production settings.
- Confirm production MCP endpoint.
- Confirm dynamic client registration / OAuth application settings.
- Run production smoke test.

Acceptance:

- Production Resource Vault works.
- Production MCP endpoint works.
- Production auth flow works.
- No secrets exposed in browser/client bundle.

---

## 21. Testing Plan

### 21.1 Manual Web Tests

| Test | Expected Result |
|---|---|
| Visit `/resources` while signed out | Sign-in prompt or redirect. |
| Sign in and visit `/resources` | Resource Vault loads. |
| Create valid resource | Resource appears in list. |
| Create resource without URL | Validation error. |
| Create resource without title | Validation error. |
| Delete own resource | Resource disappears. |
| Try API without auth | `401 Unauthorized`. |

### 21.2 Manual MCP Tests

| Test | Expected Result |
|---|---|
| Add MCP server in Cursor | Cursor detects login required. |
| Complete Clerk login | Cursor loads MCP tools. |
| Ask for saved resources | MCP calls `get_user_resources`. |
| Ask to save a URL | MCP calls `create_resource`. |
| Refresh web UI | MCP-created resource appears. |
| Sign in as different user | Different resource set appears. |

### 21.3 Security Tests

| Test | Expected Result |
|---|---|
| Use resource ID from another user | Access denied or not found. |
| Call MCP without token | Auth challenge / denial. |
| Send malformed tool input | Validation error. |
| Send invalid URL | Validation error. |
| Inspect client bundle | No secret keys exposed. |

### 21.4 Automated Tests

Recommended:

- Unit tests for validation schemas.
- Unit tests for resource utility functions.
- Integration tests for API auth behavior.
- MCP tool tests with mocked auth context.
- Playwright tests for Resource Vault UI.

---

## 22. Acceptance Criteria Summary

The MVP is complete when:

- [ ] Arcana_Pulse has a Resource Vault UI.
- [ ] Signed-in users can create resources.
- [ ] Signed-in users can view resources.
- [ ] Signed-in users can delete resources.
- [ ] Signed-out users cannot access resource data.
- [ ] Resource records are scoped by Clerk user ID.
- [ ] MCP server route is available.
- [ ] OAuth metadata routes are available.
- [ ] Cursor or another MCP client can authenticate.
- [ ] MCP client can call `get_user_resources`.
- [ ] MCP client can call `create_resource`.
- [ ] MCP-created resources appear in the web UI.
- [ ] Documentation explains local setup and production environment requirements.

---

## 23. Risks and Mitigations

### Risk: Adding a second ORM creates project complexity

**Mitigation:** Use the ORM already present in Arcana_Pulse. The tutorial uses Prisma, but Arcana_Pulse should not add Prisma if Drizzle is already established.

### Risk: MCP authentication is brittle across clients

**Mitigation:** Implement both required well-known metadata routes and test with at least Cursor first. Add Claude Desktop testing after local success.

### Risk: Tool descriptions are too vague for LLMs

**Mitigation:** Write explicit tool names, descriptions, and Zod parameter descriptions.

### Risk: Cross-user data exposure

**Mitigation:** Enforce `userId` filtering in every database operation and test with two users.

### Risk: Production Clerk configuration differs from local setup

**Mitigation:** Document Clerk dashboard settings and run production smoke tests before considering done.

### Risk: Resource Vault becomes cluttered quickly

**Mitigation:** Keep MVP simple but add future tags/search to roadmap.

---

## 24. Future Roadmap

### v1.1: Search and Tags

- Add tag support in UI.
- Add `search_resources` MCP tool.
- Add search box.
- Add project filters.

### v1.2: AI Summaries

- Fetch page title/metadata.
- Generate AI summaries.
- Save summary as resource metadata.
- Add “why this matters” notes.

### v1.3: Project/Beads Integration

- Link resources to `.beads` tasks or project IDs.
- Add resource references to PRDs and task plans.
- Allow AI to pull resources for the active Arcana_Pulse project.

### v1.4: Knowledge Graph

- Connect resources to people, projects, chapters, grants, and concepts.
- Visualize relationships.
- Add AI-assisted clustering.

### v1.5: Vector Search / RAG

- Store embeddings for resource notes and summaries.
- Let AI clients ask semantic questions over saved resources.
- Add permission-aware retrieval.

### v1.6: Import and Capture

- Import browser bookmarks.
- Import markdown lists.
- Add browser extension or share sheet.
- Add bulk upload.

---

## 25. Open Questions

1. Does the current Arcana_Pulse repo already use Clerk?
2. Does the current Arcana_Pulse repo use Drizzle, Prisma, or another database layer?
3. Should the route be `/resources`, `/vault`, or placed inside an existing dashboard?
4. Should resources eventually attach to Arcana Credit Union, Arcana Pulse, Co-Author Studio, or all project types?
5. Should the first MCP production test target Cursor only, or Cursor and Claude Desktop?
6. Should `delete_resource` be added to MCP in MVP or kept UI-only for safety?
7. Should tags be included in the initial schema even if the UI does not use them yet?

Recommended default decisions:

- Use `/resources`.
- Use existing DB/ORM.
- Include tags in schema if low effort.
- Keep MCP delete out of MVP.
- Test Cursor first.

---

## 26. Developer Build Prompt

Use this prompt in Cursor, Claude Code, or Antigravity when starting implementation:

```txt
You are working in the Arcana_Pulse repo. Build the MVP described in PRD_Arcana_Pulse_MCP_Resource_Vault.md.

Goal:
Add an authenticated Resource Vault to Arcana_Pulse and expose it through an authenticated MCP server.

Requirements:
1. Use the existing Arcana_Pulse auth, database, ORM, styling, and app conventions.
2. Add a Resource model/table with id, userId, url, title, notes, createdAt, updatedAt, and optional tags/project metadata if easy.
3. Add API routes for GET /api/resources, POST /api/resources, and DELETE /api/resources/[id].
4. Add a /resources page with form, list, delete action, empty state, loading state, and error state.
5. Add an authenticated MCP route that exposes get_user_resources and create_resource.
6. Add Clerk-compatible MCP auth and well-known OAuth metadata routes.
7. Ensure all operations are scoped to the authenticated user.
8. Do not introduce a second ORM if the repo already uses one.
9. Add basic validation with Zod.
10. Provide local testing instructions for Cursor using http://localhost:3000/mcp.

Definition of Done:
A signed-in user can create and view resources in the web app. Cursor can authenticate to the MCP endpoint, retrieve the user’s resources, and create a new resource that appears in the Arcana_Pulse UI.
```

---

## 27. Beads-Ready Task Breakdown

If using Beads or another project tracker, create these tasks:

### EPIC: MCP Resource Vault

**Task 1: Confirm Arcana_Pulse stack**
- Check auth provider.
- Check ORM/database.
- Check UI conventions.
- Output implementation notes.

**Task 2: Add Resource schema**
- Add migration.
- Add indexes.
- Add resource type definitions.

**Task 3: Build resource data utilities**
- `getUserResources`
- `createUserResource`
- `deleteUserResource`
- Validation helpers.

**Task 4: Build API routes**
- `GET /api/resources`
- `POST /api/resources`
- `DELETE /api/resources/[id]`

**Task 5: Build Resource Vault UI**
- Page route.
- Form.
- List/cards.
- Empty/loading/error states.

**Task 6: Add MCP server route**
- MCP handler.
- Auth wrapper.
- Tool definitions.

**Task 7: Add OAuth metadata routes**
- Authorization server route.
- Protected resource route.

**Task 8: Test in Cursor**
- Add local MCP server config.
- Complete login.
- Verify get/create tools.

**Task 9: Security pass**
- Two-user ownership test.
- Secret scanning.
- Unauthorized API test.
- Unauthorized MCP test.

**Task 10: Production deployment docs**
- Env vars.
- Clerk settings.
- MCP endpoint setup.
- Smoke test checklist.

---

## 28. Documentation Requirements

Add a short documentation file after implementation:

```txt
docs/mcp-resource-vault.md
```

Include:

- Feature overview
- Local setup
- Required env vars
- Clerk dashboard settings
- Database migration instructions
- Cursor MCP config example
- Known limitations
- Troubleshooting

Suggested Cursor MCP config pattern:

```json
{
  "mcpServers": {
    "arcana-pulse": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Production version should replace localhost with the deployed Arcana_Pulse domain.

---

## 29. Final Recommendation

Build this as **Arcana_Pulse Resource Vault + MCP Bridge**, not simply as a generic bookmark manager. The tutorial project is valuable because it proves the pattern: authenticated web app data can safely become MCP-accessible AI tooling. Arcana_Pulse should use that pattern as the first step toward a broader agent-connected knowledge system.

Ship the MVP small:

1. Save resources.
2. Show resources.
3. Delete resources in UI.
4. Retrieve resources through MCP.
5. Create resources through MCP.

Then expand toward search, tags, summaries, project linking, and AI memory.

The first win is not a fancy interface. The first win is trust: the AI can access the right user’s resources, and only the right user’s resources.
