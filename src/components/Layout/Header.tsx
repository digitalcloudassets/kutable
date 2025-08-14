import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Menu, X, Scissors, Crown, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMessaging } from '../../hooks/useMessaging';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const { unreadCount } = useMessaging();
  const { allowed: isAdmin, loading: adminLoading, errorMsg: adminError } = useAdminGuard();
  
  // Enhanced debug logging
  useEffect(() => {
    if (user) {
      console.log('🔐 Header Debug - Admin Check:', {
        userId: user.id,
        userEmail: user.email,
        isAdmin,
        adminLoading,
        userLoading: loading,
        hasAdminGuard: !!isAdmin || adminLoading,
        adminErrorMsg: adminError
      });
    }
  }, [user, isAdmin, adminLoading, loading, adminError]);

  // Show admin error in development for debugging
  useEffect(() => {
    if (adminError && import.meta.env.DEV) {
      // Only log as error if it's not a development mode issue
      if (adminError.includes('fallback mode') || adminError.includes('Development environment detected') || adminError.includes('WebContainer')) {
        console.log('ℹ️  Admin Guard:', adminError);
      } else {
        console.error('🔐 Admin Guard Error:', adminError);
      }
    }
  }, [adminError]);
  
  // Enhanced debug logging
  useEffect(() => {
    if (user) {
      console.log('🔐 Header Debug - Admin Check:', {
        userId: user.id,
        userEmail: user.email,
        isAdmin,
        adminLoading,
        userLoading: loading,
        hasAdminGuard: !!isAdmin || adminLoading,
        adminErrorMsg: adminError
      });
    }
  }, [user, isAdmin, adminLoading, loading, adminError]);

  // Show admin error in development for debugging
  useEffect(() => {
    if (adminError && import.meta.env.DEV) {
      console.error('🔐 Admin Guard Error:', adminError);
    }
  }, [adminError]);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      // Check if there's an active session before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      // Handle sign out errors gracefully - session may already be invalid
      console.log('Sign out error:', error);
    } finally {
      // Always navigate and close menu, regardless of logout success
      // Force clear any local storage or session data
      localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('://')[1]?.split('.')[0] || 'auth') + '-auth-token');
      setMobileMenuOpen(false);
      // Navigate after a brief delay to allow auth state to update
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  };

  const isHomePage = location.pathname === '/';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20 ${
      scrolled || !isHomePage 
        ? 'glass-effect border-b border-white/10 shadow-premium-lg' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img 
                src="/Kutable Logo.png" 
                alt="Kutable Logo" 
                className="h-10 w-auto transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute -inset-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur-md"></div>
            </div>
            <span className="text-2xl font-display font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              Kutable
            </span>
          </Link>

          {/* Desktop Navigation */}

          {/* User Actions */}
          <div className="flex items-center space-x-3 lg:space-x-4">
            {loading ? (
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-2 font-medium transition-all duration-200 hover:scale-105 px-4 py-2 rounded-xl ${
                    isHomePage && !scrolled 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span>Dashboard</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                {/* Admin Link - Only show for admin users */}
                {isAdmin && !adminLoading && (
                  <Link
                    to="/admin"
                    className={`flex items-center space-x-2 font-medium transition-all duration-200 hover:scale-105 px-4 py-2 rounded-xl ${
                      isHomePage && !scrolled 
                        ? 'text-white hover:bg-white/10' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Crown className="h-5 w-5" />
                    <span>Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className={`flex items-center space-x-2 font-medium transition-all duration-200 hover:scale-105 px-4 py-2 rounded-xl ${
                    isHomePage && !scrolled 
                      ? 'text-white/80 hover:text-white hover:bg-white/10' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  to="/login"
                  className={`font-medium transition-all duration-200 hover:scale-105 px-4 py-2 rounded-xl ${
                    isHomePage && !scrolled 
                      ? 'text-white hover:bg-white/10' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary flex items-center space-x-2"
                >
                  <Crown className="h-4 w-4" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-all duration-200 ${
                isHomePage && !scrolled 
                  ? 'text-white hover:bg-white/10' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;