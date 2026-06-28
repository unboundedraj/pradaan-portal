"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Fires router.refresh() after a short delay when mounted.
 * Used on the donor dashboard after a Stripe redirect — the webhook
 * takes ~1-2 s to fire and write the donation, so a refresh after 3 s
 * ensures the history table picks it up without requiring a manual reload.
 */
export function DonationSuccessRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.refresh(), 3000);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
