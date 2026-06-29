import { withSentryConfig } from "@sentry/nextjs";

// ---------------------------------------------------------------------------
// Security Headers
// Applied to all routes via Next.js headers() config.
// ---------------------------------------------------------------------------

/** @param {string} key @param {string} value @returns {{ key: string; value: string }} */
function h(key, value) {
  return { key, value };
}

// Content Security Policy
// - default-src 'self': only allow same-origin by default
// - script-src: Next.js inline scripts need 'unsafe-inline' until nonce adoption
// - connect-src: allow Appwrite, Sentry, Plaid, Dwolla, and Stripe APIs
// - frame-src: Plaid Link iframe
// - img-src: Google avatars, Appwrite storage
const CSP = [
  "default-src 'self'",
  // Next.js inline scripts + Sentry + Vercel feedback toolbar
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://vercel.live",
  // Allow Google Fonts stylesheets
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Allow Google Fonts files + local data URIs
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://cloud.appwrite.io",
  // connect-src: fixed Sentry ingest (o*.ingest wildcard is invalid CSP syntax)
  "connect-src 'self' https://*.appwrite.io https://*.sentry.io https://o4511051723112448.ingest.us.sentry.io https://cdn.plaid.com https://sandbox.plaid.com https://production.plaid.com https://api-sandbox.dwolla.com https://api.dwolla.com https://api.stripe.com https://js.stripe.com https://accounts.google.com wss://realtime.ably.io https://vercel.live",
  "frame-src https://cdn.plaid.com https://js.stripe.com https://accounts.google.com",
  // Sentry session replay uses blob workers
  "worker-src blob: 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  // Prevent clickjacking
  h("X-Frame-Options", "DENY"),
  // Prevent MIME sniffing
  h("X-Content-Type-Options", "nosniff"),
  // Limit referrer information
  h("Referrer-Policy", "strict-origin-when-cross-origin"),
  // HSTS: 2 years, include subdomains, preload
  h("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"),
  // Disable browser features not needed by the app
  h(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=(self), usb=(), bluetooth=(), midi=()"
  ),
  // CSP
  h("Content-Security-Policy", CSP),
  // Disable DNS prefetch (reduces info leakage)
  h("X-DNS-Prefetch-Control", "off"),
  // Prevent IE/Edge from opening files directly
  h("X-Download-Options", "noopen"),
  // Cross-Origin policies for resource/opener isolation
  h("Cross-Origin-Opener-Policy", "same-origin"),
  h("Cross-Origin-Resource-Policy", "same-origin"),
  // Remove powered-by header (already handled by Next.js poweredByHeader: false)
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // Remove X-Powered-By: Next.js

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      {
        // MCP and well-known endpoints need permissive CORS for AI client access
        source: "/api/mcp",
        headers: [
          h("Access-Control-Allow-Origin", "*"),
          h("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"),
          h("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id"),
          h("Access-Control-Max-Age", "86400"),
        ],
      },
      {
        source: "/.well-known/:path*",
        headers: [
          h("Access-Control-Allow-Origin", "*"),
          h("Access-Control-Allow-Methods", "GET, OPTIONS"),
          h("Access-Control-Allow-Headers", "Content-Type"),
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps for better stack traces in Sentry
  widenClientFileUpload: true,

  // Hides source maps from client bundles
  hideSourceMaps: true,

  // Tree-shakes Sentry logger statements for smaller bundles
  disableLogger: true,
});
