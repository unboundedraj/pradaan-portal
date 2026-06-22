import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";

export const metadata: Metadata = { title: "Overview" };

export default async function OrgOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const [{ data: profile }, { data: drives }] = await Promise.all([
    admin
      .from("org_profiles")
      .select("org_name")
      .eq("id", user!.id)
      .single(),
    admin
      .from("drives")
      .select("id, status, current_amount, target_amount")
      .eq("org_id", user!.id),
  ]);

  const allDrives = drives ?? [];
  const active = allDrives.filter(
    (d) => d.status === "APPROVED" || d.status === "ACTIVE"
  );
  const pending = allDrives.filter((d) => d.status === "PENDING");
  const completed = allDrives.filter((d) => d.status === "COMPLETED");
  const totalRaised = allDrives.reduce((sum, d) => sum + d.current_amount, 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Welcome back
        {profile?.org_name ? `, ${profile.org_name}` : ""}
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Here's how your drives are performing.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active drives" value={active.length} />
        <StatCard label="Pending approval" value={pending.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard label="Total raised" value={formatCurrency(totalRaised)} />
      </div>

      {active.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">
            Active drives
          </h2>
          <div className="flex flex-col gap-3">
            {active.map((d) => {
              const pct = driveProgress(d.current_amount, d.target_amount);
              return (
                <a
                  key={d.id}
                  href={`/org/drives/${d.id}`}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-colors"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrency(d.current_amount)}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      of {formatCurrency(d.target_amount)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
