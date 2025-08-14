import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { env } from './env';

let _stripePromise: Promise<Stripe | null> | null = null;

export function getStripe() {
  if (!_stripePromise) {
    const pk = env.stripePublishableKey;
    if (!pk || pk === 'your_stripe_publishable_key_here' || pk === 'pk_test_placeholder_key_for_development') {
      console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY');
      return Promise.resolve(null);
    }
    _stripePromise = loadStripe(pk).catch((e) => {
      console.error('Failed to load Stripe.js', e);
      return null;
    });
  }
  return _stripePromise;
}

// Ensure ALL components import stripePromise from here
export const stripePromise = loadStripe(env.stripePublishableKey);

export const PLATFORM_FEE_PERCENTAGE = 0.01; // 1%
export const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
export const STRIPE_FEE_FIXED = 0.30; // $0.30

export const calculateFees = (amount: number) => {
  const platformFee = amount * PLATFORM_FEE_PERCENTAGE;
  const stripeFee = (amount * STRIPE_FEE_PERCENTAGE) + STRIPE_FEE_FIXED;
  const combinedFee = platformFee + stripeFee;
  const netAmount = amount - combinedFee;

  return {
    platformFee: Math.round(platformFee * 100) / 100,
    stripeFee: Math.round(stripeFee * 100) / 100,
    combinedFee: Math.round(combinedFee * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
};