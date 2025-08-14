// Centralized, locale-safe money formatting for UI labels.

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Format a money amount for labels.
 * @param amount number  - dollars by default (e.g., 12.5 => $12.50)
 * @param opts.fromCents boolean - pass true if amount is in cents (e.g., 1250 => $12.50)
 * @param opts.currency string   - ISO 4217; default 'USD'
 * @param opts.locale string     - BCP 47; default 'en-US'
 */
export function formatMoney(
  amount: number,
  opts: { fromCents?: boolean; currency?: string; locale?: string } = {}
): string {
  const { fromCents = false, currency = 'USD', locale = 'en-US' } = opts;
  const value = fromCents ? amount / 100 : amount;
  const nf = currency === 'USD' && locale === 'en-US'
    ? USD
    : new Intl.NumberFormat(locale, { style: 'currency', currency });
  return nf.format(value);
}

/** Convenience for common case */
export function formatUSD(amount: number, fromCents = false) {
  return formatMoney(amount, { fromCents, currency: 'USD', locale: 'en-US' });
}