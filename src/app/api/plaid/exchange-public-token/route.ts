import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { ProcessorTokenCreateRequestProcessorEnum } from "plaid";
import { addBank, updateBank, getBanksByWorkspace } from "@/lib/services/banks";
import { dwollaClient } from "@/lib/dwolla";
import { requireAuth } from "@/lib/auth/withAuth";
import { getWorkspace } from "@/lib/services/workspace";
import { canAddBankAccount } from "@/lib/planLimits";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, { requiredRole: "member", enforceWorkspace: false });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  try {
    const body = await request.json();
    const { publicToken, workspaceId = auth.workspaceId } = body as {
      publicToken: string;
      workspaceId: string;
    };

    if (!publicToken || !workspaceId) {
      return NextResponse.json(
        { error: "publicToken and workspaceId are required" },
        { status: 400 }
      );
    }

    // ── Plan enforcement: check bank account limit ────────────────────────
    const workspace = getWorkspace(workspaceId);
    if (workspace) {
      const existingBanks = getBanksByWorkspace(workspaceId);
      const check = canAddBankAccount(workspace.plan, existingBanks.length);
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason, planLimit: true }, { status: 403 });
      }
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

    // Persist each linked account and create Dwolla funding sources
    const linkedBanks = [];
    for (const account of accounts) {
      const mask = account.mask ?? "0000";
      const bank = addBank({
        workspaceId,
        institutionName,
        accountId: account.account_id,
        displayMask: mask,
        shareableId: `ARC-${institutionName.replace(/\s+/g, "").slice(0, 6).toUpperCase()}-${mask}`,
        balance: account.balances.current ?? 0,
        accessTokenRef: accessToken,
      });

      // Create Dwolla funding source via Plaid processor token
      try {
        // Generate Plaid processor token for Dwolla
        const processorResponse = await plaidClient.processorTokenCreate({
          access_token: accessToken,
          account_id: account.account_id,
          processor: ProcessorTokenCreateRequestProcessorEnum.Dwolla,
        });
        const processorToken = processorResponse.data.processor_token;

        // Create Dwolla customer funding source
        // In sandbox, use the Dwolla master account's funding-sources endpoint
        const rootRes = await dwollaClient.get("/");
        const rootLinks = rootRes.body._links;
        const accountUrl =
          rootLinks?.account?.href ?? rootLinks?.self?.href ?? "";

        if (accountUrl) {
          const fundingRes = await dwollaClient.post(
            `${accountUrl}/funding-sources`,
            {
              plaidToken: processorToken,
              name: `${institutionName} ...${mask}`,
            }
          );
          const fundingSourceUrl =
            fundingRes.headers.get("Location") ??
            fundingRes.headers.get("location") ??
            "";

          if (fundingSourceUrl) {
            updateBank(bank.bankId, { fundingSourceUrl });
            bank.fundingSourceUrl = fundingSourceUrl;
          }
        }
      } catch {
        // Dwolla funding source creation failed — bank still linked without it
      }

      linkedBanks.push(bank);
    }

    return NextResponse.json({ banks: linkedBanks });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to exchange token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
