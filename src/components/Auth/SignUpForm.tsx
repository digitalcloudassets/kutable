import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Scissors, Loader, AlertTriangle, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/uploadAvatar';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { 
  validatePassword, 
  validateEmail, 
  sanitizeInput, 
  rateLimiter,
  bruteForceProtection 
} from '../../utils/security';
import { adminSignup } from '../../lib/adminSignup';

const SignUpForm: React.FC = () => {
  const { isConnected: isSupabaseConnected } = useSupabaseConnection();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'client' as 'client' | 'barber',
    communicationConsent: false,
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Sanitize inputs
    const cleanFirstName = sanitizeInput(formData.firstName.trim(), 50);
    const cleanLastName = sanitizeInput(formData.lastName.trim(), 50);
    const cleanEmail = sanitizeInput(formData.email.trim().toLowerCase(), 254);
    const cleanPassword = formData.password.trim();

    if (!isSupabaseConnected) {
      setError('Database not connected. Please connect to Supabase to create an account.');
      setSubmitting(false);
      return;
    }

    // Enhanced validation
    if (!cleanFirstName || !cleanLastName) {
      setError('First name and last name are required');
      setSubmitting(false);
      return;
    }

    if (cleanFirstName.length < 2 || cleanLastName.length < 2) {
      setError('Names must be at least 2 characters long');
      setSubmitting(false);
      return;
    }

    if (cleanFirstName.length > 50 || cleanLastName.length > 50) {
      setError('Name fields must be 50 characters or less');
      setSubmitting(false);
      return;
    }

    // Validate email format
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address');
      setSubmitting(false);
      return;
    }

    if (cleanPassword !== formData.confirmPassword.trim()) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    // Enhanced password validation
    const passwordCheck = validatePassword(cleanPassword);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.errors[0]);
      setSubmitting(false);
      return;
    }

    if (!formData.communicationConsent) {
      setError('You must consent to receive communications to use this service');
      setSubmitting(false);
      return;
    }

    // Rate limiting protection  
    const identifier = cleanEmail;
    if (rateLimiter.isRateLimited(identifier, 3, 10 * 60 * 1000)) { // 3 attempts per 10 minutes
      setError('Too many signup attempts. Please wait 10 minutes before trying again.');
      setSubmitting(false);
      return;
    }

    // Check for disposable email domains (basic check)
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
    const emailDomain = cleanEmail.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      setError('Please use a permanent email address');
      setSubmitting(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            user_type: formData.userType,
            first_name: cleanFirstName,
            last_name: cleanLastName,
            communication_consent: formData.communicationConsent,
            sms_consent: formData.communicationConsent,
            email_consent: formData.communicationConsent,
            consent_date: new Date().toISOString(),
          }
        }
      });

      if (signUpError) {
        if (signUpError.message?.includes('already')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(signUpError.message || 'Failed to create account. Please try again.');
        }
        return;
      }

      const userId = data.user?.id;
      const hasSession = !!data.session;

      // Ensure a client profile row exists (safe upsert)
      if (userId && hasSession) {
        await supabase.from('client_profiles').upsert(
          { 
            user_id: userId, 
            first_name: cleanFirstName,
            last_name: cleanLastName,
            email: cleanEmail,
            communication_consent: formData.communicationConsent,
            sms_consent: formData.communicationConsent,
            email_consent: formData.communicationConsent,
            consent_date: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      }

      if (formData.userType === 'client') {
        if (hasSession) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate(`/login?email=${encodeURIComponent(cleanEmail)}&next=${encodeURIComponent('/dashboard')}`, { replace: true });
        }
        return;
      }

      // Barber: send to Stripe onboarding
      if (hasSession) {
        navigate('/onboarding/barber?step=account', { replace: true });
      } else {
        navigate(`/login?email=${encodeURIComponent(cleanEmail)}&next=${encodeURIComponent('/onboarding/barber?step=account')}`, { replace: true });
      }

    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.message?.includes('already')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(error?.message || 'Could not create your account. Please try again.');
      }
    } finally {
      setSubmitting(false);
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
          <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <User className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Create your account</h2>
          <p className="text-xl text-gray-600 font-medium">Join Kutable and start booking or managing appointments</p>
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

            {/* Account Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('userType', 'client')}
                  className={`p-6 border-2 rounded-2xl text-center transition-all duration-200 hover:scale-105 ${
                    formData.userType === 'client'
                      ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 shadow-premium'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                  }`}
                >
                  <User className="h-6 w-6 mx-auto mb-2" />
                  <span className="font-semibold">Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('userType', 'barber')}
                  className={`p-6 border-2 rounded-2xl text-center transition-all duration-200 hover:scale-105 ${
                    formData.userType === 'barber'
                      ? 'border-accent-500 bg-gradient-to-br from-accent-50 to-accent-100 text-accent-700 shadow-premium'
                      : 'border-gray-300 hover:border-accent-400 hover:bg-accent-50'
                  }`}
                >
                  <Scissors className="h-6 w-6 mx-auto mb-2" />
                  <span className="font-semibold">Barber</span>
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
               <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value.slice(0, 50))}
                  required
                  autoComplete="given-name"
                  spellCheck={false}
                 className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="First name"
                />
              </div>
              <div>
               <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value.slice(0, 50))}
                  required
                  autoComplete="family-name"
                  spellCheck={false}
                 className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Last name"
                />
              </div>
            </div>

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
                  type={showPassword.password ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value.slice(0, 128))}
                  required
                  autoComplete="new-password"
                 className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, password: !prev.password }))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword.password ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
             <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Confirm Password
              </label>
              <div className="relative">
               <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                 <Lock className="h-5 w-5 text-gray-400" />
               </div>
                <input
                  id="confirmPassword"
                  type={showPassword.confirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value.slice(0, 128))}
                  required
                  autoComplete="new-password"
                 className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 text-center"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword.confirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Communication Consent */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.communicationConsent}
                  onChange={(e) => handleInputChange('communicationConsent', e.target.checked)}
                  required
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded-lg focus:ring-primary-500 mt-1"
                />
                <div className="text-sm">
                  <span className="text-gray-900 font-semibold">
                    I consent to receive emails and SMS notifications *
                  </span>
                  <p className="text-gray-700 mt-2 leading-relaxed font-medium">
                    By checking this box, you agree to receive booking confirmations, appointment reminders, 
                    and important account updates via email and SMS. You can unsubscribe from marketing 
                    communications anytime, but transactional messages (booking confirmations, reminders) 
                    are necessary for the service.
                  </p>
                  <div className="mt-3 space-x-4">
                    <Link to="/privacy" className="text-primary-600 hover:text-primary-500 underline font-medium">
                      Privacy Policy
                    </Link>
                    <Link to="/terms" className="text-primary-600 hover:text-primary-500 underline font-medium">
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
            >
              {submitting && <Loader className="h-5 w-5 animate-spin" />}
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;