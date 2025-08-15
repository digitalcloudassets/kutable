// Lightweight presentation component to standardize markup in the UI.
import React from 'react';
import { formatUSD, formatCents } from '../../utils/money';

type MoneyProps = {
  /**
   * Dollar amount (e.g., 12.5 -> $12.50). Use either `dollars` or `cents`.
   */
  dollars?: number | null;
  /**
   * Integer cents (e.g., 1250 -> $12.50). Use either `dollars` or `cents`.
   */
  cents?: number | null;
  className?: string;
  title?: string; // optional tooltip / aria label content
};

export default function Money({ dollars, cents, className, title }: MoneyProps) {
  const text =
    typeof cents === 'number'
      ? formatCents(cents)
      : formatUSD(typeof dollars === 'number' ? dollars : 0);

  return (
    <span className={className} title={title} aria-label={title ?? text}>
      {text}
    </span>
  );
}