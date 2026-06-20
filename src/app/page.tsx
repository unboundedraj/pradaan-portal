export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-foreground)]">
          Community-powered giving
        </span>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
          Every rupee gives. Every vote steers.
        </h1>
        <p className="max-w-xl text-lg text-[var(--muted-foreground)]">
          Pradaan is a transparent donation platform where funds that overflow
          past a drive's goal flow into a community pot — governed by your vote.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/signup"
            className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Start donating
          </a>
          <a
            href="#drives"
            className="rounded-md border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Browse drives
          </a>
        </div>
      </div>

      {/* Active drives grid — will be replaced with live Supabase data */}
      <section id="drives" className="mt-24">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          Active drives
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Drive cards will appear here once Supabase is connected.
        </p>
      </section>
    </div>
  );
}
