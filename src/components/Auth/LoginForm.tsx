import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams, useEffect } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Loader, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { 
  validateEmail, 
  sanitizeInput, 
  rateLimiter,
  bruteForceProtection 
} from '../../utils/security';

const LoginForm: React.FC = () => {
  const { isConnected: isSupabaseConnected } = useSupabaseConnection();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Prefill email from URL parameter
  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail && !formData.email) {
      setFormData(prev => ({ ...prev, email: qEmail }));
    }
  }, [searchParams, formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Sanitize inputs
    const cleanEmail = sanitizeInput(formData.email.trim().toLowerCase(), 254);
    const cleanPassword = formData.password.trim();

    if (!isSupabaseConnected) {
      setError('Database not connected. Please connect to Supabase to sign in.');
      setLoading(false);
      return;
    }

    // Enhanced validation
    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in both email and password');
      setLoading(false);
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Rate limiting protection
    const identifier = cleanEmail;
    if (rateLimiter.isRateLimited(identifier, 5, 15 * 60 * 1000)) { // 5 attempts per 15 minutes
      setError('Too many login attempts. Please wait 15 minutes before trying again.');
      setLoading(false);
      return;
    }

    // Brute force protection
    if (bruteForceProtection.isBlocked(identifier)) {
      setError('Account temporarily locked due to multiple failed attempts. Please try again later.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (signInError) {
        // Record failed attempt for brute force protection
        bruteForceProtection.recordAttempt(identifier, false);
        
        // Handle specific Supabase auth errors
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link to activate your account.');
        } else if (signInError.message.includes('Too many requests')) {
          setError('Too many sign-in attempts. Please wait a few minutes before trying again.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Record successful attempt
        bruteForceProtection.recordAttempt(identifier, true);
        
        // Navigate to next URL or dashboard based on user type
        const next = searchParams.get('next');
        const userType = data.user.user_metadata?.user_type;
        
        let redirectUrl = '/dashboard';
        if (next) {
          redirectUrl = next;
        } else if (userType === 'barber') {
          redirectUrl = '/dashboard/barber';
        } else {
          redirectUrl = '/dashboard';
        }
        
        navigate(next);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      bruteForceProtection.recordAttempt(identifier, false);
      
      if (error.message?.includes('Connect to Supabase')) {
        setError('Database not connected. Please connect to Supabase to sign in.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col items-center justify-center px-4 py-8 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative z-10">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <User className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Welcome back</h2>
          <p className="text-xl text-gray-600 font-medium">Sign in to your Kutable account</p>
        </div>

        <div className="card-premium p-8 relative z-10 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-center space-x-3">
                <div className="bg-red-500 p-1.5 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Email */}
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
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value.slice(0, 254))}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
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
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value.slice(0, 128))}
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
            >
              {loading && <Loader className="h-5 w-5 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-primary-600 hover:text-primary-500 font-semibold transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Security Information */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 relative z-10">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-500 p-2 rounded-xl">
              <Lock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-800 mb-2">Secure Sign In</h3>
              <ul className="text-blue-700 text-sm space-y-1 font-medium">
                <li>• Bank-level encryption protects your data</li>
                <li>• Rate limiting prevents unauthorized access</li>
                <li>• Secure session management</li>
                <li>• Industry-standard authentication</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;