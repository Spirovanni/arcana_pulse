import { NextRequest, NextResponse } from "next/server";
import {
  initiateDwollaTransfer,
  getDwollaTransferStatus,
  mapDwollaStatus,
} from "@/lib/dwolla";
import { getBankById } from "@/lib/services/banks";
import {
  createTransfer,
  getTransferById,
  updateTransferStatus,
} from "@/lib/services/transfers";

/**
 * POST /api/dwolla/transfer
 * Initiate a transfer between two Dwolla funding sources.
 *
 * Body: { workspaceId, senderBankId, receiverShareableId, recipientEmail?, amount, note }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      senderBankId,
      receiverShareableId,
      recipientEmail,
      amount,
      note,
    } = body as {
      workspaceId: string;
      senderBankId: string;
      receiverShareableId: string;
      recipientEmail?: string;
      amount: number;
      note: string;
    };

    if (!workspaceId || !senderBankId || !receiverShareableId || !amount) {
      return NextResponse.json(
        { error: "workspaceId, senderBankId, receiverShareableId, and amount are required" },
        { status: 400 }
      );
    }

    // Validate sender has a Dwolla funding source
    const senderBank = getBankById(senderBankId);
    if (!senderBank?.fundingSourceUrl) {
      return NextResponse.json(
        { error: "Source bank does not have a Dwolla funding source. Link via Plaid first." },
        { status: 400 }
      );
    }

    // Create the transfer record in our service (validates balance, debits, etc.)
    const transfer = createTransfer({
      workspaceId,
      senderBankId,
      receiverShareableId,
      recipientEmail,
      amount,
      note,
    });

    // Initiate the Dwolla transfer
    // In sandbox, we use the sender's funding source as both source and destination
    // (Dwolla sandbox allows same-account transfers for testing)
    try {
      const dwollaTransferUrl = await initiateDwollaTransfer({
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        // In production, we'd resolve the receiver's funding source from their shareableId
        // In sandbox, we use the same funding source for testing
        destinationFundingSourceUrl: senderBank.fundingSourceUrl,
        amount: amount.toFixed(2),
      });

      // Update transfer with Dwolla provider reference
      updateTransferStatus(transfer.transferId, "processing", dwollaTransferUrl);

      return NextResponse.json({
        transfer: getTransferById(transfer.transferId),
        dwollaTransferUrl,
      });
    } catch (dwollaErr: unknown) {
      // Dwolla initiation failed — transfer record exists with "pending" status
      // Mark as failed
      try {
        updateTransferStatus(transfer.transferId, "failed");
      } catch {
        // Status update failed — transfer stays pending
      }

      const message =
        dwollaErr instanceof Error
          ? dwollaErr.message
          : "Dwolla transfer initiation failed";
      return NextResponse.json(
        {
          error: message,
          transfer: getTransferById(transfer.transferId),
        },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create transfer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/dwolla/transfer?transferId=xxx
 * Check the current status of a transfer (polls Dwolla if provider reference exists).
 */
export async function GET(request: NextRequest) {
  try {
    const transferId = request.nextUrl.searchParams.get("transferId");
    if (!transferId) {
      return NextResponse.json(
        { error: "transferId query param is required" },
        { status: 400 }
      );
    }

    const transfer = getTransferById(transferId);
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    // If transfer has a Dwolla reference and isn't in a terminal state, poll Dwolla
    if (
      transfer.providerReference &&
      transfer.status !== "posted" &&
      transfer.status !== "failed" &&
      transfer.status !== "reversed"
    ) {
      try {
        const dwollaStatus = await getDwollaTransferStatus(
          transfer.providerReference
        );
        const mappedStatus = mapDwollaStatus(dwollaStatus.status);

        // Update our transfer if Dwolla status has advanced
        if (mappedStatus !== transfer.status) {
          const updated = updateTransferStatus(
            transfer.transferId,
            mappedStatus
          );
          return NextResponse.json({ transfer: updated });
        }
      } catch {
        // Dwolla polling failed — return current local status
      }
    }

    return NextResponse.json({ transfer });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to check transfer status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
