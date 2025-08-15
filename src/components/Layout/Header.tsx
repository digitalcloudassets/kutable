import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Menu, X, Scissors, Crown, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useMessaging } from '../../hooks/useMessaging';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { logger } from '../../utils/logger';
import { chooseDashboard } from '../../utils/appScope';
import AdminGuardBanner from '../Debug/AdminGuardBanner';

const Header: React.FC = () => {
  // ✅ Always call hooks at top-level, every render
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { unreadCount } = useMessaging();
  const { allowed: isAdmin, loading: adminLoading } = useAdminGuard();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty('--site-header-h', `${el.offsetHeight || 64}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    window.addEventListener('resize', set);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', set);
    };
  }, []);

  // Check admin route and admin status
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.log('Sign out error:', error);
    } finally {
      localStorage.removeItem('sb-' + (import.meta.env.VITE_SUPABASE_URL?.split('://')[1]?.split('.')[0] || 'auth') + '-auth-token');
      setMobileMenuOpen(false);
      setTimeout(() => {
        navigate('/');
      }, 100);
    }
  };

  const isHomePage = location.pathname === '/';

  const brandTo = user ? chooseDashboard({ user } as any) : '/';

  // ❌ No early return. We render the same component tree each time.
  //    We just hide it when we're on /admin.
  return (
    <>
      <AdminGuardBanner />
      <header ref={headerRef} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20 ${
        scrolled || !isHomePage 
          ? 'glass-effect border-b border-white/10 shadow-premium-lg' 
          : 'bg-transparent'
      }`}
        style={isAdminRoute ? { display: 'none' } : undefined}
        data-role="global-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to={brandTo} className="flex items-center space-x-3 group">
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
            <nav className="hidden md:flex items-center space-x-6">
            </nav>

            {/* User Actions */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              {authLoading ? (
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
                  {/* Admin Link - Only show for verified admin users */}
                  {isAdmin && (
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

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-white/95 backdrop-blur-sm">
              <div className="px-4 py-4 space-y-2">
                
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    {isAdmin && !adminLoading && (
                      <Link
                        to="/admin"
                        className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="block px-4 py-3 bg-primary-500 text-white rounded-xl transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;