import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { addBank } from "@/lib/services/banks";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicToken, workspaceId } = body as {
      publicToken: string;
      workspaceId: string;
    };

    if (!publicToken || !workspaceId) {
      return NextResponse.json(
        { error: "publicToken and workspaceId are required" },
        { status: 400 }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResponse.data.access_token;

    // Retrieve linked accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const accounts = accountsResponse.data.accounts;
    const institution = accountsResponse.data.item.institution_id ?? "Unknown";

    // Get institution name
    let institutionName = institution;
    if (accountsResponse.data.item.institution_id) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: accountsResponse.data.item.institution_id,
          country_codes: [],
        });
        institutionName = instResponse.data.institution.name;
      } catch {
        // Fall back to institution_id if lookup fails
      }
    }

    // Persist each linked account via bank service
    const linkedBanks = accounts.map((account) => {
      const mask = account.mask ?? "0000";
      return addBank({
        workspaceId,
        institutionName,
        accountId: account.account_id,
        displayMask: mask,
        shareableId: `ARC-${institutionName.replace(/\s+/g, "").slice(0, 6).toUpperCase()}-${mask}`,
        balance: account.balances.current ?? 0,
        accessTokenRef: accessToken,
      });
    });

    return NextResponse.json({ banks: linkedBanks });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
