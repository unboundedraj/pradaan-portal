import { NextResponse } from "next/server";

/**
 * Stripe webhook receiver.
 * Processes `payment_intent.succeeded` to credit donor wallet balances.
 * Full implementation in Phase 4 (Donation Engine).
 *
 * IMPORTANT: This route must use the raw request body for signature
 * verification — do NOT use `request.json()`.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // TODO Phase 4: verify signature with stripe.webhooks.constructEvent(),
  // then handle payment_intent.succeeded → credit wallet_transactions + donor_profiles.wallet_balance

  return NextResponse.json({ received: true });
}
