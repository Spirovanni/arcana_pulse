/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728 / draft-ietf-oauth-resource-metadata)
 * Required by MCP clients to discover the protected resource configuration.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const metadata = {
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: [],
    scopes_supported: ["resources:read", "resources:write"],
    resource_documentation: `${baseUrl}/resources`,
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
