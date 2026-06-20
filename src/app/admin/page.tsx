export const metadata = { title: "Admin Overview" };

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Admin Overview</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Org approvals, drive management, and governance polls — coming in Phase 5.
      </p>
    </div>
  );
}
