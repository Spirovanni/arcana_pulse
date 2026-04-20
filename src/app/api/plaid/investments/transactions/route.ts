import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import type { InvestmentTransaction, Security } from "@/lib/types";
import { generateId } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, investmentAccountId, startDate, endDate } =
      await request.json() as {
        accessToken: string;
        investmentAccountId: string;
        startDate?: string;
        endDate?: string;
      };

    if (!accessToken || !investmentAccountId) {
      return NextResponse.json(
        { error: "accessToken and investmentAccountId are required" },
        { status: 400 }
      );
    }

    const end = endDate ?? new Date().toISOString().split("T")[0];
    const start =
      startDate ??
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const response = await plaidClient.investmentsTransactionsGet({
      access_token: accessToken,
      start_date: start,
      end_date: end,
    });

    const securitiesMap = new Map(
      response.data.securities.map((s) => [s.security_id, s])
    );

    const transactions: InvestmentTransaction[] = response.data.investment_transactions.map((t) => {
      const raw = t.security_id ? securitiesMap.get(t.security_id) : undefined;
      const security: Security | undefined = raw
        ? {
            securityId: raw.security_id,
            ticker: raw.ticker_symbol ?? undefined,
            name: raw.name ?? "Unknown",
            type: mapSecurityType(raw.type ?? ""),
            closePrice: raw.close_price ?? undefined,
          }
        : undefined;

      return {
        investmentTransactionId: generateId("itxn"),
        investmentAccountId,
        securityId: t.security_id ?? undefined,
        security,
        type: mapTransactionType(t.type),
        name: t.name,
        amount: t.amount,
        quantity: t.quantity ?? undefined,
        price: t.price ?? undefined,
        fees: t.fees ?? undefined,
        date: t.date,
      };
    });

    return NextResponse.json({ transactions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch investment transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function mapTransactionType(plaidType: string): InvestmentTransaction["type"] {
  switch (plaidType) {
    case "buy": return "buy";
    case "sell": return "sell";
    case "dividend": return "dividend";
    case "transfer": return "transfer";
    default: return "other";
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
