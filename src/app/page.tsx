import Link from "next/link";
import { Heart } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";

export default async function HomePage() {
  const admin = createAdminClient();

  const { data: drives } = await admin
    .from("drives")
    .select("id, title, description, target_amount, current_amount, ends_at, org_id")
    .in("status", ["APPROVED", "ACTIVE"])
    .order("created_at", { ascending: false });

  const orgIds = [...new Set((drives ?? []).map((d) => d.org_id))];
  const { data: orgProfiles } = orgIds.length
    ? await admin.from("org_profiles").select("id, org_name").in("id", orgIds)
    : { data: [] };

  const orgNameById = Object.fromEntries(
    (orgProfiles ?? []).map((o) => [o.id, o.org_name])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-foreground)]">
          Community-powered giving
        </span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Every rupee gives.
          <br />
          Every vote steers.
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted-foreground)]">
          Pradaan is a transparent donation platform where funds that overflow
          past a drive&apos;s goal flow into a community pot — governed by your
          vote.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Start donating
          </Link>
          <a
            href="#drives"
            className="rounded-md border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Browse drives
          </a>
        </div>
      </div>

      {/* Drive listing */}
      <section id="drives" className="mt-24">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          Active drives
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {drives?.length
            ? `${drives.length} drive${drives.length === 1 ? "" : "s"} currently raising funds`
            : "No active drives at the moment — check back soon."}
        </p>

        {drives && drives.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {drives.map((drive) => {
              const pct = driveProgress(
                drive.current_amount,
                drive.target_amount
              );
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(drive.ends_at).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              );

              return (
                <Link
                  key={drive.id}
                  href={`/drives/${drive.id}`}
                  className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--primary)] hover:shadow-sm"
                >
                  {/* Org name */}
                  <p className="text-xs font-medium text-[var(--primary)]">
                    {orgNameById[drive.org_id] ?? "Organisation"}
                  </p>

                  {/* Title */}
                  <h3 className="mt-1.5 line-clamp-2 text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {drive.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--muted-foreground)]">
                    {drive.description}
                  </p>

                  {/* Progress */}
                  <div className="mt-5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                      <span>
                        <span className="font-medium text-[var(--foreground)]">
                          {formatCurrency(drive.current_amount)}
                        </span>{" "}
                        raised
                      </span>
                      <span>{daysLeft}d left · {pct}%</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer nudge */}
      <div className="mt-24 flex flex-col items-center gap-3 text-center">
        <Heart size={20} className="text-[var(--primary)]" fill="currentColor" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Overflow funds go into the Pradaan Pot — voted on by the community.
        </p>
        <Link
          href="/signup"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Join and vote →
        </Link>
      </div>
    </div>
  );
}
