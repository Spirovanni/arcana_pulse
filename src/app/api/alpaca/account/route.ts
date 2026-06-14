export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { alpacaGet, isAlpacaConfigured, AlpacaConfigError } from "@/lib/alpaca";
import type { AlpacaAccount } from "@/lib/types";

// Raw Alpaca account response shape (subset we care about)
interface RawAlpacaAccount {
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
}

export async function GET() {
  if (!isAlpacaConfigured()) {
    return NextResponse.json(
      { configured: false, error: "Alpaca API keys not configured" },
      { status: 200 }
    );
  }

  try {
    const raw = await alpacaGet<RawAlpacaAccount>("/v2/account");

    const equity = parseFloat(raw.equity);
    const lastEquity = parseFloat(raw.last_equity);
    const dayPLAmount = equity - lastEquity;
    const dayPLPercent = lastEquity > 0 ? (dayPLAmount / lastEquity) * 100 : 0;
    const cash = parseFloat(raw.cash);
    const portfolioValue = parseFloat(raw.portfolio_value);
    const totalPLAmount = portfolioValue - cash;
    const totalPLPercent = cash > 0 ? (totalPLAmount / cash) * 100 : 0;

    const account: AlpacaAccount = {
      equity,
      cash,
      buyingPower: parseFloat(raw.buying_power),
      portfolioValue,
      dayPLAmount,
      dayPLPercent,
      totalPLAmount,
      totalPLPercent,
      status: raw.status,
      accountNumber: raw.account_number,
      currency: raw.currency,
      patternDayTrader: raw.pattern_day_trader,
    };

    return NextResponse.json({ configured: true, account });
  } catch (err) {
    if (err instanceof AlpacaConfigError) {
      return NextResponse.json({ configured: false, error: err.message }, { status: 200 });
    }
    console.error("[Alpaca /account]", err);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}
