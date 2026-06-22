import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";
import type { DriveStatus } from "@/types/database";

export const metadata: Metadata = { title: "Drive Detail" };

const STATUS_BADGE: Record<DriveStatus, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  APPROVED: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  COMPLETED: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export default async function DriveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: drive } = await admin
    .from("drives")
    .select("*")
    .eq("id", id)
    .eq("org_id", user!.id) // scoped to this org — prevents peeking at other orgs' drives
    .single();

  if (!drive) notFound();

  const pct = driveProgress(drive.current_amount, drive.target_amount);
  const endsAt = new Date(drive.ends_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const createdAt = new Date(drive.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl">
      <Link
        href="/org/drives"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={13} />
        Back to drives
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          {drive.title}
        </h1>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[drive.status]}`}
        >
          {drive.status}
        </span>
      </div>

      {drive.status === "PENDING" && (
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
          This drive is awaiting Admin approval before it goes live.
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {drive.description}
      </p>

      {/* Progress */}
      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex justify-between text-sm">
          <span className="text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(drive.current_amount)}
          </span>
          <span className="text-[var(--muted-foreground)]">
            of {formatCurrency(drive.target_amount)} goal
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          {pct}% funded
        </p>
      </div>

      {/* Meta */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <MetaItem label="End date" value={endsAt} />
        <MetaItem label="Created" value={createdAt} />
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
