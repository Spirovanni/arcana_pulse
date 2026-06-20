import {
  getDatabase,
  DATABASE_ID,
  COLLECTIONS,
  Query,
} from "@/lib/appwrite";
import { generateId } from "@/lib/utils";
import type { PaperOrder, CreatePaperOrderInput, PaperOrderStatus } from "@/lib/types";
import type { Models } from "node-appwrite";

function toPaperOrder(doc: Models.Document & Record<string, any>): PaperOrder {
  return {
    orderId: doc.$id,
    workspaceId: doc.workspaceId,
    strategyId: doc.strategyId ?? undefined,
    submittedBy: doc.submittedBy,
    side: doc.side,
    symbol: doc.symbol,
    qty: doc.qty != null ? doc.qty : undefined,
    notional: doc.notional != null ? doc.notional : undefined,
    orderType: doc.orderType,
    timeInForce: doc.timeInForce,
    clientOrderId: doc.clientOrderId,
    alpacaOrderId: doc.alpacaOrderId ?? undefined,
    status: doc.status as PaperOrderStatus,
    confirmedAt: doc.confirmedAt ?? undefined,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

export async function createPaperOrder(
  input: CreatePaperOrderInput
): Promise<PaperOrder> {
  const data: Record<string, any> = {
    workspaceId: input.workspaceId,
    submittedBy: input.submittedBy,
    side: input.side,
    symbol: input.symbol,
    orderType: input.orderType,
    timeInForce: input.timeInForce,
    clientOrderId: input.clientOrderId,
    status: input.status,
  };

  if (input.strategyId) data.strategyId = input.strategyId;
  if (input.qty != null) data.qty = input.qty;
  if (input.notional != null) data.notional = input.notional;
  if (input.confirmedAt) data.confirmedAt = input.confirmedAt;

  const doc = await getDatabase().createDocument(
    DATABASE_ID,
    COLLECTIONS.paperOrders,
    generateId("pco"),
    data
  );
  return toPaperOrder(doc);
}

export async function updatePaperOrder(
  orderId: string,
  updates: Partial<Omit<PaperOrder, "orderId" | "workspaceId" | "createdAt" | "updatedAt">>
): Promise<PaperOrder> {
  const data: Record<string, any> = {};
  if (updates.alpacaOrderId !== undefined) data.alpacaOrderId = updates.alpacaOrderId;
  if (updates.status !== undefined) data.status = updates.status;
  if (updates.confirmedAt !== undefined) data.confirmedAt = updates.confirmedAt;

  const doc = await getDatabase().updateDocument(
    DATABASE_ID,
    COLLECTIONS.paperOrders,
    orderId,
    data
  );
  return toPaperOrder(doc);
}

export async function getPaperOrder(orderId: string): Promise<PaperOrder | null> {
  try {
    const doc = await getDatabase().getDocument(
      DATABASE_ID,
      COLLECTIONS.paperOrders,
      orderId
    );
    return toPaperOrder(doc);
  } catch {
    return null;
  }
}

export async function getPaperOrderByAlpacaId(alpacaOrderId: string): Promise<PaperOrder | null> {
  try {
    const result = await getDatabase().listDocuments(
      DATABASE_ID,
      COLLECTIONS.paperOrders,
      [Query.equal("alpacaOrderId", alpacaOrderId), Query.limit(1)]
    );
    if (result.documents.length === 0) return null;
    return toPaperOrder(result.documents[0]);
  } catch {
    return null;
  }
}

export async function getPaperOrderByClientOrderId(clientOrderId: string): Promise<PaperOrder | null> {
  try {
    const result = await getDatabase().listDocuments(
      DATABASE_ID,
      COLLECTIONS.paperOrders,
      [Query.equal("clientOrderId", clientOrderId), Query.limit(1)]
    );
    if (result.documents.length === 0) return null;
    return toPaperOrder(result.documents[0]);
  } catch {
    return null;
  }
}

export async function listPaperOrders(
  workspaceId: string,
  limit: number = 100
): Promise<PaperOrder[]> {
  const result = await getDatabase().listDocuments(
    DATABASE_ID,
    COLLECTIONS.paperOrders,
    [
      Query.equal("workspaceId", workspaceId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ]
  );
  return result.documents.map(toPaperOrder);
}
