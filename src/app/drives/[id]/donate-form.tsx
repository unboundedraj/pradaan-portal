"use client";

import { useActionState, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import {
  createDonationCheckout,
  createWalletDonation,
  type DonationState,
} from "@/app/actions/donations";
import { formatCurrency } from "@/lib/money";

const PRESETS = [100, 500, 1000, 5000];

export function DonateForm({
  driveId,
  walletBalance,
}: {
  driveId: string;
  walletBalance: number;
}) {
  const [stripeState, stripeAction, stripePending] =
    useActionState<DonationState, FormData>(createDonationCheckout, null);
  const [walletState, walletAction, walletPending] =
    useActionState<DonationState, FormData>(createWalletDonation, null);

  const [amount, setAmount] = useState<string>("");

  const amountPaise = Number(amount) * 100;
  const amountValid = Number(amount) >= 10;
  const canPayFromWallet = walletBalance >= amountPaise && amountValid;
  const pending = stripePending || walletPending;

  const error =
    (walletState && "error" in walletState ? walletState.error : null) ||
    (stripeState && "error" in stripeState ? stripeState.error : null);

  return (
    <div className="flex flex-col gap-4">
      {/* Preset amounts */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            className={`rounded-md border py-2 text-sm font-medium transition-colors ${
              amount === String(p)
                ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
            }`}
          >
            ₹{p.toLocaleString("en-IN")}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
          ₹
        </span>
        <input
          type="number"
          min={10}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-7 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1 focus:ring-offset-[var(--background)]"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Wallet option — only shown when donor has a balance */}
      {walletBalance > 0 && (
        <form action={walletAction}>
          <input type="hidden" name="drive_id" value={driveId} />
          <input type="hidden" name="amount" value={amount} />
          <button
            type="submit"
            disabled={pending || !canPayFromWallet}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--primary)] bg-[var(--accent)] text-sm font-semibold text-[var(--primary)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {walletPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wallet size={14} />
            )}
            {walletPending
              ? "Processing…"
              : `Pay from wallet · ${formatCurrency(walletBalance)} available`}
          </button>
          {amount && !canPayFromWallet && amountValid && (
            <p className="mt-1 text-center text-xs text-[var(--muted-foreground)]">
              Not enough balance —{" "}
              <a href="/donor/wallet" className="text-[var(--primary)] hover:underline">
                top up your wallet
              </a>
            </p>
          )}
        </form>
      )}

      {/* Stripe option */}
      <form action={stripeAction}>
        <input type="hidden" name="drive_id" value={driveId} />
        <input type="hidden" name="amount" value={amount} />
        <button
          type="submit"
          disabled={pending || !amountValid}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {stripePending && <Loader2 size={14} className="animate-spin" />}
          {stripePending
            ? "Redirecting to Stripe…"
            : walletBalance > 0
            ? "Pay with card instead"
            : "Donate securely"}
        </button>
      </form>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Powered by Stripe · Minimum ₹10
      </p>
    </div>
  );
}
