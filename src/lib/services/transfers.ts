import type { Transfer, TransferStatus } from "@/lib/types";
import { mockTransfers } from "@/lib/mock/data";
import { generateId } from "@/lib/utils";
import { getBankById, updateBank } from "@/lib/services/banks";
import { createTransaction } from "@/lib/services/transactions";

// ─── In-memory store (mock persistence) ─────────────────────────────
// Structured for future replacement with Appwrite document operations.

let transfers: Transfer[] = [...mockTransfers];

// ─── Validation helpers ─────────────────────────────────────────────

const VALID_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  initiated: ["pending", "failed"],
  pending: ["processing", "failed"],
  processing: ["posted", "failed"],
  posted: ["reversed"],
  failed: [],
  reversed: [],
};

// ─── Read ───────────────────────────────────────────────────────────

export function getTransfersByWorkspace(workspaceId: string): Transfer[] {
  return transfers
    .filter((t) => t.workspaceId === workspaceId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .map((t) => ({ ...t }));
}

export function getTransferById(transferId: string): Transfer | null {
  const xfr = transfers.find((t) => t.transferId === transferId);
  return xfr ? { ...xfr } : null;
}

// ─── Create ─────────────────────────────────────────────────────────

export interface CreateTransferInput {
  workspaceId: string;
  senderBankId: string;
  receiverShareableId: string;
  recipientEmail?: string;
  amount: number;
  note: string;
}

export function createTransfer(input: CreateTransferInput): Transfer {
  // Validate sender bank exists
  const senderBank = getBankById(input.senderBankId);
  if (!senderBank) {
    throw new Error("Source bank account not found");
  }
  if (senderBank.workspaceId !== input.workspaceId) {
    throw new Error("Source bank does not belong to this workspace");
  }

  // Validate sufficient balance
  if (input.amount <= 0) {
    throw new Error("Transfer amount must be greater than zero");
  }
  if (input.amount > senderBank.balance) {
    throw new Error(
      `Insufficient balance. Available: $${senderBank.balance.toFixed(2)}`
    );
  }

  const now = new Date().toISOString();
  const transfer: Transfer = {
    transferId: generateId("xfr"),
    workspaceId: input.workspaceId,
    senderBankId: input.senderBankId,
    receiverShareableId: input.receiverShareableId,
    recipientEmail: input.recipientEmail,
    amount: input.amount,
    note: input.note,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  transfers = [transfer, ...transfers];

  // Debit sender balance
  updateBank(input.senderBankId, {
    balance: senderBank.balance - input.amount,
  });

  // Create corresponding transfer transaction record
  createTransaction(
    {
      workspaceId: input.workspaceId,
      bankId: input.senderBankId,
      transactionType: "transfer",
      title: `Transfer to ${input.receiverShareableId}`,
      category: "transfer",
      amount: input.amount,
      date: now.split("T")[0],
      note: input.note,
    },
    "system"
  );

  return { ...transfer };
}

// ─── Update Status ──────────────────────────────────────────────────

export function updateTransferStatus(
  transferId: string,
  newStatus: TransferStatus,
  providerReference?: string
): Transfer {
  const idx = transfers.findIndex((t) => t.transferId === transferId);
  if (idx === -1) throw new Error(`Transfer ${transferId} not found`);

  const existing = transfers[idx];
  const allowed = VALID_TRANSITIONS[existing.status];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition transfer from "${existing.status}" to "${newStatus}"`
    );
  }

  const updated: Transfer = {
    ...existing,
    status: newStatus,
    providerReference: providerReference ?? existing.providerReference,
    updatedAt: new Date().toISOString(),
  };

  transfers = [
    ...transfers.slice(0, idx),
    updated,
    ...transfers.slice(idx + 1),
  ];

  // If transfer failed, refund the sender balance
  if (newStatus === "failed") {
    const senderBank = getBankById(existing.senderBankId);
    if (senderBank) {
      updateBank(existing.senderBankId, {
        balance: senderBank.balance + existing.amount,
      });
    }
  }

  return { ...updated };
}
