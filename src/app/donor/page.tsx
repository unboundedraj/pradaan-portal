export const metadata = { title: "Wallet" };

export default function DonorDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">Your wallet</h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Balance, top-up, and donation history — wired in Phase 4.
      </p>
    </div>
  );
}
