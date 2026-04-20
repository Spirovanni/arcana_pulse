import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import type { Holding, Security } from "@/lib/types";
import { generateId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, investmentAccountId } = await request.json() as {
      accessToken: string;
      investmentAccountId: string;
    };

    if (!accessToken || !investmentAccountId) {
      return NextResponse.json(
        { error: "accessToken and investmentAccountId are required" },
        { status: 400 }
      );
    }

    const response = await plaidClient.investmentsHoldingsGet({
      access_token: accessToken,
    });

    const securitiesMap = new Map(
      response.data.securities.map((s) => [s.security_id, s])
    );

    const holdings: Holding[] = response.data.holdings.map((h) => {
      const raw = securitiesMap.get(h.security_id);
      const security: Security = {
        securityId: h.security_id,
        ticker: raw?.ticker_symbol ?? undefined,
        name: raw?.name ?? "Unknown Security",
        type: mapSecurityType(raw?.type ?? ""),
        closePrice: raw?.close_price ?? undefined,
        closePriceAsOf: raw?.close_price_as_of ?? undefined,
        isin: raw?.isin ?? undefined,
      };

      const costBasis = h.cost_basis ?? undefined;
      const unrealizedGainLoss =
        costBasis != null ? h.institution_value - costBasis : undefined;
      const unrealizedGainLossPct =
        costBasis != null && costBasis > 0
          ? ((h.institution_value - costBasis) / costBasis) * 100
          : undefined;

      return {
        holdingId: generateId("hld"),
        investmentAccountId,
        securityId: h.security_id,
        security,
        quantity: h.quantity,
        institutionValue: h.institution_value,
        costBasis,
        unrealizedGainLoss,
        unrealizedGainLossPct,
      };
    });

    return NextResponse.json({ holdings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch holdings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapSecurityType(plaidType: string): Security["type"] {
  switch (plaidType) {
    case "equity": return "equity";
    case "etf": return "etf";
    case "mutual fund": return "mutual_fund";
    case "fixed income": return "fixed_income";
    case "cash": return "cash";
    default: return "other";
  }
}
