import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";
import { PollVoteForm } from "./poll-vote-form";
import type { PollStatus } from "@/types/database";

export const metadata: Metadata = { title: "Vote" };

const STATUS_BADGE: Record<PollStatus, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  RESOLVED: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export default async function DonorPollsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: polls } = await admin
    .from("polls")
    .select("id, title, description, allocated_amount, status, ends_at")
    .order("created_at", { ascending: false });

  const pollIds = (polls ?? []).map((p) => p.id);

  const [{ data: pollOptions }, { data: allVotes }] = await Promise.all([
    pollIds.length
      ? admin
          .from("poll_options")
          .select("id, poll_id, option_text")
          .in("poll_id", pollIds)
      : Promise.resolve({ data: [] }),
    pollIds.length
      ? admin
          .from("poll_votes")
          .select("poll_id, option_id, user_id")
          .in("poll_id", pollIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Group options by poll
  const optionsByPoll: Record<string, { id: string; option_text: string }[]> = {};
  for (const opt of pollOptions ?? []) {
    (optionsByPoll[opt.poll_id] ??= []).push({ id: opt.id, option_text: opt.option_text });
  }

  // Build vote count map: option_id → count
  const voteCounts: Record<string, number> = {};
  // Build my vote map: poll_id → option_id
  const myVoteByPoll: Record<string, string> = {};

  for (const vote of allVotes ?? []) {
    voteCounts[vote.option_id] = (voteCounts[vote.option_id] ?? 0) + 1;
    if (vote.user_id === user!.id) {
      myVoteByPoll[vote.poll_id] = vote.option_id;
    }
  }

  const activePolls = (polls ?? []).filter((p) => p.status === "ACTIVE");
  const resolvedPolls = (polls ?? []).filter((p) => p.status === "RESOLVED");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Governance polls
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Vote on how overflow funds from the Pradaan Pot are disbursed to
        organisations. One vote per poll.
      </p>

      {!polls?.length ? (
        <div className="mt-16 text-center text-sm text-[var(--muted-foreground)]">
          No polls yet — check back when the admin creates one.
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {/* Active polls first */}
          {activePolls.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Open for voting
              </h2>
              <div className="flex flex-col gap-4">
                {activePolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    options={optionsByPoll[poll.id] ?? []}
                    voteCounts={voteCounts}
                    myOptionId={myVoteByPoll[poll.id] ?? null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Resolved polls */}
          {resolvedPolls.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Resolved
              </h2>
              <div className="flex flex-col gap-4">
                {resolvedPolls.map((poll) => (
                  <PollCard
                    key={poll.id}
                    poll={poll}
                    options={optionsByPoll[poll.id] ?? []}
                    voteCounts={voteCounts}
                    myOptionId={myVoteByPoll[poll.id] ?? null}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PollCard({
  poll,
  options,
  voteCounts,
  myOptionId,
}: {
  poll: {
    id: string;
    title: string;
    description: string;
    allocated_amount: number;
    status: PollStatus;
    ends_at: string;
  };
  options: { id: string; option_text: string }[];
  voteCounts: Record<string, number>;
  myOptionId: string | null;
}) {
  const endsAt = new Date(poll.ends_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const isActive = poll.status === "ACTIVE";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[poll.status]}`}
            >
              {poll.status}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {isActive ? `Ends ${endsAt}` : `Ended ${endsAt}`}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">
            {poll.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {poll.description}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-[var(--muted-foreground)]">Funds at stake</p>
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {formatCurrency(poll.allocated_amount)}
          </p>
        </div>
      </div>

      {/* Options / results */}
      <div className="mt-5">
        <PollVoteForm
          pollId={poll.id}
          options={options}
          voteCounts={voteCounts}
          myOptionId={myOptionId}
          isActive={isActive}
        />
      </div>
    </div>
  );
}
