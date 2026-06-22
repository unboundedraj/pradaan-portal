import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const admin = await createAdminClient();

  const [
    { count: pendingDrives },
    { count: unverifiedOrgs },
    { count: activePolls },
    { count: totalDonors },
  ] = await Promise.all([
    admin
      .from("drives")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "ORGANIZATION")
      .eq("is_verified", false),
    admin
      .from("polls")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "DONOR"),
  ]);

  const actions = [
    {
      label: "Drives awaiting approval",
      count: pendingDrives ?? 0,
      href: "/admin/drives",
      urgent: (pendingDrives ?? 0) > 0,
    },
    {
      label: "Unverified organisations",
      count: unverifiedOrgs ?? 0,
      href: "/admin/orgs",
      urgent: (unverifiedOrgs ?? 0) > 0,
    },
    {
      label: "Active polls",
      count: activePolls ?? 0,
      href: "/admin/polls",
      urgent: false,
    },
    {
      label: "Total donors",
      count: totalDonors ?? 0,
      href: "#",
      urgent: false,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Admin Overview
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Platform health at a glance.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {actions.map(({ label, count, href, urgent }) => (
          <Link
            key={label}
            href={href}
            className={`rounded-xl border p-5 transition-colors hover:border-[var(--primary)] ${
              urgent
                ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                urgent ? "text-amber-700 dark:text-amber-400" : "text-[var(--foreground)]"
              }`}
            >
              {count}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
