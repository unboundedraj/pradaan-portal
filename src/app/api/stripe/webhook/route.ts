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
      const { data: drive, error: driveError } = await admin
        .from("drives")
        .select("current_amount, target_amount")
        .eq("id", drive_id)
        .single();

      if (driveError || !drive) {
        console.error("[webhook] drive not found:", drive_id, driveError);
        return NextResponse.json({ error: "Drive not found" }, { status: 400 });
      }

      const overflow = Math.max(
        0,
        drive.current_amount + amount - drive.target_amount
      );
      const driveCredit = amount - overflow;

      const { data: donation, error: donationError } = await admin
        .from("donations")
        .insert({ donor_id, drive_id, amount, source: "STRIPE" })
        .select("id")
        .single();

      if (donationError) {
        console.error("[webhook] donations.insert failed:", donationError);
        return NextResponse.json(
          { error: "Failed to record donation" },
          { status: 500 }
        );
      }

      if (driveCredit > 0) {
        const { error: driveUpdateError } = await admin
          .from("drives")
          .update({ current_amount: drive.current_amount + driveCredit })
          .eq("id", drive_id);

        if (driveUpdateError) {
          console.error("[webhook] drive credit failed:", driveUpdateError);
        }
      }

      if (overflow > 0) {
        const { error: potError } = await admin
          .from("pradaan_pot_ledger")
          .insert({
            type: "INFLOW_OVERFLOW",
            amount: overflow,
            reference_id: donation.id,
          });

        if (potError) {
          console.error("[webhook] pradaan_pot_ledger.insert failed:", potError);
        }
      }

      console.log(
        `[webhook] donation recorded: donor=${donor_id} drive=${drive_id} amount=${amount} overflow=${overflow}`
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
          status: "COMPLETED",
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
