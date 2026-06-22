import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";
import { approveDrive } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Drives" };

export default async function AdminDrivesPage() {
  const admin = await createAdminClient();

  const { data: drives } = await admin
    .from("drives")
    .select("id, org_id, title, description, target_amount, ends_at, created_at")
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  const orgIds = [...new Set((drives ?? []).map((d) => d.org_id))];
  const { data: orgProfiles } = orgIds.length
    ? await admin
        .from("org_profiles")
        .select("id, org_name")
        .in("id", orgIds)
    : { data: [] };

  const orgNameById = Object.fromEntries(
    (orgProfiles ?? []).map((o) => [o.id, o.org_name])
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Drives
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Approve pending drives to make them publicly visible.
      </p>

      {!drives?.length ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No drives pending approval.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {drives.map((drive) => {
            const approveWithId = approveDrive.bind(null, drive.id);
            const endsAt = new Date(drive.ends_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const submitted = new Date(drive.created_at).toLocaleDateString(
              "en-IN",
              { day: "numeric", month: "short", year: "numeric" }
            );

            return (
              <div
                key={drive.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)]">
                      {drive.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      By {orgNameById[drive.org_id] ?? "Unknown org"} ·
                      Submitted {submitted}
                    </p>
                  </div>
                  <form action={approveWithId} className="shrink-0">
                    <button
                      type="submit"
                      className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                    >
                      Approve
                    </button>
                  </form>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] line-clamp-2">
                  {drive.description}
                </p>

                <div className="mt-4 flex gap-6 text-xs text-[var(--muted-foreground)]">
                  <span>
                    Goal:{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrency(drive.target_amount)}
                    </span>
                  </span>
                  <span>
                    Ends:{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {endsAt}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
