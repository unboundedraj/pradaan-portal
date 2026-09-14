import Link from "next/link";
import { Heart, HandCoins, ArrowRightLeft, Vote, Sparkles } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, driveProgress } from "@/lib/money";
import { HeroImageCarousel } from "@/components/hero-image-carousel";

export default async function HomePage() {
  const admin = createAdminClient();

  const { data: drives } = await admin
    .from("drives")
    .select("id, title, description, target_amount, current_amount, ends_at, org_id")
    .in("status", ["APPROVED", "ACTIVE", "COMPLETED"])
    .order("created_at", { ascending: false });

  const orgIds = [...new Set((drives ?? []).map((d) => d.org_id))];
  const { data: orgProfiles } = orgIds.length
    ? await admin.from("org_profiles").select("id, org_name").in("id", orgIds)
    : { data: [] };

  const orgNameById = Object.fromEntries(
    (orgProfiles ?? []).map((o) => [o.id, o.org_name])
  );

  const now = Date.now();
  const active = (drives ?? []).filter(
    (d) => new Date(d.ends_at).getTime() > now
  );
  const ended = (drives ?? []).filter(
    (d) => new Date(d.ends_at).getTime() <= now
  );
  const totalRaised = (drives ?? []).reduce(
    (sum, d) => sum + d.current_amount,
    0
  );

  const DriveCard = ({
    drive,
    isEnded,
  }: {
    drive: NonNullable<typeof drives>[number];
    isEnded: boolean;
  }) => {
    const pct = driveProgress(drive.current_amount, drive.target_amount);
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(drive.ends_at).getTime() - now) / (1000 * 60 * 60 * 24)
      )
    );
    return (
      <Link
        key={drive.id}
        href={`/drives/${drive.id}`}
        className={`group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--brand-lime)] hover:shadow-sm ${isEnded ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-[var(--primary)]">
            {orgNameById[drive.org_id] ?? "Organisation"}
          </p>
          {isEnded && (
            <span className="shrink-0 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Drive ended
            </span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
          {drive.title}
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--muted-foreground)]">
          {drive.description}
        </p>
        <div className="mt-5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
            <span>
              <span className="font-medium text-[var(--foreground)]">
                {formatCurrency(drive.current_amount)}
              </span>{" "}
              raised
            </span>
            <span>{isEnded ? `${pct}% funded` : `${daysLeft}d left · ${pct}%`}</span>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Decorative glow — purely visual, sits behind the content */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-[var(--brand-lime-soft)] opacity-60 blur-3xl"
        />

        <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Copy column */}
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-lime-soft)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
              <Sparkles size={12} className="text-[var(--brand-lime)]" />
              Community-powered giving
            </span>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-6xl">
              Every rupee gives.
              <br />
              Every vote{" "}
              <span className="text-[var(--brand-lime)]">steers.</span>
            </h1>
            <p className="max-w-xl text-lg text-[var(--muted-foreground)]">
              Pradaan is a transparent donation platform where funds that overflow
              past a drive&apos;s goal flow into a community pot — governed by your
              vote.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
              >
                Start donating
              </Link>
              <a
                href="#drives"
                className="rounded-md border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--brand-lime)] hover:bg-[var(--brand-lime-soft)] transition-colors"
              >
                Browse drives
              </a>
            </div>

            {/* Live stat strip — pulled from the same drive data below, not copy */}
            {(drives?.length ?? 0) > 0 && (
              <div className="mt-4 flex items-center gap-6 sm:gap-10">
                <Stat
                  value={formatCurrency(totalRaised)}
                  label="raised so far"
                />
                <Stat value={String(active.length)} label="drives live now" />
                <Stat
                  value={String(orgIds.length)}
                  label="organisations onboard"
                />
              </div>
            )}
          </div>

          {/* Decorative frame — carries over the arc-framed portrait carousel from the original Pradaan site */}
          <div className="relative hidden justify-self-center lg:flex">
            <HeroImageCarousel />
          </div>
        </div>
      </div>

      {/* ─── Drive listing ────────────────────────────────────────────────── */}
      <section id="drives" className="mt-24 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Active drives
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {active.length
            ? `${active.length} drive${active.length === 1 ? "" : "s"} currently raising funds`
            : "No active drives at the moment — check back soon."}
        </p>
        {active.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((drive) => (
              <DriveCard key={drive.id} drive={drive} isEnded={false} />
            ))}
          </div>
        )}

        {ended.length > 0 && (
          <>
            <h2 className="mt-16 font-display text-2xl font-bold text-[var(--foreground)]">
              Past drives
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Completed campaigns
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ended.map((drive) => (
                <DriveCard key={drive.id} drive={drive} isEnded={true} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── How giving works ─────────────────────────────────────────────── */}
      <section className="mt-24 text-center">
        <h2 className="font-display text-3xl font-bold text-[var(--foreground)]">
          Why <span className="text-[var(--brand-lime)]">Pradaan</span>?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted-foreground)]">
          Every donation does double duty — it funds the drive you picked, and
          anything past that drive&apos;s goal keeps working for the community.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<HandCoins size={20} />}
            title="Fund a drive"
            description="Pick a cause an organisation is raising for and donate directly, by card or wallet."
          />
          <FeatureCard
            icon={<ArrowRightLeft size={20} />}
            title="Overflow shares forward"
            description="Once a drive hits its target, extra donations flow into the Pradaan Pot instead of sitting idle."
          />
          <FeatureCard
            icon={<Vote size={20} />}
            title="Vote where it goes"
            description="The community — not one org — decides how pot funds get deployed next."
          />
        </div>
      </section>

      {/* ─── Footer nudge ─────────────────────────────────────────────────── */}
      <div className="mt-24 flex flex-col items-center gap-3 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-lime-soft)]">
          <Heart size={18} className="text-[var(--brand-lime)]" fill="currentColor" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Overflow funds go into the Pradaan Pot — voted on by the community.
        </p>
        <Link
          href="/signup"
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          Join and vote →
        </Link>
      </div>
    </div>
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-2xl font-bold text-[var(--foreground)]">
        {value}
      </span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--primary)]">
        {icon}
      </div>
      <h3 className="font-display text-base font-bold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}
