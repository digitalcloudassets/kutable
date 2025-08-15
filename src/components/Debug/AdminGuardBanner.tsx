import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

function isDebugOn() {
  // Show ONLY when explicitly enabled and not in production
  return import.meta.env.VITE_SHOW_ADMIN_DEBUG === 'true' && import.meta.env.MODE !== 'production';
}

export default function AdminGuardBanner() {
  const debug = isDebugOn();
  if (!debug) return null;

  const { session /* optionally: hydrated */ } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { pathname } = useLocation();

  // ✅ Do NOT show anything when signed out
  if (!session) return null;

  // Optional: don't clutter public pages—only show on /admin or dashboard areas.
  const inScopedArea = useMemo(
    () => pathname.startsWith('/admin') || pathname.startsWith('/dashboard'),
    [pathname],
  );
  if (!inScopedArea) return null;

  // Wait for guard to finish
  if (profileLoading) return null;

  // Hide if allowed
  if (profile?.is_admin) return null;

  // Dismiss state (per path)
  const key = `adminBanner:dismissed:${pathname}`;
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(key) === '1');
  if (dismissed) return null;

  // Map common reasons to friendly text
  const msg =
    profileError === 'Forbidden'
      ? 'Your account is signed in but not authorized for admin access.'
      : profileError || 'Not authorized.';

  return (
    <div className="mx-2 my-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-center justify-between">
      <div>
        <div className="font-medium">Admin Access Notice</div>
        <div className="mt-0.5">{msg}</div>
      </div>
      <button
        className="rounded border border-amber-300 px-3 py-1 text-amber-900 hover:bg-amber-100"
        onClick={() => {
          try { localStorage.setItem(key, '1'); } catch {}
          setDismissed(true);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}