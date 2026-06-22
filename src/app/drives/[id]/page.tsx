import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";
import { DonateForm } from "./donate-form";
import type { UserRole } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("drives").select("title").eq("id", id).single();
  return { title: data?.title ?? "Drive" };
}

export default async function DriveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: drive } = await admin
    .from("drives")
    .select("*")
    .eq("id", id)
    .in("status", ["APPROVED", "ACTIVE", "COMPLETED"])
    .single();

  if (!drive) notFound();

  const { data: orgProfile } = await admin
    .from("org_profiles")
    .select("org_name")
    .eq("id", drive.org_id)
    .single();

  // Check auth to decide whether to show the donate form
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let donorRole: UserRole | null = null;
  let walletBalance = 0;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    donorRole = (profile as { role: UserRole } | null)?.role ?? null;

    if (donorRole === "DONOR") {
      const { data: donorProfile } = await admin
        .from("donor_profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();
      walletBalance = donorProfile?.wallet_balance ?? 0;
    }
  }

  const isDonor = donorRole === "DONOR";
  const isAcceptingDonations = ["APPROVED", "ACTIVE"].includes(drive.status);

  const pct = driveProgress(drive.current_amount, drive.target_amount);
  const endsAt = new Date(drive.ends_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(drive.ends_at).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={13} />
        All drives
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Left — drive info */}
        <div>
          <p className="text-sm font-medium text-[var(--primary)]">
            {orgProfile?.org_name ?? "Organisation"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--foreground)]">
            {drive.title}
          </h1>
          <p className="mt-4 leading-relaxed text-[var(--muted-foreground)]">
            {drive.description}
          </p>

          {/* Progress */}
          <div className="mt-8">
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-[var(--foreground)]">
                {formatCurrency(drive.current_amount)}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                of {formatCurrency(drive.target_amount)} goal
              </p>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex gap-6 text-sm text-[var(--muted-foreground)]">
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {pct}%
                </span>{" "}
                funded
              </span>
              <span>
                <span className="font-medium text-[var(--foreground)]">
                  {daysLeft}
                </span>{" "}
                days left
              </span>
              <span>Ends {endsAt}</span>
            </div>
          </div>
        </div>

        {/* Right — donation panel */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 lg:self-start">
          {drive.status === "COMPLETED" ? (
            <div className="text-center">
              <p className="font-semibold text-[var(--foreground)]">
                Drive completed
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                This drive has finished raising funds. Thank you to all donors!
              </p>
            </div>
          ) : !isAcceptingDonations ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              This drive is not yet accepting donations.
            </p>
          ) : isDonor ? (
            <>
              <h2 className="mb-4 font-semibold text-[var(--foreground)]">
                Make a donation
              </h2>
              <DonateForm driveId={drive.id} walletBalance={walletBalance} />
            </>
          ) : user ? (
            <div className="text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                Only donor accounts can donate. You&apos;re logged in as{" "}
                <span className="font-medium">{donorRole}</span>.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                Sign in or create a donor account to contribute.
              </p>
              <Link
                href={`/login?redirectTo=/drives/${drive.id}`}
                className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-semibold text-[var(--primary-foreground)] text-center hover:opacity-90 transition-opacity"
              >
                Log in to donate
              </Link>
              <Link
                href="/signup"
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Create an account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
