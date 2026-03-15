import { NextRequest, NextResponse } from "next/server";
import { isAppwriteConfigured } from "@/lib/appwrite";
import * as dbBanks from "@/lib/services/db/banks";

interface RouteParams {
  params: Promise<{ bankId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { bankId } = await params;
  const bank = await dbBanks.getBankById(bankId);
  if (!bank) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(bank);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { bankId } = await params;
  const body = await request.json();

  try {
    const bank = await dbBanks.updateBank(bankId, body);
    return NextResponse.json(bank);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  if (!isAppwriteConfigured()) {
    return NextResponse.json(
      { error: "Appwrite not configured" },
      { status: 503 }
    );
  }

  const { bankId } = await params;
  try {
    await dbBanks.removeBankLink(bankId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
