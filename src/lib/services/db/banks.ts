import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import type { Bank, AccountType } from "@/lib/types";
import type { Models } from "node-appwrite";
import { encryptSafe, decryptSafe } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// accountType prefix codec
// Encoded in institutionName so no Appwrite schema change is required.
// ---------------------------------------------------------------------------
const PREFIX_MAP: Record<AccountType, string> = {
  credit_card: "CC:",
  loan: "LN:",
  bank: "",
};

function encodeInstitutionName(name: string, type: AccountType): string {
  const prefix = PREFIX_MAP[type];
  return prefix ? `${prefix}${name}` : name;
}

function decodeInstitutionName(stored: string): { name: string; accountType: AccountType } {
  if (stored.startsWith("CC:")) return { name: stored.slice(3), accountType: "credit_card" };
  if (stored.startsWith("LN:")) return { name: stored.slice(3), accountType: "loan" };
  return { name: stored, accountType: "bank" };
}

// ---------------------------------------------------------------------------
// Document → entity mapper
// ---------------------------------------------------------------------------

function toBank(doc: Models.Document & Record<string, any>): Bank {
  const { name, accountType } = decodeInstitutionName(doc.institutionName ?? "");
  return {
    bankId: doc.$id,
    workspaceId: doc.workspaceId,
    institutionName: name,
    accountId: doc.accountId,
    displayMask: doc.displayMask,
    // Decrypt sensitive fields transparently — handles legacy plaintext values
    accessTokenRef: doc.accessTokenRef ? decryptSafe(doc.accessTokenRef) : undefined,
    fundingSourceUrl: doc.fundingSourceUrl ? decryptSafe(doc.fundingSourceUrl) : undefined,
    shareableId: doc.shareableId,
    balance: doc.balance,
    accountType,
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
  accountType?: AccountType;
  accessTokenRef?: string;
  fundingSourceUrl?: string;
}

export async function addBank(input: AddBankInput): Promise<Bank> {
  const { ID } = await import("node-appwrite");
  const storedName = encodeInstitutionName(input.institutionName, input.accountType ?? "bank");
  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.banks,
    ID.unique(),
    {
      workspaceId: input.workspaceId,
      institutionName: storedName,
      accountId: input.accountId,
      displayMask: input.displayMask,
      shareableId: input.shareableId,
      balance: input.balance,
      // Encrypt sensitive credentials before persisting
      accessTokenRef: input.accessTokenRef ? encryptSafe(input.accessTokenRef) : null,
      fundingSourceUrl: input.fundingSourceUrl ? encryptSafe(input.fundingSourceUrl) : null,
    }
  );
  return toBank(doc);
}

/**
 * Returns the existing bank for this workspace+shareableId, or creates a new one.
 * Prevents duplicate-document errors when re-uploading the same statement.
 */
export async function getOrCreateBank(input: AddBankInput): Promise<Bank> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.banks,
    [
      Query.equal("workspaceId", input.workspaceId),
      Query.equal("shareableId", input.shareableId),
      Query.limit(1),
    ]
  );
  if (result.documents.length > 0) {
    return toBank(result.documents[0]);
  }
  return addBank(input);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateBank(
  bankId: string,
  updates: { fundingSourceUrl?: string; balance?: number }
): Promise<Bank> {
  const encryptedUpdates = {
    ...updates,
    ...(updates.fundingSourceUrl !== undefined
      ? { fundingSourceUrl: encryptSafe(updates.fundingSourceUrl) }
      : {}),
  };
  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.banks,
    bankId,
    encryptedUpdates
  );
  return toBank(doc);
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function removeBankLink(bankId: string): Promise<void> {
  await getDatabase().deleteDocument(DATABASE_ID, COLLECTIONS.banks, bankId);
}
