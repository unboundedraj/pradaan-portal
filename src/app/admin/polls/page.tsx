import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";
import type { PollStatus } from "@/types/database";

export const metadata: Metadata = { title: "Polls" };

const STATUS_BADGE: Record<PollStatus, string> = {
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  RESOLVED: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export default async function AdminPollsPage() {
  const admin = await createAdminClient();

  const { data: polls } = await admin
    .from("polls")
    .select("id, title, status, allocated_amount, ends_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Governance polls
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Donors vote on how Pradaan Pot overflow funds are disbursed.
          </p>
        </div>
        <Link
          href="/admin/polls/new"
          className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          New poll
        </Link>
      </div>

      {!polls?.length ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No polls yet. Create the first governance poll.
          </p>
          <Link
            href="/admin/polls/new"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Create poll
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
              {polls.map((poll) => {
                const endsAt = new Date(poll.ends_at).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" }
                );
                return (
                  <tr key={poll.id} className="hover:bg-[var(--muted)]/20">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {poll.title}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {formatCurrency(poll.allocated_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[poll.status]}`}
                      >
                        {poll.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {endsAt}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
