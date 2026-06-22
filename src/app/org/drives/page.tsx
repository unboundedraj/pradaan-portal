import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";
import type { DriveStatus } from "@/types/database";

export const metadata: Metadata = { title: "My Drives" };

const STATUS_BADGE: Record<DriveStatus, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  COMPLETED: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export default async function OrgDrivesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: drives } = await admin
    .from("drives")
    .select("id, title, status, target_amount, current_amount, ends_at, created_at")
    .eq("org_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          My drives
        </h1>
        <Link
          href="/org/drives/new"
          className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          New drive
        </Link>
      </div>

      {!drives?.length ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No drives yet. Create your first fundraising drive.
          </p>
          <Link
            href="/org/drives/new"
            className="text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Get started
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {drives.map((drive) => {
            const pct = driveProgress(
              drive.current_amount,
              drive.target_amount
            );
            const endsAt = new Date(drive.ends_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <Link
                key={drive.id}
                href={`/org/drives/${drive.id}`}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {drive.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Ends {endsAt}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[drive.status]}`}
                  >
                    {drive.status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                    <span>{formatCurrency(drive.current_amount)} raised</span>
                    <span>
                      {pct}% of {formatCurrency(drive.target_amount)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
