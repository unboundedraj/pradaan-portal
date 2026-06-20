"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";
import { signIn, type AuthState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signIn,
    null
  );

  const error =
    state && "error" in state ? state.error : null;

  // Show a confirmation-failed banner if redirected from callback
  const urlError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error")
      : null;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]">
            <Heart size={20} className="text-[var(--primary)]" fill="currentColor" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Sign in to your Pradaan account
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {/* Error banners */}
          {urlError === "confirmation_failed" && (
            <Banner variant="error">
              Email confirmation failed. Please try signing up again.
            </Banner>
          )}
          {error && <Banner variant="error">{error}</Banner>}

          <form action={action} className="flex flex-col gap-4">
            <Field
              id="email"
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={pending}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && <Loader2 size={14} className="animate-spin" />}
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-[var(--muted-foreground)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--primary)] hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[var(--foreground)]"
      >
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
      />
    </div>
  );
}

function Banner({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    variant === "error"
      ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400"
      : "bg-[var(--accent)] text-[var(--accent-foreground)]";
  return (
    <div className={`mb-4 rounded-md px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}
