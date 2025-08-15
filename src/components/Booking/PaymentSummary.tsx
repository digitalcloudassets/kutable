// Replace the entire file ONLY if this component exists in your project.
// Purpose: ensure totals/fees/tips are DISPLAYED via Money and NOT with .toFixed().
// (Server continues to calculate application_fee_amount, transfers, etc.)
import React from 'react';
import Money from '../UI/Money';
import { toNumber } from '../../utils/money';

type PaymentSummaryProps = {
  // These props are examples; keep your existing names/shapes if different.
  serviceTotalDollars: number | string; // e.g., 42 or "42"
  tipDollars?: number | string;
  discountDollars?: number | string;
  // Display-only copy of platform fee (calculated on server for charge/transfer)
  platformFeeDollars?: number | string;
  taxDollars?: number | string;
  grandTotalDollars: number | string; // final amount the client will be charged
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-1 text-sm">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium">{children}</span>
  </div>
);

export default function PaymentSummary(props: PaymentSummaryProps) {
  const serviceTotal = toNumber(props.serviceTotalDollars, 0);
  const tip = toNumber(props.tipDollars ?? 0, 0);
  const discount = toNumber(props.discountDollars ?? 0, 0);
  const platformFee = toNumber(props.platformFeeDollars ?? 0, 0);
  const tax = toNumber(props.taxDollars ?? 0, 0);
  const grandTotal = toNumber(props.grandTotalDollars, 0);

  return (
    <div className="rounded-2xl border p-4">
      <h3 className="text-base font-semibold mb-3">Payment Summary</h3>

      <div className="space-y-1">
        <Row label="Services">
          <Money dollars={serviceTotal} />
        </Row>
        {tip > 0 && (
          <Row label="Tip">
            <Money dollars={tip} />
          </Row>
        )}
        {discount > 0 && (
          <Row label="Discount">
            <span className="text-red-600">
              – <Money dollars={discount} />
            </span>
          </Row>
        )}
        {platformFee > 0 && (
          <Row label="Platform fee">
            <Money dollars={platformFee} />
          </Row>
        )}
        {tax > 0 && (
          <Row label="Tax">
            <Money dollars={tax} />
          </Row>
        )}

        <div className="my-2 h-px bg-gray-200" />

        <div className="flex items-center justify-between py-1">
          <span className="text-sm font-semibold">Total Due</span>
          <span className="text-lg font-bold">
            <Money dollars={grandTotal} />
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Final charge and barber payout are computed on our secure server via Stripe Connect.
      </p>
    </div>
  );
}