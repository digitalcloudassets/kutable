import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../lib/stripe';

type Props = {
  clientSecret: string;
  children: React.ReactNode;
};

export default function StripeElementsProvider({ clientSecret, children }: Props) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      {children}
    </Elements>
  );
}