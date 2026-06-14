/**
 * Appwrite-backed service for investment accounts linked via Plaid Investments.
 *
 * Investment accounts are stored separately from bank accounts because they
 * use a different Plaid product (Investments) and have different data structures
 * (holdings, investment transactions, dividends).
 *
 * The Plaid access_token is stored as accessTokenRef and must be kept secret
 * server-side — it is never returned to the client.
 */

import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
  isAppwriteConfigured,
} from "@/lib/appwrite";
import { generateId } from "@/lib/utils";
import type { InvestmentAccount, InvestmentAccountType } from "@/lib/types";
import type { Models } from "node-appwrite";

type InvAcctDoc = Models.Document & Record<string, unknown>;

function toInvestmentAccount(doc: InvAcctDoc): InvestmentAccount & { accessTokenRef?: string } {
  return {
    investmentAccountId: doc.$id,
    workspaceId: typeof doc.workspaceId === "string" ? doc.workspaceId : "",
    bankId: typeof doc.bankId === "string" ? doc.bankId : "",
    accountId: typeof doc.accountId === "string" ? doc.accountId : "",
    institutionName: typeof doc.institutionName === "string" ? doc.institutionName : "Unknown",
    displayMask: typeof doc.displayMask === "string" ? doc.displayMask : "0000",
    accountType:
      typeof doc.accountType === "string"
        ? (doc.accountType as InvestmentAccountType)
        : "brokerage",
    balance: typeof doc.balance === "number" ? doc.balance : 0,
    createdAt: typeof doc.createdAt === "string" ? doc.createdAt : doc.$createdAt,
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : doc.$updatedAt,
    // accessTokenRef is intentionally included here for server-side use only.
    // Callers must strip it before returning to clients.
    accessTokenRef: typeof doc.accessTokenRef === "string" ? doc.accessTokenRef : undefined,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getInvestmentAccountsByWorkspace(
  workspaceId: string
): Promise<InvestmentAccount[]> {
  if (!isAppwriteConfigured()) return [];

  const db = getDatabase();

  try {
    const result = await db.listDocuments(
      DATABASE_ID,
      COLLECTIONS.investmentAccounts,
      [Query.equal("workspaceId", workspaceId), Query.limit(50), Query.orderDesc("$createdAt")]
    );
    return (result.documents as InvAcctDoc[]).map((doc) => {
      const { accessTokenRef: _ignored, ...acct } = toInvestmentAccount(doc);
      return acct;
    });
  } catch {
    return [];
  }
}

/** Returns the full document including accessTokenRef — server-side use only. */
export async function getInvestmentAccountWithToken(
  investmentAccountId: string,
  workspaceId: string
): Promise<(InvestmentAccount & { accessTokenRef: string }) | null> {
  if (!isAppwriteConfigured()) return null;

  const db = getDatabase();

  try {
    const doc = await db.getDocument(
      DATABASE_ID,
      COLLECTIONS.investmentAccounts,
      investmentAccountId
    );
    const acct = toInvestmentAccount(doc as InvAcctDoc);
    if (acct.workspaceId !== workspaceId) return null; // ownership check
    if (!acct.accessTokenRef) return null;
    return acct as InvestmentAccount & { accessTokenRef: string };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export interface CreateInvestmentAccountInput {
  workspaceId: string;
  accountId: string;
  institutionName: string;
  displayMask: string;
  accountType: InvestmentAccountType;
  balance: number;
  accessTokenRef: string;
}

export async function createInvestmentAccount(
  input: CreateInvestmentAccountInput
): Promise<InvestmentAccount | null> {
  if (!isAppwriteConfigured()) return null;

  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    const doc = await db.createDocument(
      DATABASE_ID,
      COLLECTIONS.investmentAccounts,
      generateId("invacc"),
      {
        workspaceId: input.workspaceId,
        bankId: "", // no bank link for standalone investment accounts
        accountId: input.accountId,
        institutionName: input.institutionName,
        displayMask: input.displayMask,
        accountType: input.accountType,
        balance: input.balance,
        accessTokenRef: input.accessTokenRef,
        createdAt: now,
        updatedAt: now,
      }
    );
    const { accessTokenRef: _ignored, ...acct } = toInvestmentAccount(doc as InvAcctDoc);
    return acct;
  } catch {
    return null;
  }
}

export async function updateInvestmentAccountBalance(
  investmentAccountId: string,
  balance: number
): Promise<void> {
  if (!isAppwriteConfigured()) return;

  const db = getDatabase();

  try {
    await db.updateDocument(DATABASE_ID, COLLECTIONS.investmentAccounts, investmentAccountId, {
      balance,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-critical — ignore
  }
}

export async function deleteInvestmentAccount(
  investmentAccountId: string,
  workspaceId: string
): Promise<boolean> {
  if (!isAppwriteConfigured()) return false;

  const db = getDatabase();

  try {
    const doc = await db.getDocument(
      DATABASE_ID,
      COLLECTIONS.investmentAccounts,
      investmentAccountId
    );
    if ((doc as InvAcctDoc).workspaceId !== workspaceId) return false;
    await db.deleteDocument(DATABASE_ID, COLLECTIONS.investmentAccounts, investmentAccountId);
    return true;
  } catch {
    return false;
  }
}
