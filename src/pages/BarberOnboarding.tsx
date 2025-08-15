import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import { CreditCard, Loader, Building, AlertTriangle, ArrowRight } from 'lucide-react';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';

const BarberOnboarding: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isConnected } = useSupabaseConnection();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isConnected) {
      setError('Please connect to Supabase to complete barber onboarding');
      setLoading(false);
      return;
    }

    startStripeOnboarding();
  }, [user, isConnected, navigate]);

  const startStripeOnboarding = async () => {
    try {
      if (!user) throw new Error('Not signed in');

      // Create a starter barber profile if missing (safe upsert)
      const { error: profileError } = await supabase
        .from('barber_profiles')
        .upsert({
          user_id: user.id,
          business_name: user.user_metadata?.business_name || `${user.user_metadata?.first_name || 'New'} Barber Shop`,
          owner_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Barber',
          email: user.email || '',
          is_claimed: true,
          is_active: false, // Will be activated after Stripe setup
          slug: `barber-${user.id.slice(0, 8)}`
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
        // Continue anyway - might already exist
      }

      // Get Stripe Connect onboarding link
      const { data, error } = await supabase.functions.invoke('stripe-onboard', { 
        body: {
          userEmail: user.email,
          userName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
          businessName: user.user_metadata?.business_name || `${user.user_metadata?.first_name || 'New'} Barber Shop`
        }
      });
      
      if (error) throw error;
      
      const onboardingUrl = data?.url;
      if (!onboardingUrl) throw new Error('Onboarding link missing');
      
      // Hard redirect to Stripe Connect onboarding
      window.location.href = onboardingUrl;
    } catch (err: any) {
      console.error('Stripe onboarding error:', err);
      setError(err.message ?? 'Could not start Stripe onboarding.');
      setLoading(false);
      
      // Fallback: redirect to barber dashboard after a delay
      setTimeout(() => {
        navigate('/dashboard/barber/profile');
      }, 3000);
    }
  };

  const retryOnboarding = () => {
    setError(null);
    setLoading(true);
    startStripeOnboarding();
  };

  return (
    <div className="min-h-screen bg-gray-50 page-container">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <SupabaseConnectionBanner isConnected={isConnected} />
        
        <div className="text-center space-y-8">
          {/* Header */}
          <div>
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium">
              <Building className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Welcome to Kutable!</h1>
            <p className="text-xl text-gray-600 font-medium">
              Let's set up your payment processing to start accepting bookings
            </p>
          </div>

          {/* Content */}
          <div className="card-premium p-8">
            {loading ? (
              <div className="space-y-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-gray-900 mb-2">Setting up your payment processing...</h3>
                  <p className="text-gray-600">Redirecting you to Stripe to complete your business setup</p>
                </div>
              </div>
            ) : error ? (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">Setup Error</h3>
                  </div>
                  <p className="text-red-700 mb-4">{error}</p>
                  <div className="space-y-3">
                    <button
                      onClick={retryOnboarding}
                      className="btn-primary w-full"
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Try Again</span>
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/barber/profile')}
                      className="btn-secondary w-full"
                    >
                      <span>Continue to Dashboard</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">What this means:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• You can still complete your profile setup</li>
                    <li>• Payment processing can be set up later from your dashboard</li>
                    <li>• You'll need to connect Stripe to accept online bookings</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          {/* Help Section */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-500 p-2 rounded-xl">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">About Stripe Connect</h4>
                <ul className="text-blue-700 text-sm space-y-1 font-medium">
                  <li>• Secure payment processing for your business</li>
                  <li>• Automatic deposits to your bank account</li>
                  <li>• Industry-standard security and compliance</li>
                  <li>• Required to accept online bookings on Kutable</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberOnboarding;