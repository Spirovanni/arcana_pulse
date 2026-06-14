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

  // Anthropic AI
  ANTHROPIC_API_KEY: string | undefined;

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: string | undefined;

  // Alpaca Markets (paper/live trading)
  ALPACA_API_KEY: string | undefined;
  ALPACA_API_SECRET: string | undefined;
  ALPACA_ENV: "paper" | "live";
}

export const env: EnvConfig = {
  PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
  PLAID_SECRET: process.env.PLAID_SECRET,
  PLAID_ENV: process.env.PLAID_ENV || "sandbox",

  DWOLLA_KEY: process.env.DWOLLA_KEY,
  DWOLLA_SECRET: process.env.DWOLLA_SECRET,
  DWOLLA_ENV: process.env.DWOLLA_ENV || "sandbox",

  DWOLLA_WEBHOOK_SECRET: process.env.DWOLLA_WEBHOOK_SECRET,

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,

  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,

  ALPACA_API_KEY: process.env.ALPACA_API_KEY,
  ALPACA_API_SECRET: process.env.ALPACA_API_SECRET,
  ALPACA_ENV: (process.env.ALPACA_ENV as "paper" | "live") || "paper",
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
