import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbBanks from "@/lib/services/db/banks";

export async function GET(request: NextRequest) {
  const workspaceId =
    request.nextUrl.searchParams.get("workspaceId") ?? "ws-001";

  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const banks = await dbBanks.getBanksByWorkspace(workspaceId);
  const totalBalance = await dbBanks.getTotalBalance(workspaceId);

  return NextResponse.json({ banks, totalBalance });
}

export async function POST(request: NextRequest) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const body = await request.json();
  try {
    const bank = await dbBanks.addBank(body);
    return NextResponse.json(bank, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
