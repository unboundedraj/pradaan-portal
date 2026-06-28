"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type VoteState = { error: string } | { success: true } | null;

export async function castVote(
  _prevState: VoteState,
  formData: FormData
): Promise<VoteState> {
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
    return { error: "Only donor accounts can vote." };
  }

  const pollId = formData.get("poll_id") as string;
  const optionId = formData.get("option_id") as string;

  if (!pollId || !optionId) return { error: "Invalid vote submission." };

  const { data: poll } = await admin
    .from("polls")
    .select("status")
    .eq("id", pollId)
    .single();

  if (!poll || poll.status !== "ACTIVE") {
    return { error: "This poll is no longer accepting votes." };
  }

  const { error } = await admin
    .from("poll_votes")
    .insert({ poll_id: pollId, user_id: user.id, option_id: optionId });

  if (error) {
    if (error.code === "23505") return { error: "You have already voted on this poll." };
    console.error("[castVote] failed:", error);
    return { error: "Failed to record your vote. Please try again." };
  }

  // Keep the denormalized counter in sync (best-effort — display uses poll_votes directly).
  const { data: opt } = await admin
    .from("poll_options")
    .select("votes_count")
    .eq("id", optionId)
    .single();

  if (opt) {
    await admin
      .from("poll_options")
      .update({ votes_count: opt.votes_count + 1 })
      .eq("id", optionId);
  }

  revalidatePath("/donor/polls");
  return { success: true };
}
