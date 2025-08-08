import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader, CreditCard, Shield, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';

// Check if Stripe key is configured
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripeKey && 
  stripeKey !== 'your_stripe_publishable_key_here' && 
  stripeKey !== 'pk_test_placeholder_key_for_development' &&
  stripeKey.startsWith('pk_');

const stripePromise = isStripeConfigured ? loadStripe(stripeKey) : null;

// Mock Payment Component for Development
const MockPaymentForm: React.FC<{
  onSuccess: (paymentIntentId: string) => void;
  amount: number;
}> = ({ onSuccess, amount }) => {
  const [mockProcessing, setMockProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handleMockPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMockProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      const mockPaymentIntentId = `pi_mock_${Date.now()}`;
      NotificationManager.success('Mock payment successful! (Development mode)');
      onSuccess(mockPaymentIntentId);
      setMockProcessing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <span className="text-blue-800 font-semibold">Development Mode - Mock Payment</span>
        </div>
        <p className="text-blue-700 text-sm mt-2">
          This is a simulated payment form. Add your Stripe publishable key to enable real payment processing.
        </p>
      </div>

      <form onSubmit={handleMockPayment} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="h-4 w-4 inline mr-1" />
            Card Number (Mock)
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="4242 4242 4242 4242"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry (Mock)
            </label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="12/25"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVC (Mock)
            </label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              placeholder="123"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={mockProcessing}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mockProcessing ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Processing Mock Payment...</span>
            </>
          ) : (
            <>
              <Lock className="h-5 w-5" />
              <span>Pay ${(amount / 100).toFixed(2)} (Mock)</span>
            </>
          )}
        </button>
      </form>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">To Enable Real Payments:</h4>
        <ol className="text-yellow-700 text-sm space-y-1">
          <li>1. Get your Stripe publishable key from the Stripe Dashboard</li>
          <li>2. Add it to your environment variables as VITE_STRIPE_PUBLISHABLE_KEY</li>
          <li>3. Restart your development server</li>
        </ol>
      </div>
    </div>
  );
};

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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if Stripe and Elements are ready
    if (stripe && elements) {
      setIsReady(true);
      console.log('Stripe and Elements are ready');
    } else {
      console.log('Waiting for Stripe/Elements:', { stripe: !!stripe, elements: !!elements });
    }
  }, [stripe, elements]);

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
      {!isReady && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader className="h-4 w-4 text-blue-600 animate-spin" />
            <span className="text-blue-800 text-sm">Loading payment form...</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Element */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <CreditCard className="h-4 w-4 inline mr-1" />
            Payment Information
          </label>
          <div className="border border-gray-300 rounded-xl p-4 bg-white">
            <PaymentElement 
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card'], 
                wallets: {
                  applePay: 'never',
                  googlePay: 'never'
                },
                fields: {
                  billingDetails: 'auto'
                }
              }}
            />
          </div>
          {!isReady && (
            <p className="text-sm text-gray-500 mt-2">
              If the payment form doesn't appear, please check your Stripe configuration.
            </p>
          )}
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

  // If Stripe is not configured, show mock payment interface
  if (!isStripeConfigured) {
    return (
      <MockPaymentForm onSuccess={onComplete} amount={amount} />
    );
  }

  // Check if Stripe promise is available
  if (!stripePromise) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Stripe Loading Error</h3>
        <p className="text-red-700">
          Failed to load Stripe. Please check your configuration and try again.
        </p>
      </div>
    );
  }

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setError('');
        console.log('Initializing payment with:', { barberId, amount, currency, customerEmail, metadata });
        
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { 
            barberId, 
            amount, 
            currency, 
            customerEmail, 
            metadata: metadata || {} 
          },
        });
        
        if (error) {
          console.error('Payment intent error:', error);
          const errorMessage = error?.context?.error || error?.message || 'Unable to initialize payment';
          setError(errorMessage);
          NotificationManager.error(errorMessage);
          return;
        }

        console.log('Payment intent response:', data);
        
        if (!data?.success || !data?.clientSecret) {
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

  return (
    <Elements 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#0066FF',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, system-ui, sans-serif',
            spacingUnit: '4px',
            borderRadius: '12px'
          }
        },
      }}
    >
      <CheckoutForm
        clientSecret={clientSecret}
        onSuccess={onComplete}
      />
    </Elements>
  );
}