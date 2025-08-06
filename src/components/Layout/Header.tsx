import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Menu, X, Scissors, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
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
    await supabase.auth.signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isHomePage = location.pathname === '/';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || !isHomePage 
        ? 'glass-effect border-b border-white/10 shadow-premium-lg' 
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
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
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/barbers"
              className={`font-medium transition-all duration-200 hover:scale-105 px-3 py-2 rounded-lg ${
                isHomePage && !scrolled ? 'text-white hover:text-accent-300' : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Find Barbers
            </Link>
            <Link
              to="/how-it-works"
              className={`font-medium transition-all duration-200 hover:scale-105 px-3 py-2 rounded-lg ${
                isHomePage && !scrolled ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              How It Works
            </Link>
            <Link
              to="/pricing"
              className={`font-medium transition-all duration-200 hover:scale-105 px-3 py-2 rounded-lg ${
                isHomePage && !scrolled ? 'text-white/90 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pricing
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
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
                </Link>
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
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-effect border-t border-white/10 mt-4 p-4 rounded-2xl mb-4 animate-scale-in">
            <nav className="space-y-1">
              <Link
                to="/barbers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-4 px-4 font-medium text-gray-700 hover:text-primary-600 transition-colors rounded-xl hover:bg-gray-100 min-h-[48px] flex items-center"
              >
                Find Barbers
              </Link>
              <Link
                to="/how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-4 px-4 font-medium text-gray-600 hover:text-gray-800 transition-colors rounded-xl hover:bg-gray-100 min-h-[48px] flex items-center"
              >
                How It Works
              </Link>
              <Link
                to="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-4 px-4 font-medium text-gray-600 hover:text-gray-800 transition-colors rounded-xl hover:bg-gray-100 min-h-[48px] flex items-center"
              >
                Pricing
              </Link>
              
              <div className="border-t border-gray-200 pt-4 space-y-2 mt-4">
                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 py-4 px-4 font-medium text-gray-700 hover:text-primary-600 transition-colors rounded-xl hover:bg-gray-100 min-h-[48px]"
                    >
                      <User className="h-5 w-5" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-3 py-4 px-4 font-medium text-gray-600 hover:text-gray-800 transition-colors rounded-xl hover:bg-gray-100 w-full text-left min-h-[48px]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-4 px-4 font-medium text-gray-700 hover:text-primary-600 transition-colors rounded-xl hover:bg-gray-100 min-h-[48px] flex items-center"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-primary w-full justify-center mt-3 min-h-[48px]"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;