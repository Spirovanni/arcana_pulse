import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { Transfer, TransferStatus } from "@/lib/types";
import type { Models } from "node-appwrite";
import { generateId } from "@/lib/utils";
import { getBankById, updateBank } from "./banks";
import { createTransaction } from "./transactions";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toTransfer(doc: Models.Document & Record<string, any>): Transfer {
  return {
    transferId: doc.$id,
    workspaceId: doc.workspaceId,
    senderBankId: doc.senderBankId,
    receiverShareableId: doc.receiverShareableId,
    recipientEmail: doc.recipientEmail ?? undefined,
    amount: doc.amount,
    note: doc.note ?? "",
    status: doc.status as TransferStatus,
    providerReference: doc.providerReference ?? undefined,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  initiated: ["pending", "failed"],
  pending: ["processing", "failed"],
  processing: ["posted", "failed"],
  posted: ["reversed"],
  failed: [],
  reversed: [],
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getTransfersByWorkspace(
  workspaceId: string
): Promise<Transfer[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transfers,
    [
      Query.equal("workspaceId", workspaceId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]
  );
  return result.documents.map(toTransfer);
}

export async function getTransferById(
  transferId: string
): Promise<Transfer | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.transfers,
      transferId
    );
    return toTransfer(doc);
  } catch {
    return null;
  }
}

export async function getTransferByProviderRef(
  providerReference: string
): Promise<Transfer | null> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.transfers,
    [Query.equal("providerReference", providerReference), Query.limit(1)]
  );
  return result.documents.length > 0 ? toTransfer(result.documents[0]) : null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface CreateTransferInput {
  workspaceId: string;
  senderBankId: string;
  receiverShareableId: string;
  recipientEmail?: string;
  amount: number;
  note: string;
}

export async function createTransfer(
  input: CreateTransferInput
): Promise<Transfer> {
  const senderBank = await getBankById(input.senderBankId);
  if (!senderBank) throw new Error("Source bank account not found");
  if (senderBank.workspaceId !== input.workspaceId) {
    throw new Error("Source bank does not belong to this workspace");
  }
  if (input.amount <= 0) {
    throw new Error("Transfer amount must be greater than zero");
  }
  if (input.amount > senderBank.balance) {
    throw new Error(
      `Insufficient balance. Available: $${senderBank.balance.toFixed(2)}`
    );
  }

  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.transfers,
    generateId("xfr"),
    {
      workspaceId: input.workspaceId,
      senderBankId: input.senderBankId,
      receiverShareableId: input.receiverShareableId,
      recipientEmail: input.recipientEmail ?? null,
      amount: input.amount,
      note: input.note,
      status: "pending",
    }
  );

  // Debit sender balance
  await updateBank(input.senderBankId, {
    balance: senderBank.balance - input.amount,
  });

  // Create corresponding transfer transaction record
  const now = new Date().toISOString();
  await createTransaction(
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

  return toTransfer(doc);
}

// ---------------------------------------------------------------------------
// Update status
// ---------------------------------------------------------------------------

export async function updateTransferStatus(
  transferId: string,
  newStatus: TransferStatus,
  providerReference?: string
): Promise<Transfer> {
  const existing = await getTransferById(transferId);
  if (!existing) throw new Error(`Transfer ${transferId} not found`);

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition transfer from "${existing.status}" to "${newStatus}"`
    );
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (providerReference) updateData.providerReference = providerReference;

  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.transfers,
    transferId,
    updateData
  );

  // If transfer failed, refund sender
  if (newStatus === "failed") {
    const senderBank = await getBankById(existing.senderBankId);
    if (senderBank) {
      await updateBank(existing.senderBankId, {
        balance: senderBank.balance + existing.amount,
      });
    }
  }

  return toTransfer(doc);
}
