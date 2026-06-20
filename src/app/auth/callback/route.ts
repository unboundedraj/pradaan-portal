import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  DONOR: "/donor",
  ORGANIZATION: "/org",
  ADMIN: "/admin",
};

/**
 * Handles the Supabase email-confirmation redirect.
 * Supabase sends the user here after they click the link in their inbox:
 *   /auth/callback?code=XXXXXXXX
 *
 * We exchange the one-time code for a session, then forward the user to
 * their role-appropriate dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = (profile as { role: UserRole } | null)?.role;
        const destination = role ? ROLE_HOME[role] : "/";
        return NextResponse.redirect(new URL(destination, origin));
      }
    }
  }

  // Code missing or exchange failed — send to login with a flag.
  return NextResponse.redirect(
    new URL("/login?error=confirmation_failed", origin)
  );
}
