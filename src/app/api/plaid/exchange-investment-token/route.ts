/**
 * POST /api/plaid/exchange-investment-token
 *
 * Exchanges a Plaid public_token for an access_token scoped to the
 * Investments product, then persists any investment accounts found.
 *
 * This is separate from /api/plaid/exchange-public-token which handles
 * bank (Auth + Transactions) accounts and wires them to Dwolla.
 */

import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { requireAuth } from "@/lib/auth/withAuth";
import { createInvestmentAccount } from "@/lib/services/db/investmentAccounts";
import type { InvestmentAccountType } from "@/lib/types";

function mapAccountSubtype(subtype: string | null | undefined): InvestmentAccountType {
  switch (subtype) {
    case "brokerage":       return "brokerage";
    case "ira":             return "ira";
    case "roth":            return "roth";
    case "401k":            return "401k";
    case "403b":            return "403b";
    case "529":             return "529";
    default:                return "other";
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { workspaceId } = auth;

  let body: { publicToken?: string; workspaceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { publicToken, workspaceId: bodyWorkspaceId = workspaceId } = body;

  if (!publicToken) {
    return NextResponse.json({ error: "publicToken is required" }, { status: 400 });
  }

  try {
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResponse.data.access_token;

    // Get all accounts on this item to identify investment accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    // Resolve institution name
    let institutionName = "Investment Account";
    const institutionId = accountsResponse.data.item.institution_id;
    if (institutionId) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [],
        });
        institutionName = instResponse.data.institution.name;
      } catch {
        // Fall back to generic name
      }
    }

    // Filter to investment-type accounts only
    const investmentAccountTypes = new Set([
      "investment",
      "brokerage",
      "ira",
      "401k",
      "403b",
      "529",
    ]);

    const investmentAccounts = accountsResponse.data.accounts.filter(
      (acct) =>
        acct.type === "investment" ||
        (acct.subtype && investmentAccountTypes.has(acct.subtype))
    );

    if (investmentAccounts.length === 0) {
      return NextResponse.json({
        error:
          "No investment accounts found on this institution link. Make sure you selected a brokerage or investment account during the Plaid link flow.",
      }, { status: 400 });
    }

    // Persist each investment account (one access token shared across all accounts in the item)
    const linked = [];
    for (const acct of investmentAccounts) {
      const balance =
        acct.balances.current ??
        acct.balances.available ??
        0;

      const saved = await createInvestmentAccount({
        workspaceId: bodyWorkspaceId,
        accountId: acct.account_id,
        institutionName,
        displayMask: acct.mask ?? "0000",
        accountType: mapAccountSubtype(acct.subtype),
        balance,
        accessTokenRef: accessToken, // stored server-side only
      });

      if (saved) {
        linked.push(saved);
      }
    }

    return NextResponse.json({
      accounts: linked,
      institutionName,
      message: `${linked.length} investment account${linked.length !== 1 ? "s" : ""} linked from ${institutionName}`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange investment token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
