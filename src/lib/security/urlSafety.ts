/**
 * URL safety utilities — OWASP A10 (SSRF) mitigation.
 *
 * User-supplied URLs are stored in the Resource Vault. While Arcana Pulse
 * never server-side fetches these URLs (preventing full SSRF), we still
 * validate them to:
 * 1. Prevent metadata abuse (internal RFC 1918 / loopback URLs stored as "safe" resources)
 * 2. Block data: URIs and other non-http(s) schemes that could cause XSS when rendered
 * 3. Enforce scheme allowlist (http + https only)
 */

// Schemes that are safe to store and render as links
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

// RFC 1918 private ranges + loopback (SSRF targets)
const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,      // 127.0.0.0/8
  /^10\.\d+\.\d+\.\d+$/,        // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16.0.0/12
  /^192\.168\.\d+\.\d+$/,        // 192.168.0.0/16
  /^::1$/,                       // IPv6 loopback
  /^fd[0-9a-f]{2}:/i,            // IPv6 ULA
  /^169\.254\.\d+\.\d+$/,        // link-local
  /^0\.0\.0\.0$/,
];

// Common internal service hostnames
const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "169.254.169.254",             // AWS/GCP/Azure IMDS
  "instance-data",
]);

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates a user-supplied URL for safety.
 *
 * Returns `{ valid: true }` if the URL is safe to store.
 * Returns `{ valid: false, reason }` if it should be rejected.
 */
export function validateResourceUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, reason: "URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  // Scheme allowlist
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return {
      valid: false,
      reason: `URL scheme "${parsed.protocol}" is not allowed. Use http:// or https://`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Blocked hostnames (IMDS and known internal endpoints)
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: "This hostname is not permitted" };
  }

  // Private IP ranges (SSRF prevention)
  for (const pattern of PRIVATE_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        reason: "URLs pointing to private networks or localhost are not permitted",
      };
    }
  }

  // Enforce TLD presence (prevents bare hostnames like http://intranet)
  if (!hostname.includes(".") && hostname !== "localhost") {
    return { valid: false, reason: "URL must include a valid domain" };
  }

  return { valid: true };
}
