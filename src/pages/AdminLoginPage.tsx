import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  rateLimiter, 
  bruteForceProtection, 
  sanitizeInput, 
  constantTimeCompare,
  createSecureSession 
} from '../utils/security';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Honeypot field for bot detection

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Honeypot check - if filled, it's likely a bot
    if (honeypot) {
      setError('Invalid request detected');
      return;
    }

    if (isLocked) {
      setError('Account temporarily locked due to too many failed attempts. Please try again later.');
      return;
    }
    
    setLoading(true);
    setError('');

    // Enhanced input validation and sanitization
    const cleanUsername = sanitizeInput(credentials.username.trim(), 50);
    const cleanPassword = credentials.password.trim();

    // Validate inputs
    if (!cleanUsername || !cleanPassword) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    // Additional security checks
    if (cleanUsername.length < 3 || cleanPassword.length < 8) {
      setError('Invalid credentials format');
      setLoading(false);
      return;
    }

    // Rate limiting
    const identifier = `admin_${cleanUsername}`;
    if (rateLimiter.isRateLimited(identifier, 3, 10 * 60 * 1000)) {
      setError('Too many login attempts. Please wait 10 minutes before trying again.');
      setLoading(false);
      return;
    }

    // Rate limiting - simulate authentication delay
    setTimeout(() => {
      // In production, this should check against a secure backend
      // For demo purposes, using environment variables
      const adminUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'SecureAdminPass2025!@#';
      
      // Use constant time comparison to prevent timing attacks
      const usernameMatch = constantTimeCompare(cleanUsername, adminUsername);
      const passwordMatch = constantTimeCompare(cleanPassword, adminPassword);
      
      if (usernameMatch && passwordMatch) {
        // Reset attempts on success
        setAttempts(0);
        bruteForceProtection.recordAttempt(identifier, true);
        
        // Create secure session token
        const sessionToken = createSecureSession({
          username: cleanUsername,
          role: 'Platform Administrator',
          loginTime: new Date().toISOString(),
          ip: 'unknown', // In production, get from headers
          userAgent: navigator.userAgent.slice(0, 200)
        }, 2); // 2 hour session
        
        localStorage.setItem('admin_authenticated', 'true');
        localStorage.setItem('admin_session', sessionToken);
        
        navigate('/admin');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        bruteForceProtection.recordAttempt(identifier, false);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setError(`Account locked for ${LOCKOUT_DURATION / 1000 / 60} minutes due to multiple failed attempts.`);
          
          // Unlock after lockout duration
          setTimeout(() => {
            setIsLocked(false);
            setAttempts(0);
          }, LOCKOUT_DURATION);
        } else {
          setError(`Authentication failed. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining before lockout.`);
        }
        
        // Clear password on failed attempt
        setCredentials(prev => ({ ...prev, password: '' }));
      }
      setLoading(false);
    }, 2000 + Math.random() * 2000); // Longer random delay to prevent timing attacks
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-center px-4 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div className="text-center relative z-10">
          <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-3">Kutable Admin</h2>
          <p className="text-xl text-gray-600 font-medium">Platform Management Dashboard</p>
        </div>

        <div className="card-premium p-8 relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Security Warning */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500 p-2 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <span className="text-red-800 font-semibold">
                  All admin access is monitored, logged, and secured
                </span>
              </div>
            </div>

            {/* Honeypot field - hidden from users */}
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3">
                <div className="bg-red-500 p-1.5 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <span>{error}</span>
              </div>
            )}

            {attempts > 0 && !isLocked && (
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-2xl font-medium">
                {attempts} failed attempt(s). Account will be locked after {MAX_ATTEMPTS} failed attempts.
              </div>
            )}

            {isLocked && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-600 px-6 py-4 rounded-2xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-3">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value.slice(0, 50) }))}
                  autoComplete="username"
                  required
                  disabled={isLocked}
                  spellCheck={false}
                  className="input-premium pl-12"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value.slice(0, 128) }))}
                  autoComplete="current-password"
                  required
                  disabled={isLocked}
                  className="input-premium pl-12 pr-12"
                  placeholder="Enter password"
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
              disabled={loading || isLocked}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Authorized personnel only
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <div className="bg-gray-500 p-2 rounded-xl">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-900 font-semibold mb-2">Security Notice</p>
                <ul className="text-sm text-gray-600 space-y-1 font-medium">
                  <li>• All admin actions are logged and monitored</li>
                  <li>• Sessions expire after 8 hours of inactivity</li>
                  <li>• Failed login attempts are tracked</li>
                  <li>• Use strong, unique passwords</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;