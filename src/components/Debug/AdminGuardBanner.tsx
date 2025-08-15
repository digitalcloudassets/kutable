import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const isDebugOn = () => import.meta.env.VITE_SHOW_ADMIN_DEBUG === 'true' && import.meta.env.MODE !== 'production';

export default function AdminGuardBanner() {
  if (!isDebugOn()) return null;

  const { session } = useAuth();
  const { loading, allowed, error } = useAdminGuard();
  const { pathname } = useLocation();

  if (!session) return null; // ✅ hides banner when signed out

  const scoped = useMemo(() => pathname.startsWith('/admin') || pathname.startsWith('/dashboard'), [pathname]);
  if (!scoped || loading || allowed) return null;

  const key = `adminBanner:dismissed:${pathname}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(key) === '1');
  if (dismissed) return null;

  const msg = error?.toLowerCase().includes('forbidden')
    ? 'You are signed in but not authorized for admin access.'
    : error || 'Not authorized.';

  return (
    <div className="mx-2 my-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex items-center justify-between">
      <div>
        <div className="font-medium">Admin Access Notice</div>
        <div className="mt-0.5">{msg}</div>
      </div>
      <button
        className="rounded border border-amber-300 px-3 py-1 text-amber-900 hover:bg-amber-100"
        onClick={() => { try { localStorage.setItem(key, '1'); } catch {} setDismissed(true); }}
      >
        Dismiss
      </button>
    </div>
  );
}