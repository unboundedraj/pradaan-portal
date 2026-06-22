"use client";

import type { Metadata } from "next";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  createWalletTopupCheckout,
  type DonationState,
} from "@/app/actions/donations";
import { useState } from "react";

// Metadata must be in a Server Component; this page is "use client" so we
// set it via the layout's title template only.

const PRESETS = [500, 1000, 2000, 5000];

export default function WalletTopupPage() {
  const [state, action, pending] = useActionState<DonationState, FormData>(
    createWalletTopupCheckout,
    null
  );
  const [amount, setAmount] = useState<string>("");
  const error = state && "error" in state ? state.error : null;

  return (
    <div className="max-w-sm">
      <Link
        href="/donor"
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft size={13} />
        Back to wallet
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
        Top up wallet
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Add funds to your Pradaan wallet. Use the balance to donate to drives
        without entering card details each time.
      </p>

      <form action={action} className="mt-8 flex flex-col gap-4">
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
            name="amount"
            type="number"
            min={10}
            step={1}
            required
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

        <button
          type="submit"
          disabled={pending || !amount}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          {pending ? "Redirecting to Stripe…" : "Add funds"}
        </button>

        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Powered by Stripe · Funds appear in your wallet after payment
        </p>
      </form>
    </div>
  );
}
