import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { validateEmail, sanitizeInput } from '../../utils/security';
import { devPreviewEnabled, shouldBypassConnectionChecks } from '../../lib/devFlags';

const LoginForm: React.FC = () => {
  const { isConnected: isSupabaseConnected, reason } = useSupabaseConnection();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = sanitizeInput(email.trim().toLowerCase(), 254);
    const cleanPassword = password.trim();

    // Basic validation
    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    // Validate email format
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Log connection status but don't block (unless in dev preview mode)
    if (!isSupabaseConnected && !shouldBypassConnectionChecks()) {
      console.warn('[Login] Connection check failed. Proceeding with auth attempt anyway.');
    }

    try {
      // In dev preview mode, show a helpful message instead of attempting real auth
      if (devPreviewEnabled()) {
        // Simulate successful login for dev preview
        setTimeout(() => {
          setLoading(false);
          navigate('/dashboard');
        }, 1000);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (authError) {
        // Handle fallback mode gracefully
        if (authError.message?.includes('Connect to Supabase to enable user accounts')) {
          setError('Database not connected. Please connect to Supabase to enable authentication.');
          return;
        }
        throw authError;
      }

      if (!data?.session) {
        throw new Error('No session returned from Supabase');
      }

      // Check user type and handle claim URL accordingly
      const { data: { user: authenticatedUser } } = await supabase.auth.getUser();
      const userType = authenticatedUser?.user_metadata?.user_type;
      
      // Check if user came from claim token flow
      const postLoginRedirect = sessionStorage.getItem('postLoginRedirect');
      if (postLoginRedirect) {
        sessionStorage.removeItem('postLoginRedirect');
        // Redirect back to claim token page
        navigate(postLoginRedirect);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      // Don't expose internal error details
      console.error('Login error:', error);
      
      // Handle fallback mode errors gracefully
      if (error.message?.includes('Connect to Supabase') || 
          error.message?.includes('fallback mode') ||
          error.message?.includes('using fallback')) {
        setError('Unable to sign in - database connection required. Please ensure Supabase is properly configured.');
      } else if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account before signing in.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
      // Clear password field on any error for security
      if (error) {
        setPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center px-4 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative z-10">
          <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <Mail className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Welcome back</h2>
          <p className="text-xl text-gray-600 font-medium">Sign in to your Kutable account</p>
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
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 254))}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors block w-full text-center"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
            >
              {loading && <Loader className="h-5 w-5 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Connection Warning - Non-blocking */}
          {isSupabaseConnected === false && !devPreviewEnabled() && (
            <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
                <div>
                  <p className="font-medium">Having trouble reaching the database ({reason ?? 'unknown'}).</p>
                  <p className="text-xs text-amber-700 mt-1">
                    You can still try signing in. Some features may be limited until connection is restored.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dev Preview Mode Banner */}
          {devPreviewEnabled() && (
            <div className="mt-6 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400" aria-hidden />
                <div>
                  <p className="font-medium">Development Preview Mode Active</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Authentication and database calls are simulated for preview. Connect to Supabase for full functionality.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;