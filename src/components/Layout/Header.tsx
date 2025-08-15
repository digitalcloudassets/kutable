import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Menu, X, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { chooseDashboard } from '../../utils/appScope';

const Header: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Publish real header height for the mobile app shell (used by vh-section, sticky composer, etc.)
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      if (document.body.classList.contains('app-shell')) {
        document.body.style.setProperty('--header-h', `${el.offsetHeight}px`);
      }
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('orientationchange', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const brandTo = session ? chooseDashboard(session) : '/';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div
      ref={rootRef}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100"
      role="banner"
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Brand */}
        <Link to={brandTo} className="flex items-center gap-2">
          {/* replace with your SVG if you have one */}
          <span className="text-2xl font-extrabold tracking-tight">Kutable</span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <Link
                to={`${chooseDashboard(session)}/messages`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                <MessageSquare className="h-4 w-4" />
                Messages
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Sign in
              </Link>
              <Link
                to="/get-started"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-500"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="container mx-auto px-4 py-3 space-y-2">
            {session ? (
              <>
                <Link
                  to={`${chooseDashboard(session)}/messages`}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 text-white px-3 py-2 text-sm hover:bg-black"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <User className="h-4 w-4" />
                  Sign in
                </Link>
                <Link
                  to="/get-started"
                  className="block rounded-xl bg-blue-600 text-white px-4 py-2 text-center text-sm font-semibold hover:bg-blue-500"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;