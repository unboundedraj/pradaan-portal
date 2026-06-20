"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  DONOR: "/donor",
  ORGANIZATION: "/org",
  ADMIN: "/admin",
};

export type AuthState =
  | { error: string }
  | { message: string }
  | null;

/** Converts any Supabase/PostgREST error to a human-readable string. */
function toErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err || fallback;
  if (typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string" && msg.trim() && msg !== "{}") return msg;
  }
  // Log the raw error server-side so it's visible in the terminal.
  console.error("[auth] raw error:", JSON.stringify(err));
  return fallback;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: toErrorMessage(error) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile as { role: UserRole } | null)?.role;
  redirect(role ? ROLE_HOME[role] : "/");
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as UserRole;

  // ADMIN is never self-assignable — only granted via direct DB update.
  if (!email || !password || !role) {
    return { error: "All fields are required." };
  }
  if (role !== "DONOR" && role !== "ORGANIZATION") {
    return { error: "Invalid role." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }/auth/callback`,
    },
  });

  if (authError) return { error: toErrorMessage(authError) };

  const userId = authData.user?.id;
  if (!userId) return { error: "Failed to create account. Please try again." };

  // Use the admin client to write profile data — the user has no session yet
  // when email confirmation is enabled, so the anon client would fail RLS.
  const admin = await createAdminClient();

  // The auth.users INSERT trigger has already created the profiles row.
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (roleError) {
    console.error("[auth] profiles.update failed for", userId, roleError);
    return { error: toErrorMessage(roleError, "Failed to set role. Please contact support.") };
  }

  if (role === "DONOR") {
    const fullName = formData.get("full_name") as string;
    if (!fullName?.trim()) return { error: "Full name is required." };

    const { error: profileError } = await admin
      .from("donor_profiles")
      .insert({ id: userId, full_name: fullName.trim() });

    if (profileError) {
      console.error("[auth] donor_profiles.insert failed:", profileError);
      return { error: toErrorMessage(profileError, "Failed to create donor profile.") };
    }
  } else if (role === "ORGANIZATION") {
    const orgName = formData.get("org_name") as string;
    const description = formData.get("description") as string;
    const website = (formData.get("website") as string) || null;

    if (!orgName?.trim() || !description?.trim()) {
      return { error: "Organisation name and description are required." };
    }

    const { error: profileError } = await admin.from("org_profiles").insert({
      id: userId,
      org_name: orgName.trim(),
      description: description.trim(),
      website: website || null,
    });

    if (profileError) {
      console.error("[auth] org_profiles.insert failed:", profileError);
      return { error: toErrorMessage(profileError, "Failed to create organisation profile.") };
    }
  }

  // Email confirmation disabled in Supabase — session is immediately available.
  if (authData.session) {
    redirect(ROLE_HOME[role]);
  }

  // Email confirmation required — tell the user to check their inbox.
  return {
    message:
      "Account created! Check your email and click the confirmation link before logging in.",
  };
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
