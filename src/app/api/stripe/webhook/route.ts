import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { type, donor_id, drive_id } = session.metadata ?? {};
    const amount = session.amount_total;

    if (!amount || !donor_id || !type) {
      console.error("[webhook] missing required metadata:", session.metadata);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const admin = createAdminClient();

    // ── Donation via Stripe ────────────────────────────────────────────────
    if (type === "donation" && drive_id) {
      const { error } = await admin.rpc("donate_with_overflow", {
        p_donor_id: donor_id,
        p_drive_id: drive_id,
        p_amount: amount,
        p_source: "STRIPE",
      });

      if (error) {
        console.error("[webhook] donate_with_overflow failed:", error);
        // Return 500 so Stripe retries delivery.
        return NextResponse.json(
          { error: "Failed to record donation" },
          { status: 500 }
        );
      }

      console.log(
        `[webhook] donation recorded: donor=${donor_id} drive=${drive_id} amount=${amount}`
      );
    }

    // ── Wallet top-up ──────────────────────────────────────────────────────
    else if (type === "wallet_topup") {
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ??
            session.id; // fallback to session id if PI not expanded

      const { error: txError } = await admin
        .from("wallet_transactions")
        .insert({
          donor_id,
          amount,
          stripe_intent_id: paymentIntentId,
        });

      if (txError) {
        console.error("[webhook] wallet_transactions.insert failed:", txError);
        return NextResponse.json(
          { error: "Failed to record top-up" },
          { status: 500 }
        );
      }

      // Increment wallet balance. Two-step op — acceptable for now; a
      // dedicated RPC would make this atomic.
      const { data: profile, error: fetchError } = await admin
        .from("donor_profiles")
        .select("wallet_balance")
        .eq("id", donor_id)
        .single();

      if (fetchError || !profile) {
        console.error("[webhook] donor_profiles fetch failed:", fetchError);
        return NextResponse.json(
          { error: "Failed to read wallet balance" },
          { status: 500 }
        );
      }

      const { error: updateError } = await admin
        .from("donor_profiles")
        .update({ wallet_balance: profile.wallet_balance + amount })
        .eq("id", donor_id);

      if (updateError) {
        console.error("[webhook] wallet balance update failed:", updateError);
        return NextResponse.json(
          { error: "Failed to update wallet balance" },
          { status: 500 }
        );
      }

      console.log(
        `[webhook] wallet topped up: donor=${donor_id} amount=${amount}`
      );
    }
  }

  return NextResponse.json({ received: true });
}
