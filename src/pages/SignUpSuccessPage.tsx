import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

const SignUpSuccessPage: React.FC = () => {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const userType = params.get('type') ?? 'client';
  const navigate = useNavigate();
  const { session } = useAuth();

  // Auto-forward if a session already exists
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (s) {
        navigate('/dashboard', { replace: true });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center px-4 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative z-10">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Welcome to Kutable!</h2>
          <p className="text-xl text-gray-600 font-medium">
            Your account has been created successfully. Please sign in to continue.
          </p>
        </div>

        <div className="card-premium p-8 relative z-10 animate-fade-in-up">
          <div className="text-center space-y-6">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">Account Created</span>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                Your {userType} account is ready! Sign in to access your dashboard and start 
                {userType === 'barber' ? ' accepting bookings' : ' booking appointments'}.
              </p>
            </div>

            {email && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-700 font-medium">
                  Email: <span className="text-gray-900">{email}</span>
                </p>
              </div>
            )}

            {/* Functional Sign In CTA */}
            <Link
              to={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="btn-primary w-full group hover:scale-105 transition-all duration-200"
            >
              <CheckCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Sign In Required</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Already signed in?{' '}
                <Link to="/dashboard" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">
                  Go to Dashboard
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 relative z-10">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-500 p-2 rounded-xl">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
              <ul className="text-blue-700 text-sm space-y-1 font-medium">
                <li>• Sign in with your email and password</li>
                <li>• Complete your profile setup</li>
                <li>• {userType === 'barber' ? 'Start accepting bookings and payments' : 'Find and book with professional barbers'}</li>
                <li>• Enjoy the full Kutable experience!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpSuccessPage;