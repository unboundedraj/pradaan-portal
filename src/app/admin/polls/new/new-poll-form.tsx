"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { createPoll, type PollState } from "@/app/actions/admin";

export function NewPollForm({ availableBalance }: { availableBalance: number }) {
  const [state, action, pending] = useActionState<PollState, FormData>(
    createPoll,
    null
  );
  const error = state && "error" in state ? state.error : null;

  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length < 6) setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2)
      setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const defaultEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="max-w-xl">
      <Link
        href="/admin/polls"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={13} />
        Back to polls
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
        Create a poll
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Donors vote on how overflow funds from the Pradaan Pot are disbursed.
      </p>

      <form action={action} className="mt-8 flex flex-col gap-5">
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <FieldWrapper id="title" label="Poll title" required>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Where should the Q2 Pradaan Pot go?"
            className={inputCls}
          />
        </FieldWrapper>

        <FieldWrapper id="description" label="Description" required>
          <textarea
            id="description"
            name="description"
            rows={3}
            required
            placeholder="Explain what donors are voting on…"
            className={`${inputCls} resize-none`}
          />
        </FieldWrapper>

        <FieldWrapper
          id="amount"
          label="Amount to disburse (₹)"
          hint={`Available in Pradaan Pot (after active poll commitments): ₹${(availableBalance / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          required
        >
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            step={1}
            required
            placeholder="100000"
            className={inputCls}
          />
        </FieldWrapper>

        <FieldWrapper id="ends_at" label="Voting ends" required>
          <input
            id="ends_at"
            name="ends_at"
            type="date"
            required
            defaultValue={defaultEndsAt}
            className={inputCls}
          />
        </FieldWrapper>

        {/* Dynamic options */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Options{" "}
            <span className="ml-0.5 text-red-500" aria-hidden>
              *
            </span>
          </p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name="option"
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                required
                placeholder={`Option ${i + 1}`}
                className={`${inputCls} flex-1`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="shrink-0 rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-red-600 transition-colors"
                  aria-label="Remove option"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline"
            >
              <Plus size={13} />
              Add option
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? "Creating poll…" : "Create poll"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)]";

function FieldWrapper({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
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
}
