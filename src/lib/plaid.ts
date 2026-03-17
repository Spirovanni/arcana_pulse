import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { withRetry } from "./resilience/retry";
import { plaidCircuit } from "./resilience/circuit-breaker";
import * as Sentry from "@sentry/nextjs";

const plaidEnv = process.env.PLAID_ENV || "sandbox";

const configuration = new Configuration({
  basePath:
    PlaidEnvironments[plaidEnv as keyof typeof PlaidEnvironments] ??
    PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

const rawPlaidClient = new PlaidApi(configuration);

export const plaidClient = new Proxy(rawPlaidClient, {
  get(target, prop, receiver) {
    const original = Reflect.get(target, prop, receiver);

    if (typeof original !== "function") return original;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (this: unknown, ...args: any[]) {
      return plaidCircuit
        .execute(() =>
          withRetry(() => (original as Function).apply(target, args), {
            maxRetries: 3,
            baseDelayMs: 300,
            maxDelayMs: 5000,
            onRetry: (attempt, error) => {
              Sentry.captureMessage(
                `Plaid retry ${attempt} for ${String(prop)}`,
                {
                  level: "warning",
                  extra: { error: error.message, method: String(prop) },
                },
              );
            },
          }),
        )
        .catch((error: unknown) => {
          Sentry.captureException(error, {
            tags: { service: "plaid", method: String(prop) },
          });
          throw error;
        });
    };
  },
}) as PlaidApi;
