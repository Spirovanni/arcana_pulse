import { Client } from "dwolla-v2";

const dwollaEnv = (process.env.DWOLLA_ENV ?? "sandbox") as
  | "production"
  | "sandbox";

export const dwollaClient = new Client({
  key: process.env.DWOLLA_KEY ?? "",
  secret: process.env.DWOLLA_SECRET ?? "",
  environment: dwollaEnv,
});

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Get or create a Dwolla customer for the workspace.
 * In sandbox, we use the master account as the "customer".
 * In production this would create a verified customer per workspace.
 */
export async function getOrCreateDwollaCustomer(): Promise<string> {
  const rootRes = await dwollaClient.get("/");
  const rootLinks = rootRes.body._links;
  const accountUrl =
    rootLinks?.account?.href ?? rootLinks?.self?.href ?? "";
  if (!accountUrl) {
    throw new Error("Could not resolve Dwolla account URL");
  }
  return accountUrl;
}

/**
 * Initiate a Dwolla transfer between two funding sources.
 * Returns the Dwolla transfer URL (used as provider reference).
 */
export async function initiateDwollaTransfer(input: {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
  currency?: string;
}): Promise<string> {
  const transferRes = await dwollaClient.post("transfers", {
    _links: {
      source: { href: input.sourceFundingSourceUrl },
      destination: { href: input.destinationFundingSourceUrl },
    },
    amount: {
      currency: input.currency ?? "USD",
      value: input.amount,
    },
  });

  const transferUrl =
    transferRes.headers.get("Location") ??
    transferRes.headers.get("location") ??
    "";
  if (!transferUrl) {
    throw new Error("Dwolla transfer created but no Location header returned");
  }
  return transferUrl;
}

/**
 * Get the status of a Dwolla transfer by its URL.
 */
export async function getDwollaTransferStatus(
  transferUrl: string
): Promise<{ status: string; id: string }> {
  const res = await dwollaClient.get(transferUrl);
  return {
    status: res.body.status,
    id: res.body.id,
  };
}

/**
 * Map a Dwolla transfer status string to our TransferStatus enum.
 */
export function mapDwollaStatus(
  dwollaStatus: string
): "pending" | "processing" | "posted" | "failed" | "reversed" {
  switch (dwollaStatus.toLowerCase()) {
    case "pending":
      return "pending";
    case "processed":
      return "posted";
    case "failed":
      return "failed";
    case "cancelled":
      return "failed";
    case "reclaimed":
      return "reversed";
    default:
      return "processing";
  }
}
