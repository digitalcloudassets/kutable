import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  CheckCircle, 
  AlertTriangle, 
  Loader, 
  ArrowLeft,
  User,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { NotificationManager } from '../utils/notifications';

const ClaimPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Preparing claim...');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/404', { replace: true });
      return;
    }

    // Try to prefill data from sessionStorage fallback
    const claimPayload = sessionStorage.getItem('claim:payload');
    if (claimPayload) {
      try {
        const payload = JSON.parse(claimPayload);
        console.log('Using claim payload from sessionStorage:', payload);
        // Could set some prefill state here if needed
      } catch (error) {
        console.warn('Failed to parse claim payload from sessionStorage:', error);
      }
    }

    if (!authLoading) {
      if (!user) {
        // Save where to return to after login
        sessionStorage.setItem('postLoginRedirect', `/claim/${token}`);
        setMessage('Please sign in to continue claiming your profile...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }

      // User is authenticated, proceed with claim completion
      completeClaim();
    }
  }, [token, user, authLoading, navigate]);

  const completeClaim = async () => {
    if (!user || !token) return;

    setProcessing(true);
    setMessage('Finalizing claim...');
    setError('');

    try {
      const { data, error: claimError } = await supabase.functions.invoke('claim-complete', {
        body: { 
          token, 
          user_id: user.id 
        }
      });

      if (claimError) {
        const errorMessage = claimError?.context?.error || claimError?.message || 'Claim failed';
        throw new Error(errorMessage);
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Claim failed. The link may be expired or already used.';
        throw new Error(errorMessage);
      }

      // Success!
      setSuccess(true);
      setMessage('Profile claimed successfully!');
      NotificationManager.success('Profile claimed successfully! Welcome to Kutable.');

      // Clear the payload since claim was successful
      sessionStorage.removeItem('claim:payload');

      // Redirect after short delay
      setTimeout(() => {
        const slug = data.profile?.slug;
        if (slug) {
          navigate(`/barber/${slug}`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 2000);

    } catch (error: any) {
      console.error('Claim completion failed:', error);
      setError(error.message || 'Claim failed. Please try again.');
      NotificationManager.error(error.message || 'Failed to claim profile');
    } finally {
      setProcessing(false);
    }
  };

  const isWaitingForAuth = authLoading || (!user && !error);
  const needsSignIn = !authLoading && !user && !error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-lg mx-auto text-center space-y-8 relative z-10">
        {success ? (
          /* Success State */
          <div className="animate-fade-in-up">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            
            <div>
              <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Profile Claimed!</h1>
              <p className="text-xl text-gray-600 font-medium mb-6">
                Congratulations! Your barber profile has been successfully claimed.
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8">
              <h4 className="font-display font-bold text-emerald-800 mb-4 text-lg">What's Next?</h4>
              <ul className="text-emerald-700 text-sm space-y-2 text-left font-medium">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Set up your services and pricing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Configure your business hours</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Add photos to showcase your work</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Connect Stripe to accept payments</span>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
              </div>
              <p className="text-gray-500 font-medium">Redirecting to your profile...</p>
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="animate-fade-in-up">
            <div className="bg-gradient-to-br from-red-500 to-red-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium">
              <AlertTriangle className="h-12 w-12 text-white" />
            </div>
            
            <div>
              <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Claim Failed</h1>
              <p className="text-xl text-gray-600 font-medium mb-8">
                {error}
              </p>
            </div>
            
            <div className="space-y-4">
              <Link
                to="/barbers"
                className="btn-primary hover:scale-105 transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Directory</span>
              </Link>
              
              <Link
                to="/support"
                className="btn-secondary hover:scale-105 transition-all duration-200"
              >
                <span>Contact Support</span>
              </Link>
            </div>
          </div>
        ) : needsSignIn ? (
          /* Sign In Required State */
          <div className="animate-fade-in-up">
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
              <User className="h-12 w-12 text-white" />
            </div>
            
            <div>
              <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Sign In Required</h1>
              <p className="text-xl text-gray-600 font-medium mb-8">
                You need to sign in to complete the profile claim process.
              </p>
            </div>
            
            <div className="space-y-4">
              <Link
                to="/login"
                className="btn-primary hover:scale-105 transition-all duration-200"
              >
                <User className="h-5 w-5" />
                <span>Sign In to Continue</span>
              </Link>
              
              <Link
                to="/signup?type=barber"
                className="btn-secondary hover:scale-105 transition-all duration-200"
              >
                <span>Create Barber Account</span>
              </Link>
            </div>
            
            <p className="text-gray-500 text-sm">
              After signing in, you'll be automatically returned to complete the claim.
            </p>
          </div>
        ) : (
          /* Loading/Processing State */
          <div className="animate-fade-in-up">
            <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
              {processing ? (
                <Loader className="h-12 w-12 text-white animate-spin" />
              ) : (
                <Crown className="h-12 w-12 text-white" />
              )}
            </div>
            
            <div>
              <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">
                {processing ? 'Claiming Profile' : 'Preparing Claim'}
              </h1>
              <p className="text-xl text-gray-600 font-medium mb-8">
                {message}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
              </div>
              
              {processing && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 p-2 rounded-xl">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-blue-800 font-semibold">Almost done!</p>
                      <p className="text-blue-700 text-sm">Setting up your barber account and profile...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimPage;