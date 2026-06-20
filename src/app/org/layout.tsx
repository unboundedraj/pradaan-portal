import type { Metadata } from "next";

export const metadata: Metadata = { title: { template: "%s | Org Portal", default: "Org Portal" } };

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-56 shrink-0 border-r border-[var(--border)] bg-[var(--card)] p-4">
        <nav className="flex flex-col gap-1 text-sm">
          {[
            { href: "/org", label: "Overview" },
            { href: "/org/drives", label: "My drives" },
            { href: "/org/drives/new", label: "Create drive" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
