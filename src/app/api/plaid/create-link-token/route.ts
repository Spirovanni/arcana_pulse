import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

export async function POST() {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "usr-001" },
      client_name: "Arcana Pulse",
      products: [Products.Auth, Products.Transactions, Products.Investments],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create link token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
