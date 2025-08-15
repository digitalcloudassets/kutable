import React, { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '../../lib/stripe';
import { Lock, CreditCard, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface PaymentProcessorProps {
  booking: {
    barberId: string;
    serviceId: string;
    appointmentDate: string;
    appointmentTime: string;
    clientDetails: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      notes?: string;
    };
    totalAmount: number;
    depositAmount?: number;
  };
  onSuccess: (paymentIntentId: string, bookingId: string) => void;
  onBack: () => void;
}

const PaymentForm: React.FC<PaymentProcessorProps> = ({ booking, onSuccess, onBack }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: booking
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
      setBookingId(data.bookingId);
      setPaymentIntentId(data.paymentIntentId);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      
      let errorMessage = 'Failed to initialize payment. Please try again.';
      
      // Handle specific error cases
      if (error && typeof error === 'object' && 'context' in error && error.context?.body) {
        try {
          const parsedError = JSON.parse(error.context.body);
          errorMessage = parsedError.error || errorMessage;
        } catch {
          // Fallback to default message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setPaymentError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setPaymentError('');

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setPaymentError('Payment form not loaded properly');
      setIsProcessing(false);
      return;
    }

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${booking.clientDetails.firstName} ${booking.clientDetails.lastName}`,
            email: booking.clientDetails.email,
            phone: booking.clientDetails.phone,
          },
        },
      });

      if (paymentError) {
        setPaymentError(paymentError.message || 'Payment failed');
        toast.error(paymentError.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm the booking on the backend
        const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
          body: {
            paymentIntentId: paymentIntent.id,
            bookingId: bookingId
          }
        });

        if (confirmError || !confirmData?.success) {
          throw new Error(confirmData?.error || 'Failed to confirm booking');
        }

        toast.success('Payment successful! Booking confirmed.');
        onSuccess(paymentIntent.id, bookingId);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setPaymentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#374151',
        fontFamily: '"Inter", sans-serif',
        '::placeholder': {
          color: '#9CA3AF',
        },
        iconColor: '#9CA3AF',
      },
      invalid: {
        color: '#EF4444',
        iconColor: '#EF4444',
      },
    },
    hidePostalCode: false,
  };

  if (paymentError && !clientSecret) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Setup Error</h3>
          <p className="text-red-700 mb-4">{paymentError}</p>
          <div className="space-y-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </button>
            <button
              onClick={createPaymentIntent}
              className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Setting up secure payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Details</h2>
          <p className="text-gray-600">Complete your booking with secure payment</p>
        </div>

        {/* Security Badge */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Secured by bank-level encryption
            </span>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Service Total</span>
              <span className="font-medium">${booking.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processing Fee</span>
              <span className="font-medium">${(booking.totalAmount * 0.029 + 0.30).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">${(booking.totalAmount + booking.totalAmount * 0.029 + 0.30).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="h-4 w-4 inline mr-1" />
              Card Information
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{paymentError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Pay ${booking.totalAmount.toLocaleString()}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Trust Indicators */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
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
    </div>
  );
};

const PaymentProcessor: React.FC<PaymentProcessorProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default PaymentProcessor;