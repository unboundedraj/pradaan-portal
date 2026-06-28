import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/money";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export const metadata: Metadata = { title: "Pradaan Pot" };

export default async function PradaanPotPage() {
  const admin = createAdminClient();

  const [{ data: entries }, { data: drives }, { data: activePolls }] =
    await Promise.all([
      admin
        .from("pradaan_pot_ledger")
        .select("id, type, amount, drive_id, description, created_at")
        .order("created_at", { ascending: false }),
      admin.from("drives").select("id, title"),
      admin
        .from("polls")
        .select("title, allocated_amount")
        .eq("status", "ACTIVE"),
    ]);

  const driveTitleById = Object.fromEntries(
    (drives ?? []).map((d) => [d.id, d.title])
  );

  const totalInflow = (entries ?? [])
    .filter((e) => e.type === "INFLOW_OVERFLOW")
    .reduce((s, e) => s + e.amount, 0);

  const totalOutflow = (entries ?? [])
    .filter((e) => e.type === "OUTFLOW_POLL")
    .reduce((s, e) => s + e.amount, 0);

  const potBalance = totalInflow - totalOutflow;

  const committed = (activePolls ?? []).reduce(
    (s, p) => s + p.allocated_amount,
    0
  );
  const available = potBalance - committed;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Pradaan Pot
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Overflow funds from completed drives, governed by community votes.
      </p>

      {/* Balance cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Pot balance"
          value={formatCurrency(potBalance)}
          sub="total received − disbursed"
        />
        <StatCard
          label="Available"
          value={formatCurrency(available)}
          sub="after active poll commitments"
          highlight
        />
        <StatCard
          label="Total inflow"
          value={formatCurrency(totalInflow)}
          sub={`${(entries ?? []).filter((e) => e.type === "INFLOW_OVERFLOW").length} overflow events`}
        />
        <StatCard
          label="Total disbursed"
          value={formatCurrency(totalOutflow)}
          sub={`${(entries ?? []).filter((e) => e.type === "OUTFLOW_POLL").length} poll payouts`}
        />
      </div>

      {/* Active poll commitments */}
      {(activePolls ?? []).length > 0 && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Active poll commitments
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {(activePolls ?? []).map((poll, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-[var(--foreground)]">{poll.title}</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  −{formatCurrency(poll.allocated_amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Ledger history
        </h2>

        {!(entries ?? []).length ? (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            No entries yet — overflow from donations will appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                {(entries ?? []).map((entry) => {
                  const isInflow = entry.type === "INFLOW_OVERFLOW";
                  const driveTitle = entry.drive_id
                    ? (driveTitleById[entry.drive_id] ?? "Drive")
                    : null;
                  const label = isInflow
                    ? driveTitle
                      ? `Overflow — ${driveTitle}`
                      : "Overflow"
                    : entry.description ?? "Poll disbursement";

                  return (
                    <tr key={entry.id} className="hover:bg-[var(--muted)]/20">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isInflow
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                          }`}
                        >
                          {isInflow ? (
                            <ArrowUpCircle size={11} />
                          ) : (
                            <ArrowDownCircle size={11} />
                          )}
                          {isInflow ? "Inflow" : "Disbursed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-[var(--foreground)]">
                        <span className={isInflow ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {isInflow ? "+" : "−"}
                          {formatCurrency(entry.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {label}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {new Date(entry.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{sub}</p>
    </div>
  );
}
