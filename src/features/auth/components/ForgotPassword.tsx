import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../../shared/api/supabaseClient';
import { useSupabaseConnection } from '../../../shared/hooks/useSupabaseConnection';

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Reset Your Password</h2>
          <p className="mt-2 text-gray-600">
            {success 
              ? 'Check your email for reset instructions'
              : 'Enter your email address and we\'ll send you a link to reset your password'
            }
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {success ? (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Click the link in the email to reset your password.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-left">
                    <h4 className="font-medium text-blue-800 mb-1">Didn't receive the email?</h4>
                    <ul className="text-blue-700 text-xs space-y-1">
                      <li>• Check your spam or junk folder</li>
                      <li>• Make sure you entered the correct email address</li>
                      <li>• Wait a few minutes for the email to arrive</li>
                      <li>• Try requesting another reset email</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Send Another Email
                </button>
                
                <Link
                  to="/login"
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center block"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter the email address associated with your Kutable account
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              to="/login"
              className="flex items-center justify-center space-x-2 text-orange-600 hover:text-orange-500 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-orange-600 hover:text-orange-500 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            For security reasons, we'll send the reset link only if an account exists with this email address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;