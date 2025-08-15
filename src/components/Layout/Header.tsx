import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { logger } from '../../utils/logger';

const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Normalize admin state from the hook you already have
  const {
    loading: adminLoading,
    allowed: isAdmin,
    error: adminError,
  } = useAdminGuard();

  // Optional: surface guard errors in dev only
  useEffect(() => {
    if (adminError && import.meta.env.DEV) {
      logger.warn('Admin guard error:', adminError);
    }
  }, [adminError]);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded hover:bg-gray-100"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="font-bold">
            Kutable
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-4">
          <NavLink
            to="/barbers"
            className={({ isActive }) =>
              `px-3 py-2 rounded ${isActive ? 'text-black' : 'text-gray-600 hover:text-black'}`
            }
          >
            Find a Barber
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `px-3 py-2 rounded ${isActive ? 'text-black' : 'text-gray-600 hover:text-black'}`
            }
          >
            Pricing
          </NavLink>
          {/* Show Admin only when verified */}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-2 rounded border ${isActive ? 'bg-black text-white border-black' : 'border-gray-200 hover:bg-gray-50'}`
              }
            >
              Admin
            </NavLink>
          )}
          <NavLink
            to="/dashboard/barber"
            className="px-3 py-2 rounded bg-black text-white"
          >
            Create my page
          </NavLink>
        </nav>
      </div>

      {/* Mobile drawer (simple, keep your existing styling if you had one) */}
      {mobileOpen && (
        <div className="md:hidden border-t">
          <div className="mx-auto max-w-6xl px-4 py-2 flex flex-col">
            <NavLink to="/barbers" className="px-3 py-2 rounded hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
              Find a Barber
            </NavLink>
            <NavLink to="/pricing" className="px-3 py-2 rounded hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
              Pricing
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className="px-3 py-2 rounded hover:bg-gray-50" onClick={() => setMobileOpen(false)}>
                Admin
              </NavLink>
            )}
            <NavLink to="/dashboard/barber" className="mt-1 px-3 py-2 rounded bg-black text-white" onClick={() => setMobileOpen(false)}>
              Create my page
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;