import Link from "next/link";
import { Heart, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  DONOR: "/donor",
  ORGANIZATION: "/org",
  ADMIN: "/admin",
};

const ROLE_LABEL: Record<UserRole, string> = {
  DONOR: "Donor",
  ORGANIZATION: "Organisation",
  ADMIN: "Admin",
};

export async function Navbar() {
  // Read the session server-side so the nav reflects auth state on first paint.
  let userEmail: string | null = null;
  let role: UserRole | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userEmail = user.email ?? null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = (profile as { role: UserRole } | null)?.role ?? null;
    }
  } catch {
    // No valid session — render the public nav.
  }

  const isAuthenticated = !!userEmail;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href={role ? ROLE_HOME[role] : "/"}
          className="flex items-center gap-2 font-semibold text-[var(--foreground)]"
        >
          <Heart
            size={18}
            className="text-[var(--primary)]"
            fill="currentColor"
          />
          <span>Pradaan</span>
        </Link>

        {/* Right-hand controls */}
        <div className="flex items-center gap-3">
          {isAuthenticated && role ? (
            <>
              {/* Role badge */}
              <span className="hidden rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-foreground)] sm:inline-flex">
                {ROLE_LABEL[role]}
              </span>

              {/* Dashboard link */}
              <Link
                href={ROLE_HOME[role]}
                className="hidden text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors sm:block"
              >
                Dashboard
              </Link>

              {/* Sign-out — form wrapping a button so it works without JS */}
              <form action={signOut}>
                <button
                  type="submit"
                  title="Sign out"
                  className="flex items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <nav className="hidden items-center gap-5 text-sm md:flex">
                <Link
                  href="/"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Drives
                </Link>
                <Link
                  href="/login"
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Log in
                </Link>
              </nav>
              <Link
                href="/signup"
                className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
              >
                Get started
              </Link>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
