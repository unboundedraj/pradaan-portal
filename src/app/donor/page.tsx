import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";

export const metadata: Metadata = { title: "Wallet" };

export default async function DonorWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ donated?: string; topup?: string }>;
}) {
  const { donated, topup } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const [{ data: donorProfile }, { data: donations }] = await Promise.all([
    admin
      .from("donor_profiles")
      .select("full_name, wallet_balance")
      .eq("id", user!.id)
      .single(),
    admin
      .from("donations")
      .select("id, amount, source, created_at, drive_id")
      .eq("donor_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Fetch drive titles for the donation history
  const driveIds = [...new Set((donations ?? []).map((d) => d.drive_id))];
  const { data: drives } = driveIds.length
    ? await admin
        .from("drives")
        .select("id, title")
        .in("id", driveIds)
    : { data: [] };

  const driveTitleById = Object.fromEntries(
    (drives ?? []).map((d) => [d.id, d.title])
  );

  const totalDonated = (donations ?? []).reduce(
    (sum, d) => sum + d.amount,
    0
  );

  return (
    <div>
      {/* Post-payment success banners */}
      {(donated === "success" || topup === "success") && (
        <div className="mb-6 flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <CheckCircle2 size={16} />
          {donated === "success"
            ? "Donation received! Thank you for giving."
            : "Wallet topped up successfully."}
        </div>
      )}

      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        {donorProfile?.full_name ? `Hi, ${donorProfile.full_name.split(" ")[0]}` : "Your wallet"}
      </h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-xs text-[var(--muted-foreground)]">
            Wallet balance
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(donorProfile?.wallet_balance ?? 0)}
          </p>
          <Link
            href="/donor/wallet"
            className="mt-2 inline-block text-xs font-medium text-[var(--primary)] hover:underline"
          >
            Top up →
          </Link>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-xs text-[var(--muted-foreground)]">Total donated</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(totalDonated)}
          </p>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            across {donations?.length ?? 0} donation
            {donations?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          Browse drives
        </Link>
        <Link
          href="/donor/wallet"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          Top up wallet
        </Link>
      </div>

      {/* Donation history */}
      <div className="mt-10">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Donation history
        </h2>

        {!donations?.length ? (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            You haven&apos;t made any donations yet.{" "}
            <Link href="/" className="text-[var(--primary)] hover:underline">
              Browse active drives →
            </Link>
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="px-4 py-3">Drive</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Via</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-[var(--muted)]/20">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      <Link
                        href={`/drives/${d.drive_id}`}
                        className="hover:text-[var(--primary)] hover:underline"
                      >
                        {driveTitleById[d.drive_id] ?? "Drive"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.source === "STRIPE"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}
                      >
                        {d.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {new Date(d.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
