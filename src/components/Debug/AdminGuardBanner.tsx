import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../hooks/useAdminGuard';

export default function AdminGuardBanner() {
  // Never show in production
  if (!import.meta.env.DEV) return null;

  const [hasSession, setHasSession] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setHasSession(!!session);
    });
    // Live updates
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setHasSession(!!session);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Don't render anything until a session exists
  if (!hasSession) return null;

  const { loading, allowed, error } = useAdminGuard();
  if (loading || allowed) return null;

  return (
    <div
      className="
        pointer-events-none
        fixed inset-x-0 top-14 z-10
        mx-auto max-w-6xl px-4
      "
    >
      <div className="pointer-events-auto rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow">
        <div className="font-medium">Admin Access Notice</div>
        <div className="mt-1">
          {error ? (
            <>
              Could not verify admin access: <code className="font-mono">{String(error)}</code>
            </>
          ) : (
            'Not authorized.'
          )}
        </div>
      </div>
    </div>
  );
}