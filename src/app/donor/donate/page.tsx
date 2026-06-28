import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";

export const metadata: Metadata = { title: "Browse drives" };

export default async function DonorBrowsePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const [{ data: drives }, { data: orgProfiles }, { data: donorProfile }] =
    await Promise.all([
      admin
        .from("drives")
        .select("id, title, description, target_amount, current_amount, ends_at, org_id")
        .in("status", ["APPROVED", "ACTIVE", "COMPLETED"])
        .order("created_at", { ascending: false }),
      admin.from("org_profiles").select("id, org_name"),
      user
        ? admin
            .from("donor_profiles")
            .select("wallet_balance")
            .eq("id", user.id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  const orgNameById = Object.fromEntries(
    (orgProfiles ?? []).map((o) => [o.id, o.org_name])
  );

  const now = Date.now();
  const active = (drives ?? []).filter(
    (d) => new Date(d.ends_at).getTime() > now
  );
  const ended = (drives ?? []).filter(
    (d) => new Date(d.ends_at).getTime() <= now
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Browse drives
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Click any drive to donate via card or your wallet balance.
          </p>
        </div>
        {donorProfile && (
          <div className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-right">
            <p className="text-xs text-[var(--muted-foreground)]">Wallet balance</p>
            <p className="text-base font-semibold text-[var(--foreground)]">
              {formatCurrency(donorProfile.wallet_balance ?? 0)}
            </p>
          </div>
        )}
      </div>

      {active.length === 0 && ended.length === 0 ? (
        <p className="mt-10 text-sm text-[var(--muted-foreground)]">
          No drives available right now — check back soon.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Active · {active.length}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {active.map((drive) => {
                  const pct = driveProgress(drive.current_amount, drive.target_amount);
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((new Date(drive.ends_at).getTime() - now) / (1000 * 60 * 60 * 24))
                  );
                  const overGoal = drive.current_amount >= drive.target_amount;
                  return (
                    <Link
                      key={drive.id}
                      href={`/drives/${drive.id}`}
                      className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--primary)] hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-[var(--primary)]">
                          {orgNameById[drive.org_id] ?? "Organisation"}
                        </p>
                        {overGoal && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            Goal reached
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                        {drive.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 flex-1 text-xs text-[var(--muted-foreground)]">
                        {drive.description}
                      </p>
                      <div className="mt-4">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--primary)] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                          <span>
                            <span className="font-medium text-[var(--foreground)]">
                              {formatCurrency(drive.current_amount)}
                            </span>{" "}
                            of {formatCurrency(drive.target_amount)}
                          </span>
                          <span>{daysLeft}d left</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {ended.length > 0 && (
            <section className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Past drives · {ended.length}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {ended.map((drive) => {
                  const pct = driveProgress(drive.current_amount, drive.target_amount);
                  return (
                    <div
                      key={drive.id}
                      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 opacity-60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-[var(--primary)]">
                          {orgNameById[drive.org_id] ?? "Organisation"}
                        </p>
                        <span className="shrink-0 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Drive ended
                        </span>
                      </div>
                      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                        {drive.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 flex-1 text-xs text-[var(--muted-foreground)]">
                        {drive.description}
                      </p>
                      <div className="mt-4">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--primary)] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                          <span>
                            <span className="font-medium text-[var(--foreground)]">
                              {formatCurrency(drive.current_amount)}
                            </span>{" "}
                            of {formatCurrency(drive.target_amount)}
                          </span>
                          <span>{pct}% funded</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
