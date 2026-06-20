import Stripe from "stripe";

/**
 * Stripe SDK instance — server-only.
 * Never import this file from client-side code; the secret key would be
 * bundled into the browser JS.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});
