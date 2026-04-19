import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe, isSandboxBilling } from "@/lib/stripe";

/**
 * POST /api/stripe/create-portal-session
 *
 * Returns: { url: string } — the Stripe billing portal URL
 * In sandbox mode, returns a mock portal URL.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Sandbox mode ────────────────────────────────────────────────────
  if (isSandboxBilling()) {
    const mockUrl = `${request.nextUrl.origin}/settings?billing=sandbox_portal`;
    return NextResponse.json({ url: mockUrl, sandbox: true });
  }

  const stripe = getStripe();

  // Find the customer by email
  const customers = await stripe.customers.list({
    email: session.user.email,
    limit: 1,
  });

  let customerId: string;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    // Create a customer record if none exists
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: `${session.user.firstName} ${session.user.lastName}`,
      metadata: {
        workspaceId: session.user.workspaceId,
        userId: session.user.userId,
      },
    });
    customerId = customer.id;
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${request.nextUrl.origin}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
