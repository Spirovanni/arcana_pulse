import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { mapDwollaStatus } from "@/lib/dwolla";
import {
  getTransferByProviderRef,
  updateTransferStatus,
} from "@/lib/services/transfers";

// Dwolla webhook events we care about
const TRANSFER_EVENTS = new Set([
  "customer_transfer_created",
  "customer_transfer_cancelled",
  "customer_transfer_failed",
  "customer_transfer_completed",
  "transfer_created",
  "transfer_cancelled",
  "transfer_failed",
  "transfer_completed",
  "transfer_reclaimed",
]);

/**
 * Verify the Dwolla webhook signature.
 * Dwolla signs webhooks with SHA-256 HMAC using the webhook secret.
 */
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Extract the Dwolla transfer URL from the webhook body.
 * Dwolla includes a `_links.resource.href` pointing to the transfer.
 */
function extractTransferUrl(body: Record<string, unknown>): string | null {
  const links = body._links as
    | Record<string, { href?: string }>
    | undefined;
  return links?.resource?.href ?? null;
}

/**
 * Extract the transfer status from the event topic.
 * e.g. "customer_transfer_completed" → "processed"
 */
function topicToStatus(topic: string): string {
  if (topic.includes("completed")) return "processed";
  if (topic.includes("failed")) return "failed";
  if (topic.includes("cancelled")) return "cancelled";
  if (topic.includes("reclaimed")) return "reclaimed";
  if (topic.includes("created")) return "pending";
  return "pending";
}

// Track processed webhook IDs for idempotency
const processedWebhookIds = new Set<string>();

/**
 * POST /api/dwolla/webhook
 * Receives Dwolla webhook events for transfer status changes.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.DWOLLA_WEBHOOK_SECRET ?? "";

    // Verify signature (skip in sandbox if no secret configured)
    const signature = request.headers.get("x-request-signature-sha-256");
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const topic = (body.topic as string) ?? "";
    const webhookId = (body.id as string) ?? "";

    // Idempotency: skip already-processed webhooks
    if (webhookId && processedWebhookIds.has(webhookId)) {
      return NextResponse.json({ status: "already_processed" });
    }

    // Only handle transfer-related events
    if (!TRANSFER_EVENTS.has(topic)) {
      return NextResponse.json({ status: "ignored", topic });
    }

    // Extract the Dwolla transfer URL
    const transferUrl = extractTransferUrl(body);
    if (!transferUrl) {
      return NextResponse.json(
        { error: "No resource link in webhook body" },
        { status: 400 }
      );
    }

    // Look up our transfer by provider reference
    const transfer = getTransferByProviderRef(transferUrl);
    if (!transfer) {
      // Transfer not found — might be from a different integration or old transfer
      return NextResponse.json({ status: "not_found", transferUrl });
    }

    // Map Dwolla status from event topic
    const dwollaStatus = topicToStatus(topic);
    const mappedStatus = mapDwollaStatus(dwollaStatus);

    // Skip if already in this status or a terminal state
    if (
      transfer.status === mappedStatus ||
      transfer.status === "posted" ||
      transfer.status === "failed" ||
      transfer.status === "reversed"
    ) {
      if (webhookId) processedWebhookIds.add(webhookId);
      return NextResponse.json({
        status: "no_change",
        currentStatus: transfer.status,
      });
    }

    // Update the transfer status
    try {
      const updated = updateTransferStatus(transfer.transferId, mappedStatus);
      if (webhookId) processedWebhookIds.add(webhookId);

      return NextResponse.json({
        status: "updated",
        transferId: updated.transferId,
        previousStatus: transfer.status,
        newStatus: updated.status,
      });
    } catch (err: unknown) {
      // Transition not allowed — log but don't fail the webhook
      const message =
        err instanceof Error ? err.message : "Status update failed";
      if (webhookId) processedWebhookIds.add(webhookId);
      return NextResponse.json({
        status: "transition_skipped",
        reason: message,
      });
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
