// ─── Environment variable validation ─────────────────────────────────
// Validates required env vars at import time. Services import this module
// to fail fast if configuration is missing.

interface EnvConfig {
  // Plaid
  PLAID_CLIENT_ID: string | undefined;
  PLAID_SECRET: string | undefined;
  PLAID_ENV: string;

  // Dwolla
  DWOLLA_KEY: string | undefined;
  DWOLLA_SECRET: string | undefined;
  DWOLLA_ENV: string;

  // Dwolla webhook
  DWOLLA_WEBHOOK_SECRET: string | undefined;

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: string | undefined;
}

export const env: EnvConfig = {
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
  PLAID_SECRET: process.env.PLAID_SECRET,
  PLAID_ENV: process.env.PLAID_ENV || "sandbox",

  DWOLLA_KEY: process.env.DWOLLA_KEY,
  DWOLLA_SECRET: process.env.DWOLLA_SECRET,
  DWOLLA_ENV: process.env.DWOLLA_ENV || "sandbox",

  DWOLLA_WEBHOOK_SECRET: process.env.DWOLLA_WEBHOOK_SECRET,

  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

/**
 * Require a set of env vars at call time. Throws with a clear message
 * listing all missing variables so operators can fix them in one pass.
 */
export function requireEnv(...keys: (keyof EnvConfig)[]): void {
  const missing = keys.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Add them to .env.local or your deployment's environment settings.`
    );
  }
}
