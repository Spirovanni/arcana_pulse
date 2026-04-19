import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe, getPriceId, isSandboxBilling } from "@/lib/stripe";
import type { PlanId } from "@/lib/stripe";

/**
 * POST /api/stripe/create-checkout-session
 * Body: { plan: "pro" | "team" }
 *
 * Returns: { url: string } — the Stripe-hosted checkout URL
 * In sandbox mode (no STRIPE_SECRET_KEY), returns a mock success URL.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const plan = (body.plan ?? "pro") as PlanId;

  // ── Sandbox mode: pretend it worked ────────────────────────────────
  if (isSandboxBilling()) {
    const mockUrl = `${request.nextUrl.origin}/settings?billing=sandbox_upgrade&plan=${plan}`;
    return NextResponse.json({ url: mockUrl, sandbox: true });
  }

  const priceId = getPriceId(plan);
  if (!priceId) {
    return NextResponse.json({ error: `No price configured for plan: ${plan}` }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = request.nextUrl.origin;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: session.user.email,
    metadata: {
      workspaceId: session.user.workspaceId,
      userId: session.user.userId,
      plan,
    },
    success_url: `${origin}/settings?billing=success&plan=${plan}`,
    cancel_url: `${origin}/settings?billing=cancelled`,
    subscription_data: {
      metadata: {
        workspaceId: session.user.workspaceId,
        userId: session.user.userId,
        plan,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
