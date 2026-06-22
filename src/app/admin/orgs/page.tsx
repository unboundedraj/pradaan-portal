import type { Metadata } from "next";
import { CheckCircle2, Clock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyOrg } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Organisations" };

export default async function AdminOrgsPage() {
  const admin = await createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, is_verified, created_at")
    .eq("role", "ORGANIZATION")
    .order("created_at", { ascending: false });

  const orgIds = profiles?.map((p) => p.id) ?? [];
  const { data: orgProfiles } = orgIds.length
    ? await admin
        .from("org_profiles")
        .select("id, org_name, description, website")
        .in("id", orgIds)
    : { data: [] };

  const orgNameById = Object.fromEntries(
    (orgProfiles ?? []).map((o) => [o.id, o.org_name])
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Organisations
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Verify organisations so they can submit fundraising drives.
      </p>

      {!profiles?.length ? (
        <p className="mt-12 text-center text-sm text-[var(--muted-foreground)]">
          No organisations registered yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
              {profiles.map((p) => {
                const verifyWithId = verifyOrg.bind(null, p.id);
                const joined = new Date(p.created_at).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" }
                );
                return (
                  <tr key={p.id} className="hover:bg-[var(--muted)]/20">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {orgNameById[p.id] ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {p.email}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {joined}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 size={11} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          <Clock size={11} />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.is_verified && (
                        <form action={verifyWithId}>
                          <button
                            type="submit"
                            className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                          >
                            Verify
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
