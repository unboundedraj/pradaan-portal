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
    .select("title, status")
    .eq("id", driveId)
    .single();

  if (!drive || !["APPROVED", "ACTIVE"].includes(drive.status)) {
    return { error: "This drive is not accepting donations right now." };
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
    admin.from("drives").select("status").eq("id", driveId).single(),
    admin.from("donor_profiles").select("wallet_balance").eq("id", user.id).single(),
  ]);

  if (!drive || !["APPROVED", "ACTIVE"].includes(drive.status)) {
    return { error: "This drive is not accepting donations right now." };
  }

  if (!donorProfile || donorProfile.wallet_balance < amountPaise) {
    return {
      error: `Insufficient balance. You have ${formatCurrency(donorProfile?.wallet_balance ?? 0)} in your wallet.`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).rpc("donate_from_wallet", {
    p_donor_id: user.id,
    p_drive_id: driveId,
    p_amount: amountPaise,
  });

  if (error) {
    console.error("[donations] donate_from_wallet failed:", error);
    if (error.message?.includes("Insufficient"))
      return { error: "Insufficient wallet balance." };
    return { error: "Donation failed. Please try again." };
  }

  redirect("/donor?donated=success");
}
