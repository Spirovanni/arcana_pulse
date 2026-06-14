/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 * Required by MCP clients to discover auth endpoints.
 *
 * Arcana Pulse uses NextAuth for web auth and Personal Access Tokens (PATs)
 * for MCP tool access. This metadata document describes the token endpoint
 * for PAT generation and points to the sign-in page for interactive login.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/sign-in`,
    token_endpoint: `${baseUrl}/api/mcp-tokens`,
    token_endpoint_auth_methods_supported: ["none"],
    grant_types_supported: ["urn:arcana:mcp:pat"],
    response_types_supported: ["token"],
    scopes_supported: ["resources:read", "resources:write"],
    service_documentation: `${baseUrl}/resources`,
    ui_locales_supported: ["en"],
    op_policy_uri: `${baseUrl}/privacy`,
    op_tos_uri: `${baseUrl}/terms`,
  };

  return NextResponse.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
