import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader, CreditCard, Shield, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required', // stay in-app; 3DS will pop a modal if needed
      });

      if (error) {
        NotificationManager.error(error.message || 'Payment failed');
        return;
      }
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        NotificationManager.success('Payment successful!');
        onSuccess(paymentIntent.id);
      } else if (paymentIntent?.status === 'processing') {
        NotificationManager.info('Payment processing — you\'ll be notified when it completes.');
        onSuccess(paymentIntent.id);
      } else {
        NotificationManager.error('Payment not completed.');
      }
    } catch (error: any) {
      NotificationManager.error(error.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Element */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <CreditCard className="h-4 w-4 inline mr-1" />
            Payment Information
          </label>
          <div className="border border-gray-300 rounded-xl p-4 bg-white">
            <PaymentElement />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Processing Payment...</span>
            </>
          ) : (
            <>
              <Lock className="h-5 w-5" />
              <span>Pay Now</span>
            </>
          )}
        </button>
      </form>

      {/* Security Notice */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <Lock className="h-3 w-3 mr-1" />
            SSL Encrypted
          </div>
          <div className="flex items-center">
            <Shield className="h-3 w-3 mr-1" />
            PCI Compliant
          </div>
          <div className="flex items-center">
            <CreditCard className="h-3 w-3 mr-1" />
            Stripe Secure
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InAppCheckout({
  barberId,
  amount,         // in cents
  currency = 'usd',
  customerEmail,
  metadata,       // { bookingId, userId, ... }
  onComplete,     // (paymentIntentId) => finalize booking
}: {
  barberId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  onComplete: (paymentIntentId: string) => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setError('');
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { barberId, amount, currency, customerEmail, metadata },
        });
        
        if (error) {
          console.warn('Payment intent error', error?.context || error);
          const errorMessage = error?.context?.error || error?.message || 'Unable to initialize payment';
          setError(errorMessage);
          NotificationManager.error(errorMessage);
          return;
        }

        if (!data?.clientSecret) {
          const errorMessage = data?.error || 'Unable to initialize payment';
          setError(errorMessage);
          NotificationManager.error(errorMessage);
          return;
        }

        setClientSecret(data.clientSecret);
      } catch (error: any) {
        const errorMessage = error.message || 'Payment initialization failed';
        setError(errorMessage);
        NotificationManager.error(errorMessage);
      }
    };

    initializePayment();
  }, [barberId, amount, currency, customerEmail, JSON.stringify(metadata)]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Setup Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
        </div>
        <p className="text-gray-600 font-medium">Initializing secure payment...</p>
      </div>
    );
  }
  if (!clientSecret) {
    return (
      <div className="text-center py-8">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
        </div>
        <p className="text-gray-600 font-medium">Initializing secure payment...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm
        clientSecret={clientSecret}
        onSuccess={onComplete}
      />
    </Elements>
  );
}