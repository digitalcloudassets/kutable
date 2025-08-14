import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { env } from './env';

// Single source of truth for Stripe.js initialization
// All components must import { stripePromise } from here
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