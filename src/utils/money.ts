// Single source of truth for displaying money. Do NOT perform business math here.
const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  // maximumFractionDigits left default; Intl handles cents correctly
});

export function formatUSD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '$0.00';
  return USD.format(amount);
}

/**
 * If your values are tracked in cents (integers) on the client, use this.
 * Example: formatCents(1299) -> "$12.99"
 */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '$0.00';
  return USD.format(cents / 100);
}

/**
 * Safe helper to coerce possibly string inputs to number for display only.
 * Never use this for business logic; server owns the math.
 */
export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : fallback;
}