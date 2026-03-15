import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { Bank } from "@/lib/types";
import type { Models } from "node-appwrite";
import { generateId } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toBank(doc: Models.Document & Record<string, any>): Bank {
  return {
    bankId: doc.$id,
    workspaceId: doc.workspaceId,
    institutionName: doc.institutionName,
    accountId: doc.accountId,
    displayMask: doc.displayMask,
    accessTokenRef: doc.accessTokenRef ?? undefined,
    fundingSourceUrl: doc.fundingSourceUrl ?? undefined,
    shareableId: doc.shareableId,
    balance: doc.balance,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getBanksByWorkspace(
  workspaceId: string
): Promise<Bank[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.banks,
    [Query.equal("workspaceId", workspaceId), Query.limit(100)]
  );
  return result.documents.map(toBank);
}

export async function getBankById(bankId: string): Promise<Bank | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.banks,
      bankId
    );
    return toBank(doc);
  } catch {
    return null;
  }
}

export async function getTotalBalance(workspaceId: string): Promise<number> {
  const banks = await getBanksByWorkspace(workspaceId);
  return banks.reduce((sum, b) => sum + b.balance, 0);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export interface AddBankInput {
  workspaceId: string;
  institutionName: string;
  accountId: string;
  displayMask: string;
  shareableId: string;
  balance: number;
  accessTokenRef?: string;
  fundingSourceUrl?: string;
}

export async function addBank(input: AddBankInput): Promise<Bank> {
  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.banks,
    generateId("bnk"),
    {
      workspaceId: input.workspaceId,
      institutionName: input.institutionName,
      accountId: input.accountId,
      displayMask: input.displayMask,
      shareableId: input.shareableId,
      balance: input.balance,
      accessTokenRef: input.accessTokenRef ?? null,
      fundingSourceUrl: input.fundingSourceUrl ?? null,
    }
  );
  return toBank(doc);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateBank(
  bankId: string,
  updates: { fundingSourceUrl?: string; balance?: number }
): Promise<Bank> {
  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.banks,
    bankId,
    updates
  );
  return toBank(doc);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function removeBankLink(bankId: string): Promise<void> {
  await getDatabase().deleteDocument(DATABASE_ID, COLLECTIONS.banks, bankId);
}
