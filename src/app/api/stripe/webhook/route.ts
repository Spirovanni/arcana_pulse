import { NextRequest, NextResponse } from "next/server";
import { getStripe, isSandboxBilling } from "@/lib/stripe";
import { updateWorkspace } from "@/lib/services/workspace";
import {
  sendSubscriptionWelcomeEmail,
  sendSubscriptionCancelledEmail,
} from "@/lib/services/email";
import type { WorkspacePlan } from "@/lib/types";
import type Stripe from "stripe";

/**
 * POST /api/stripe/webhook
 * Receives Stripe webhook events and fulfills subscription state changes.
 *
 * Handled events:
 *  - checkout.session.completed        → activate plan on checkout
 *  - customer.subscription.updated     → handle plan changes / renewals
 *  - customer.subscription.deleted     → downgrade to starter on cancellation
 */
export async function POST(request: NextRequest) {
  // Webhooks are no-ops in sandbox billing mode
  if (isSandboxBilling()) {
    return NextResponse.json({ received: true, sandbox: true });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe/webhook] signature error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error("[stripe/webhook] fulfillment error:", err);
    // Return 200 to prevent Stripe retrying — log for manual remediation
    return NextResponse.json({ received: true, warning: "fulfillment_error" });
  }

  return NextResponse.json({ received: true });
}

// ─── Event handlers ──────────────────────────────────────────────────────────

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const sess = event.data.object as Stripe.Checkout.Session;
      const workspaceId = sess.metadata?.workspaceId;
      const plan = sess.metadata?.plan as WorkspacePlan | undefined;
      if (workspaceId && plan && plan !== "starter") {
        applyPlan(workspaceId, plan);
        // Send welcome email via customer email from Stripe session
        if (sess.customer_email && plan) {
          const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
          sendSubscriptionWelcomeEmail(sess.customer_email, "there", planLabel).catch(
            (err) => console.error("[stripe/webhook] welcome email failed:", err)
          );
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspaceId;
      const plan = sub.metadata?.plan as WorkspacePlan | undefined;
      if (workspaceId) {
        // sub.status: active | past_due | canceled | unpaid | trialing
        const effectivePlan: WorkspacePlan =
          sub.status === "active" || sub.status === "trialing"
            ? (plan ?? "starter")
            : "starter";
        applyPlan(workspaceId, effectivePlan);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspaceId;
      if (workspaceId) {
        applyPlan(workspaceId, "starter");
        // Notify the customer that their subscription ended
        const cancelledAt = sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : new Date().toISOString();
        if (sub.metadata?.email) {
          sendSubscriptionCancelledEmail(sub.metadata.email, "there", cancelledAt).catch(
            (err) => console.error("[stripe/webhook] cancellation email failed:", err)
          );
        }
      }
      break;
    }

    default:
      // Ignored events — no-op
      break;
  }
}

function applyPlan(workspaceId: string, plan: WorkspacePlan) {
  try {
    updateWorkspace(workspaceId, { plan });
    console.log(`[stripe/webhook] workspace ${workspaceId} upgraded to ${plan}`);
  } catch (err) {
    // In production this should write to Appwrite directly; mock store is
    // scoped to the current process so may not persist across restarts.
    console.error(`[stripe/webhook] failed to update plan for ${workspaceId}:`, err);
  }
}
