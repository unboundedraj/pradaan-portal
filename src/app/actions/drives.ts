"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { toCents } from "@/lib/money";
import type { UserRole } from "@/types/database";

export type DriveState = { error: string } | null;

export async function createDrive(
  _prevState: DriveState,
  formData: FormData
): Promise<DriveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify caller is an org — use admin client so RLS doesn't block the read.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role: UserRole } | null)?.role !== "ORGANIZATION") {
    return { error: "Only organisations can create drives." };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const targetRupees = Number(formData.get("target_amount"));
  const endsAt = formData.get("ends_at") as string;

  if (!title || !description || !targetRupees || !endsAt) {
    return { error: "All fields are required." };
  }
  if (targetRupees <= 0) return { error: "Target amount must be positive." };

  const endsAtDate = new Date(endsAt);
  if (isNaN(endsAtDate.getTime()) || endsAtDate <= new Date()) {
    return { error: "End date must be in the future." };
  }

  const { data: drive, error } = await admin
    .from("drives")
    .insert({
      org_id: user.id,
      title,
      description,
      target_amount: toCents(targetRupees),
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[drives] insert failed:", error);
    return { error: "Failed to create drive. Please try again." };
  }

  revalidatePath("/org/drives");
  redirect(`/org/drives/${drive.id}`);
}
