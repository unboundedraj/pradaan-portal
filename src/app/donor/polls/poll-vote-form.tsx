"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { castVote, type VoteState } from "@/app/actions/polls";
export function PollVoteForm({
  pollId,
  options,
  voteCounts,
  myOptionId,
  isActive,
}: {
  pollId: string;
  options: { id: string; option_text: string }[];
  voteCounts: Record<string, number>;
  myOptionId: string | null;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState<VoteState, FormData>(
    castVote,
    null
  );
  const [selected, setSelected] = useState<string>("");

  const error = state && "error" in state ? state.error : null;
  const voted = myOptionId !== null;
  const totalVotes = options.reduce((s, o) => s + (voteCounts[o.id] ?? 0), 0);

  // After a successful vote the page revalidates — by then myOptionId will
  // be set server-side. While waiting for the revalidation, treat success as voted.
  const showResults = voted || !isActive || (state && "success" in state);

  if (showResults) {
    return (
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const count = voteCounts[opt.id] ?? 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = opt.id === myOptionId;

          return (
            <div key={opt.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`flex items-center gap-1.5 font-medium ${
                    isMyVote
                      ? "text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {isMyVote && <CheckCircle2 size={13} className="shrink-0" />}
                  {opt.option_text}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {pct}% · {count} vote{count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    isMyVote ? "bg-[var(--primary)]" : "bg-[var(--muted-foreground)]/40"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
          {voted && " · Your vote has been recorded"}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="poll_id" value={pollId} />

      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label
            key={opt.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
              selected === opt.id
                ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/50"
            }`}
          >
            <input
              type="radio"
              name="option_id"
              value={opt.id}
              checked={selected === opt.id}
              onChange={() => setSelected(opt.id)}
              className="accent-[var(--primary)]"
            />
            {opt.option_text}
          </label>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !selected}
        className="flex h-9 items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <Loader2 size={13} className="animate-spin" />}
        {pending ? "Submitting…" : "Cast vote"}
      </button>
    </form>
  );
}
