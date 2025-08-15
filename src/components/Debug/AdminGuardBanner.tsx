import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../hooks/useAdminGuard';

const SHOW =
  import.meta.env.DEV || String(import.meta.env.VITE_SHOW_ADMIN_BANNER).toLowerCase() === 'true';

export default function AdminGuardBanner() {
  // Optional kill-switch
  if (!SHOW) return null;

  const [hasSession, setHasSession] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('hideAdminBanner') === '1';
  });

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setHasSession(!!session);
    });

    // React to login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setHasSession(!!session);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Don't render until the user is logged in
  if (!hasSession || dismissed) return null;

  const { loading, allowed, error } = useAdminGuard();

  // Only show when we have a session AND the guard says not allowed (or errored)
  if (loading || allowed) return null;

  const hide = () => {
    sessionStorage.setItem('hideAdminBanner', '1');
    setDismissed(true);
  };

  return (
    // Wrapper never blocks clicks to the page
    <div className="pointer-events-none fixed inset-x-0 top-14 z-30">
      <div className="pointer-events-auto mx-auto max-w-6xl px-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow">
          <div className="flex items-start gap-2">
            <div className="font-medium">Admin Access Notice</div>
            <button
              onClick={hide}
              className="ml-auto rounded p-1 text-amber-900/70 hover:bg-amber-100"
              aria-label="Dismiss admin notice"
            >
              <X size={16} />
            </button>
          </div>
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
    </div>
  );
}