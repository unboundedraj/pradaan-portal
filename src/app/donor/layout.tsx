import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { PollTicker } from "@/components/poll-ticker";

export const metadata: Metadata = { title: { template: "%s | Dashboard", default: "Dashboard" } };

async function getTickerItems(): Promise<string[]> {
  const admin = createAdminClient();

  const { data: resolvedPolls } = await admin
    .from("polls")
    .select("id, title, allocated_amount")
    .eq("status", "RESOLVED")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!resolvedPolls?.length) return [];

  const pollIds = resolvedPolls.map((p) => p.id);

  const [{ data: votes }, { data: options }] = await Promise.all([
    admin.from("poll_votes").select("poll_id, option_id").in("poll_id", pollIds),
    admin.from("poll_options").select("id, poll_id, option_text").in("poll_id", pollIds),
  ]);

  // Count votes per option
  const voteCounts: Record<string, number> = {};
  for (const v of votes ?? []) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
  }

  // Group options by poll
  const optionsByPoll: Record<string, { id: string; option_text: string }[]> = {};
  for (const o of options ?? []) {
    (optionsByPoll[o.poll_id] ??= []).push(o);
  }

  return resolvedPolls.map((poll) => {
    const pollOptions = optionsByPoll[poll.id] ?? [];
    const winner = pollOptions.reduce<{ option_text: string; count: number } | null>(
      (best, opt) => {
        const count = voteCounts[opt.id] ?? 0;
        return !best || count > best.count ? { option_text: opt.option_text, count } : best;
      },
      null
    );
    const totalVotes = pollOptions.reduce((s, o) => s + (voteCounts[o.id] ?? 0), 0);
    const pct =
      winner && totalVotes > 0
        ? Math.round((winner.count / totalVotes) * 100)
        : 0;

    return winner
      ? `${poll.title}: ${winner.option_text} won with ${pct}% of votes`
      : `${poll.title}: no votes cast`;
  });
}

export default async function DonorLayout({ children }: { children: React.ReactNode }) {
  const tickerItems = await getTickerItems();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] p-4">
          <nav className="flex flex-col gap-1 text-sm">
            {[
              { href: "/donor", label: "Wallet" },
              { href: "/donor/donate", label: "Browse drives" },
              { href: "/donor/certificates", label: "Certificates" },
              { href: "/donor/polls", label: "Vote" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>
        <div className="flex-1 p-8">{children}</div>
      </div>
      <PollTicker items={tickerItems} />
    </div>
  );
}
