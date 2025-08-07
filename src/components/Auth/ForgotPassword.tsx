import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';

const ForgotPassword: React.FC = () => {
  const { isConnected: isSupabaseConnected } = useSupabaseConnection();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConnected) {
      setError('Database not connected. Please connect to Supabase to reset your password.');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes('User not found')) {
          setError('No account found with this email address. Please check your email or create a new account.');
        } else if (error.message.includes('Email rate limit exceeded')) {
          setError('Too many password reset requests. Please wait a few minutes before trying again.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      if (error.message?.includes('Connect to Supabase')) {
        setError('Database not connected. Please connect to Supabase to reset your password.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setSuccess(false);
    setEmail('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative z-10">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Reset Your Password</h2>
          <p className="text-xl text-gray-600 font-medium">
            {success 
              ? 'Check your email for reset instructions'
              : 'Enter your email address and we\'ll send you a link to reset your password'
            }
          </p>
        </div>

        <div className="card-premium p-8 relative z-10 animate-fade-in-up">
          {success ? (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-premium">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">Email Sent!</h3>
                <p className="text-gray-600 leading-relaxed">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Click the link in the email to reset your password.
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-start space-x-2">
                  <div className="bg-blue-500 p-1.5 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-blue-800 mb-2">Didn't receive the email?</h4>
                    <ul className="text-blue-700 text-sm space-y-1 font-medium">
                      <li>• Check your spam or junk folder</li>
                      <li>• Make sure you entered the correct email address</li>
                      <li>• Wait a few minutes for the email to arrive</li>
                      <li>• Try requesting another reset email</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleTryAgain}
                  className="btn-primary w-full hover:scale-105 transition-all duration-200"
                >
                  Send Another Email
                </button>
                
                <Link
                  to="/login"
                  className="btn-secondary w-full text-center hover:scale-105 transition-all duration-200"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3">
                  <div className="bg-red-500 p-1.5 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-premium pl-12"
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>
                <p className="mt-3 text-sm text-gray-500 font-medium">
                  Enter the email address associated with your Kutable account
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Sending Reset Email...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    <span>Send Reset Email</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              to="/login"
              className="flex items-center justify-center space-x-2 text-primary-600 hover:text-primary-500 transition-colors font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center relative z-10">
          <p className="text-sm text-gray-500 font-medium">
            For security reasons, we'll send the reset link only if an account exists with this email address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;