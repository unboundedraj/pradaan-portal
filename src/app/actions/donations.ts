"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { toCents, formatCurrency } from "@/lib/money";
import type { UserRole } from "@/types/database";

export type DonationState = { error: string } | null;

// ─── Donate to a drive via Stripe Checkout ────────────────────────────────────

export async function createDonationCheckout(
  _prevState: DonationState,
  formData: FormData
): Promise<DonationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=${formData.get("drive_id") ? `/drives/${formData.get("drive_id")}` : "/"}`);

  // Only donors can make direct donations — use admin client so RLS doesn't block the read.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile as { role: UserRole } | null)?.role !== "DONOR") {
    return { error: "Only donor accounts can make donations." };
  }

  const driveId = formData.get("drive_id") as string;
  const amountRupees = Number(formData.get("amount"));

  if (!driveId) return { error: "Drive not specified." };
  if (!amountRupees || amountRupees < 10) {
    return { error: "Minimum donation is ₹10." };
  }

  const { data: drive } = await admin
    .from("drives")
    .select("title, status, ends_at")
    .eq("id", driveId)
    .single();

  if (!drive || drive.status === "PENDING") {
    return { error: "This drive is not accepting donations right now." };
  }
  if (new Date(drive.ends_at) <= new Date()) {
    return { error: "This drive has ended." };
  }

  // toCents converts rupees → paise; Stripe uses the smallest currency unit.
  const amountPaise = toCents(amountRupees);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: { name: `Donation — ${drive.title}` },
          unit_amount: amountPaise,
        },
        quantity: 1,
      },
    ],
    // Never pass payment_method_types — dynamic payment methods give better
    // conversion and are managed from the Stripe Dashboard.
    metadata: {
      type: "donation",
      donor_id: user.id,
      drive_id: driveId,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donor?donated=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/drives/${driveId}`,
  });

  redirect(session.url!);
}

// ─── Top up donor wallet via Stripe Checkout ─────────────────────────────────

export async function createWalletTopupCheckout(
  _prevState: DonationState,
  formData: FormData
): Promise<DonationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const amountRupees = Number(formData.get("amount"));
  if (!amountRupees || amountRupees < 10) {
    return { error: "Minimum top-up is ₹10." };
  }

  const amountPaise = toCents(amountRupees);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: { name: "Pradaan Wallet Top-up" },
          unit_amount: amountPaise,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "wallet_topup",
      donor_id: user.id,
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donor?topup=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donor/wallet`,
  });

  redirect(session.url!);
}

// ─── Donate from wallet balance ───────────────────────────────────────────────

export async function createWalletDonation(
  _prevState: DonationState,
  formData: FormData
): Promise<DonationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile as { role: UserRole } | null)?.role !== "DONOR") {
    return { error: "Only donor accounts can make donations." };
  }

  const driveId = formData.get("drive_id") as string;
  const amountRupees = Number(formData.get("amount"));

  if (!driveId) return { error: "Drive not specified." };
  if (!amountRupees || amountRupees < 10) return { error: "Minimum donation is ₹10." };

  const amountPaise = toCents(amountRupees);

  const [{ data: drive }, { data: donorProfile }] = await Promise.all([
    admin
      .from("drives")
      .select("status, target_amount, current_amount, ends_at")
      .eq("id", driveId)
      .single(),
    admin.from("donor_profiles").select("wallet_balance").eq("id", user.id).single(),
  ]);

  // PENDING drives are not approved; everything else (APPROVED/ACTIVE/COMPLETED) can
  // still receive donations — the drive may have been marked COMPLETED by a DB
  // trigger when it hit its target, but per product design it accepts donations
  // (overflow flows to the pot) until the end date.
  if (!drive || drive.status === "PENDING") {
    return { error: "This drive is not accepting donations right now." };
  }
  if (new Date(drive.ends_at) <= new Date()) {
    return { error: "This drive has ended." };
  }

  if (!donorProfile || donorProfile.wallet_balance < amountPaise) {
    return {
      error: `Insufficient balance. You have ${formatCurrency(donorProfile?.wallet_balance ?? 0)} in your wallet.`,
    };
  }

  // Inline the donate_from_wallet RPC — the deployed version references a
  // non-existent column (reference_id). Replicate its logic directly.
  const driveGap = Math.max(0, (drive.target_amount ?? 0) - (drive.current_amount ?? 0));
  const overflow = Math.max(0, amountPaise - driveGap);

  const { error: walletErr } = await admin
    .from("donor_profiles")
    .update({ wallet_balance: donorProfile.wallet_balance - amountPaise })
    .eq("id", user.id);

  if (walletErr) {
    console.error("[donations] wallet deduct failed:", walletErr);
    return { error: "Failed to deduct wallet balance. Please try again." };
  }

  await admin.from("wallet_transactions").insert({
    donor_id: user.id,
    amount: amountPaise,
    type: "DEBIT",
    status: "COMPLETED",
    description: "Donation to drive",
  });

  const { error: donationErr } = await admin.from("donations").insert({
    donor_id: user.id,
    drive_id: driveId,
    amount: amountPaise,
    source: "WALLET",
  });

  if (donationErr) {
    console.error("[donations] insert donation failed:", donationErr);
    return { error: "Donation failed. Please try again." };
  }

  await admin
    .from("drives")
    .update({ current_amount: (drive.current_amount ?? 0) + amountPaise })
    .eq("id", driveId);

  if (overflow > 0) {
    await admin.from("pradaan_pot_ledger").insert({
      amount: overflow,
      type: "INFLOW_OVERFLOW",
      drive_id: driveId,
      description: "Overflow from wallet donation",
    });
  }

  redirect("/donor?donated=success");
}
