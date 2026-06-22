"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { toCents } from "@/lib/money";

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

  const { data: poll, error: pollError } = await admin
    .from("polls")
    .insert({
      title,
      description,
      amount: toCents(amountRupees),
      created_by: callerId,
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
    .insert(options.map((label) => ({ poll_id: poll.id, label })));

  if (optionsError) {
    console.error("[admin] poll_options.insert failed:", optionsError);
    return { error: "Poll created but failed to save options." };
  }

  revalidatePath("/admin/polls");
  redirect("/admin/polls");
}
