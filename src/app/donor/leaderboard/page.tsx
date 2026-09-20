import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";

export const metadata: Metadata = { title: "Leaderboard" };

const MEDALS = ["🥇", "🥈", "🥉"];
const TOP_N = 15;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data: donations } = await admin
    .from("pradaan_donations")
    .select("donor_id, drive_id, amount");

  // Aggregate total given + distinct drives supported, per donor
  const totalsById: Record<string, number> = {};
  const driveSetById: Record<string, Set<string>> = {};
  for (const d of donations ?? []) {
    totalsById[d.donor_id] = (totalsById[d.donor_id] ?? 0) + d.amount;
    (driveSetById[d.donor_id] ??= new Set()).add(d.drive_id);
  }

  const rankedIds = Object.entries(totalsById)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const { data: donorProfiles } = rankedIds.length
    ? await admin.from("pradaan_donor_profiles").select("id, full_name").in("id", rankedIds)
    : { data: [] };

  const nameById = Object.fromEntries(
    (donorProfiles ?? []).map((d) => [d.id, d.full_name])
  );

  const leaderboard = rankedIds.map((donorId, i) => ({
    rank: i + 1,
    donorId,
    name: nameById[donorId] ?? "Anonymous",
    total: totalsById[donorId],
    driveCount: driveSetById[donorId]?.size ?? 0,
  }));

  const top = leaderboard.slice(0, TOP_N);
  const ownEntry = user
    ? leaderboard.find((e) => e.donorId === user.id)
    : undefined;
  const ownInTop = !!ownEntry && ownEntry.rank <= TOP_N;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Trophy size={20} className="text-[var(--primary)]" />
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Leaderboard
        </h1>
      </div>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Top donors by total contribution, across every drive.
      </p>

      {!top.length ? (
        <p className="mt-8 text-sm text-[var(--muted-foreground)]">
          No donations yet — be the first to give and claim the top spot.
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)]">
          {top.map((entry, i) => {
            const isSelf = user?.id === entry.donorId;
            return (
              <LeaderboardRow
                key={entry.donorId}
                rank={entry.rank}
                name={entry.name}
                total={entry.total}
                driveCount={entry.driveCount}
                medal={MEDALS[i]}
                isSelf={isSelf}
                highlight={isSelf || i === 0}
                bordered={i < top.length - 1}
              />
            );
          })}
        </div>
      )}

      {/* Own rank, shown separately when outside the visible top N */}
      {ownEntry && !ownInTop && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
          <LeaderboardRow
            rank={ownEntry.rank}
            name={ownEntry.name}
            total={ownEntry.total}
            driveCount={ownEntry.driveCount}
            isSelf
            highlight
            bordered={false}
          />
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  rank,
  name,
  total,
  driveCount,
  medal,
  isSelf,
  highlight,
  bordered,
}: {
  rank: number;
  name: string;
  total: number;
  driveCount: number;
  medal?: string;
  isSelf?: boolean;
  highlight?: boolean;
  bordered: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 text-sm ${
        bordered ? "border-b border-[var(--border)]" : ""
      } ${highlight ? "bg-[var(--primary)]/5" : "bg-[var(--card)]"}`}
    >
      <span className="w-7 shrink-0 text-center text-base">
        {medal ?? (
          <span className="text-xs text-[var(--muted-foreground)]">
            {rank}
          </span>
        )}
      </span>
      <span className="flex-1">
        <span className="font-medium text-[var(--foreground)]">
          {name}
          {isSelf && (
            <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-foreground)]">
              You
            </span>
          )}
        </span>
        <span className="block text-xs text-[var(--muted-foreground)]">
          {driveCount} drive{driveCount === 1 ? "" : "s"} supported
        </span>
      </span>
      <span className="font-semibold text-[var(--foreground)]">
        {formatCurrency(total)}
      </span>
    </div>
  );
}
