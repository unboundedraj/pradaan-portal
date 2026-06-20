/** Convert a rupee float to integer cents. Always use this at input boundaries. */
export const toCents = (rupees: number): number => Math.round(rupees * 100);

/** Convert integer cents to a rupee float (for display only — never do math on this). */
export const toRupees = (cents: number): number => cents / 100;

/** Format integer cents as a localised INR currency string. */
export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);

/**
 * Compute the portion of a donation that overflows past a drive's target.
 *
 * @param currentAmount  Current drive amount in cents (before this donation)
 * @param targetAmount   Drive target in cents
 * @param donationAmount Incoming donation in cents
 * @returns { driveCredit, overflowAmount } both in cents, summing to donationAmount
 */
export function computeOverflow(
  currentAmount: number,
  targetAmount: number,
  donationAmount: number
): { driveCredit: number; overflowAmount: number } {
  const overflowAmount = Math.max(
    0,
    currentAmount + donationAmount - targetAmount
  );
  const driveCredit = donationAmount - overflowAmount;
  return { driveCredit, overflowAmount };
}

/** Drive progress as a 0–100 percentage (capped at 100). */
export const driveProgress = (
  currentAmount: number,
  targetAmount: number
): number => Math.min(100, Math.round((currentAmount / targetAmount) * 100));
