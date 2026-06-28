import type { Bank } from "@/lib/types";
import { mockBanks } from "@/lib/mock/data";
import { generateId } from "@/lib/utils";

// ─── In-memory store (mock persistence) ─────────────────────────────
// Structured for future replacement with Appwrite SDK calls.

let banks: Bank[] = [...mockBanks];

// ─── Read ───────────────────────────────────────────────────────────

export function getBanksByWorkspace(workspaceId: string): Bank[] {
  return banks
    .filter((b) => b.workspaceId === workspaceId)
    .map((b) => ({ ...b }));
}

export function getBankById(bankId: string): Bank | null {
  const bank = banks.find((b) => b.bankId === bankId);
  return bank ? { ...bank } : null;
}

export function getTotalBalance(workspaceId: string): number {
  return banks
    .filter((b) => b.workspaceId === workspaceId)
    .reduce((sum, b) => sum + b.balance, 0);
}

// ─── Create ─────────────────────────────────────────────────────────

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

export function addBank(input: AddBankInput): Bank {
  const now = new Date().toISOString();
  const bank: Bank = {
    bankId: generateId("bnk"),
    workspaceId: input.workspaceId,
    institutionName: input.institutionName,
    accountId: input.accountId,
    displayMask: input.displayMask,
    shareableId: input.shareableId,
    balance: input.balance,
    accountType: "bank",
    accessTokenRef: input.accessTokenRef,
    fundingSourceUrl: input.fundingSourceUrl,
    createdAt: now,
    updatedAt: now,
  };
  banks = [...banks, bank];
  return { ...bank };
}

// ─── Update ─────────────────────────────────────────────────────────

export function updateBank(
  bankId: string,
  updates: { fundingSourceUrl?: string; balance?: number }
): Bank {
  const idx = banks.findIndex((b) => b.bankId === bankId);
  if (idx === -1) throw new Error(`Bank ${bankId} not found`);
  const updated: Bank = {
    ...banks[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  banks = [...banks.slice(0, idx), updated, ...banks.slice(idx + 1)];
  return { ...updated };
}

// ─── Delete ─────────────────────────────────────────────────────────

export function removeBankLink(bankId: string): void {
  const idx = banks.findIndex((b) => b.bankId === bankId);
  if (idx === -1) throw new Error(`Bank ${bankId} not found`);
  banks = [...banks.slice(0, idx), ...banks.slice(idx + 1)];
}
