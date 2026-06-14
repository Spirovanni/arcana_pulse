/**
 * Alpaca Markets API client — server-side ONLY.
 * Keys (ALPACA_API_KEY, ALPACA_API_SECRET) are read from env vars and never
 * sent to the browser. All public API routes in /api/alpaca/* proxy through here.
 */

import { env } from "@/lib/env";

// ─── Base URLs ────────────────────────────────────────────────────────────────

function getTradingBase(): string {
  return env.ALPACA_ENV === "live"
    ? "https://api.alpaca.markets"
    : "https://paper-api.alpaca.markets";
}

const DATA_BASE = "https://data.alpaca.markets";

// ─── Auth headers ─────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  if (!env.ALPACA_API_KEY || !env.ALPACA_API_SECRET) {
    throw new AlpacaConfigError(
      "Missing ALPACA_API_KEY or ALPACA_API_SECRET environment variables."
    );
  }
  return {
    "APCA-API-KEY-ID": env.ALPACA_API_KEY,
    "APCA-API-SECRET-KEY": env.ALPACA_API_SECRET,
    "Content-Type": "application/json",
  };
}

// ─── Custom errors ────────────────────────────────────────────────────────────

export class AlpacaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlpacaConfigError";
  }
}

export class AlpacaAPIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AlpacaAPIError";
    this.status = status;
  }
}

// ─── Core fetch helpers ───────────────────────────────────────────────────────

async function alpacaFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
    // Next.js: don't cache trading data
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AlpacaAPIError(
      `Alpaca API error ${res.status}: ${body}`,
      res.status
    );
  }

  return res;
}

export async function alpacaGet<T>(path: string): Promise<T> {
  const res = await alpacaFetch(`${getTradingBase()}${path}`);
  return res.json() as Promise<T>;
}

export async function alpacaPost<T>(path: string, body: unknown): Promise<T> {
  const res = await alpacaFetch(`${getTradingBase()}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function alpacaDelete(path: string): Promise<void> {
  await alpacaFetch(`${getTradingBase()}${path}`, { method: "DELETE" });
}

export async function alpacaDataGet<T>(path: string): Promise<T> {
  const res = await alpacaFetch(`${DATA_BASE}${path}`);
  return res.json() as Promise<T>;
}

// ─── Convenience check ────────────────────────────────────────────────────────

export function isAlpacaConfigured(): boolean {
  return Boolean(env.ALPACA_API_KEY && env.ALPACA_API_SECRET);
}

export function getAlpacaMode(): "paper" | "live" {
  return env.ALPACA_ENV ?? "paper";
}
