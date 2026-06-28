import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";
import { CertificateModal } from "./certificate-modal";
import type { CertificateData } from "./certificate-modal";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [{ data: donorProfile }, { data: donations }] = await Promise.all([
    admin.from("donor_profiles").select("full_name").eq("id", user.id).single(),
    admin
      .from("donations")
      .select("drive_id, amount, created_at")
      .eq("donor_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Aggregate per drive: total amount + most recent donation date
  const driveMap: Record<string, { total: number; lastDate: string }> = {};
  for (const d of donations ?? []) {
    if (!driveMap[d.drive_id]) {
      driveMap[d.drive_id] = { total: 0, lastDate: d.created_at };
    }
    driveMap[d.drive_id].total += d.amount;
  }

  const driveIds = Object.keys(driveMap);

  if (!driveIds.length) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">
          Certificates
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          You haven&apos;t made any donations yet. Certificates are issued per
          drive once you donate.
        </p>
      </div>
    );
  }

  const [{ data: drives }, ] = await Promise.all([
    admin
      .from("drives")
      .select("id, title, org_id")
      .in("id", driveIds),
  ]);

  const orgIds = [...new Set((drives ?? []).map((d) => d.org_id))];
  const { data: orgs } = await admin
    .from("org_profiles")
    .select("id, org_name")
    .in("id", orgIds);

  const orgNameById = Object.fromEntries(
    (orgs ?? []).map((o) => [o.id, o.org_name])
  );

  const donorName = donorProfile?.full_name ?? "Donor";

  const items = (drives ?? []).map((drive) => {
    const { total, lastDate } = driveMap[drive.id];
    const certData: CertificateData = {
      donorName,
      driveTitle: drive.title,
      orgName: orgNameById[drive.org_id] ?? "Organisation",
      totalAmountFormatted: formatCurrency(total),
      lastDonationDate: new Date(lastDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
    return { drive, total, certData };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Certificates
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        One certificate per drive, reflecting your total contribution.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {items.map(({ drive, total, certData }) => (
          <div
            key={drive.id}
            className="flex items-center justify-between gap-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                <Award size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)]">
                  {drive.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
                  Total donated:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCurrency(total)}
                  </span>
                </p>
              </div>
            </div>

            <CertificateModal data={certData} driveName={drive.title} />
          </div>
        ))}
      </div>
    </div>
  );
}
