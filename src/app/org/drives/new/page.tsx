"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createDrive, type DriveState } from "@/app/actions/drives";

export default function NewDrivePage() {
  const [state, action, pending] = useActionState<DriveState, FormData>(
    createDrive,
    null
  );
  const error = state && "error" in state ? state.error : null;

  // Set default ends_at to 30 days from today (ISO date string for input[type=date])
  const defaultEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="max-w-xl">
      <Link
        href="/org/drives"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={13} />
        Back to drives
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
        Create a drive
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Submit for Admin review. Once approved, your drive will be live.
      </p>

      <form action={action} className="mt-8 flex flex-col gap-5">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <Field id="title" name="title" label="Drive title" required>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Clean Water for Rajasthan Villages"
            className={inputCls}
          />
        </Field>

        <Field
          id="description"
          name="description"
          label="Description"
          required
        >
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            placeholder="Describe what the funds will be used for…"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field
          id="target_amount"
          name="target_amount"
          label="Fundraising goal (₹)"
          hint="Enter amount in rupees (e.g. 50000 = ₹50,000)"
          required
        >
          <input
            id="target_amount"
            name="target_amount"
            type="number"
            min={1}
            step={1}
            required
            placeholder="50000"
            className={inputCls}
          />
        </Field>

        <Field id="ends_at" name="ends_at" label="End date" required>
          <input
            id="ends_at"
            name="ends_at"
            type="date"
            required
            defaultValue={defaultEndsAt}
            className={inputCls}
          />
        </Field>

        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)]";

function Field({
  id,
  name,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[var(--foreground)]"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      )}
    </div>
  );
  void name; // used on children via name attribute
}
