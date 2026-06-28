"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { toCents, formatCurrency } from "@/lib/money";

/** Returns the caller's user ID only when they hold the ADMIN role, null otherwise. */
async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await createAdminClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (data?.role !== "ADMIN") {
    console.warn("[admin] unauthorized action attempt by user", user.id, "role:", data?.role);
    return null;
  }
  return user.id;
}

// Bound arg comes before FormData: verifyOrg.bind(null, orgId) → verifyOrg(orgId, formData)
export async function verifyOrg(orgId: string, _formData: FormData) {
  if (!(await requireAdmin())) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ is_verified: true }).eq("id", orgId);
  revalidatePath("/admin/orgs");
}

export async function approveDrive(driveId: string, _formData: FormData) {
  if (!(await requireAdmin())) return;

  const admin = createAdminClient();
  await admin
    .from("drives")
    .update({ status: "APPROVED" })
    .eq("id", driveId);
  revalidatePath("/admin/drives");
}

// ─── Create Poll ───────────────────────────────────────────────────────────────

export type PollState = { error: string } | null;

export async function createPoll(
  _prevState: PollState,
  formData: FormData
): Promise<PollState> {
  const callerId = await requireAdmin();
  if (!callerId) return { error: "Unauthorized." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const amountRupees = Number(formData.get("amount"));
  const endsAt = formData.get("ends_at") as string;
  const options = (formData.getAll("option") as string[])
    .map((o) => o.trim())
    .filter(Boolean);

  if (!title || !description || !amountRupees || !endsAt) {
    return { error: "All fields are required." };
  }
  if (amountRupees <= 0) return { error: "Amount must be positive." };
  if (options.length < 2) return { error: "At least 2 options are required." };

  const endsAtDate = new Date(endsAt);
  if (isNaN(endsAtDate.getTime()) || endsAtDate <= new Date()) {
    return { error: "End date must be in the future." };
  }

  const admin = createAdminClient();

  // Validate against available pot balance (pot total − active poll commitments)
  const [{ data: ledger }, { data: activePolls }] = await Promise.all([
    admin.from("pradaan_pot_ledger").select("type, amount"),
    admin.from("polls").select("allocated_amount").eq("status", "ACTIVE"),
  ]);
  const potBalance = (ledger ?? []).reduce(
    (s, e) => (e.type === "INFLOW_OVERFLOW" ? s + e.amount : s - e.amount),
    0
  );
  const committed = (activePolls ?? []).reduce((s, p) => s + p.allocated_amount, 0);
  const available = potBalance - committed;
  if (toCents(amountRupees) > available) {
    return {
      error: `Amount exceeds available Pradaan Pot balance. Available: ${formatCurrency(available)} (after active poll commitments).`,
    };
  }

  const { data: poll, error: pollError } = await admin
    .from("polls")
    .insert({
      title,
      description,
      allocated_amount: toCents(amountRupees),
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (pollError) {
    console.error("[admin] polls.insert failed:", pollError);
    return { error: "Failed to create poll. Please try again." };
  }

  const { error: optionsError } = await admin
    .from("poll_options")
    .insert(options.map((option_text) => ({ poll_id: poll.id, option_text })));

  if (optionsError) {
    console.error("[admin] poll_options.insert failed:", optionsError);
    return { error: "Poll created but failed to save options." };
  }

  revalidatePath("/admin/polls");
  redirect("/admin/polls");
}

// ─── Resolve Poll ──────────────────────────────────────────────────────────────

export async function resolvePoll(pollId: string, _formData: FormData) {
  if (!(await requireAdmin())) return;

  const admin = createAdminClient();
  const { data: poll } = await admin
    .from("polls")
    .select("status, allocated_amount, title")
    .eq("id", pollId)
    .single();

  if (!poll || poll.status !== "ACTIVE") return;

  await admin.from("polls").update({ status: "RESOLVED" }).eq("id", pollId);

  await admin.from("pradaan_pot_ledger").insert({
    type: "OUTFLOW_POLL",
    amount: poll.allocated_amount,
    description: poll.title,
  });

  revalidatePath("/admin/polls");
}

// ─── Helpers (exported for use in server components) ─────────────────────────

export async function getAvailablePotBalance(): Promise<number> {
  const admin = createAdminClient();
  const [{ data: ledger }, { data: activePolls }] = await Promise.all([
    admin.from("pradaan_pot_ledger").select("type, amount"),
    admin.from("polls").select("allocated_amount").eq("status", "ACTIVE"),
  ]);
  const potBalance = (ledger ?? []).reduce(
    (s, e) => (e.type === "INFLOW_OVERFLOW" ? s + e.amount : s - e.amount),
    0
  );
  const committed = (activePolls ?? []).reduce((s, p) => s + p.allocated_amount, 0);
  return potBalance - committed;
}
