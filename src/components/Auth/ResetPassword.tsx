import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';

const ResetPassword: React.FC = () => {
  const { isConnected: isSupabaseConnected } = useSupabaseConnection();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have the necessary tokens from the email link
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const type = searchParams.get('type');

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setError('Invalid or expired reset link. Please request a new password reset.');
      return;
    }

    if (!isSupabaseConnected) {
      setError('Database not connected. Please connect to Supabase to reset your password.');
      return;
    }

    // Set the session with the tokens from the URL
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }, [searchParams, isSupabaseConnected]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isSupabaseConnected) {
      setError('Database not connected. Please connect to Supabase to reset your password.');
      setLoading(false);
      return;
    }

    // Validation
    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in both password fields');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid token')) {
          setError('This reset link has expired or is invalid. Please request a new password reset.');
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4 page-container relative overflow-hidden">
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
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Password Updated!</h2>
            <p className="text-xl text-gray-600 font-medium">
              Your password has been successfully updated. You'll be redirected to the login page shortly.
            </p>
          </div>

          <div className="card-premium p-8 text-center relative z-10 animate-fade-in-up">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
            </div>
            <p className="text-gray-600 font-medium">Redirecting to login...</p>
            
            <div className="mt-8">
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-500 font-semibold transition-colors"
              >
                Click here if you're not redirected automatically
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Set New Password</h2>
          <p className="text-xl text-gray-600 font-medium">Enter your new password below</p>
        </div>

        <div className="card-premium p-8 relative z-10 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-center space-x-3">
                <div className="bg-red-500 p-1.5 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                New Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword.password ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Enter your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, password: !prev.password }))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword.password ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showPassword.confirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Confirm your new password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword.confirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4 text-center">Password Requirement:</h4>
              <div className="text-center">
                <div className={`flex items-center justify-center space-x-2 ${password.length >= 6 ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-3 h-3 rounded-full ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="font-medium">At least 6 characters long</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-500 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>

        {/* Security Information */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 relative z-10">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-500 p-2 rounded-xl">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Security Tips</h3>
              <ul className="text-blue-700 text-sm space-y-1 font-medium">
                <li>• Use a unique password that you don't use elsewhere</li>
                <li>• Consider using a password manager</li>
                <li>• Don't share your password with anyone</li>
                <li>• Sign out when using shared devices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;