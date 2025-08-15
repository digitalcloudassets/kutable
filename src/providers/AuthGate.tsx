import React from 'react';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabaseClient';

type Props = { children: React.ReactNode };

export default function AuthGate({ children }: Props) {
  const { loading, user } = useAuth();

  const [ready, setReady] = React.useState(false);
  const [reason, setReason] = React.useState<'boot'|'no-user'|'ok'|'profile-error'|'timeout'>('boot');

  React.useEffect(() => {
    let alive = true;

    const run = async () => {
      // 1) Wait for AuthProvider to settle, but cap at 6s
      const start = Date.now();
      while (loading && Date.now() - start < 6000) {
        await new Promise(r => setTimeout(r, 50));
      }

      // 2) If no user after auth settles, allow the app to render (your login UI should handle it)
      if (!user) {
        if (!alive) return;
        setReason('no-user');
        setReady(true);
        return;
      }

      // 3) Minimal profile ensure, with a hard 3s cap so we never spin forever
      try {
        const ensure = async () => {
          const { data, error } = await supabase
            .from('barber_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (error) throw error;
          // You can add lightweight "create if missing" here if you have an Edge Function
          return true;
        };

        const ok = await Promise.race([
          ensure().then(() => true),
          new Promise<boolean>(res => setTimeout(() => res(false), 3000))
        ]);

        if (!alive) return;

        if (!ok) {
          console.warn('[AuthGate] profile check timed out → proceeding');
          setReason('timeout');
          setReady(true);
          return;
        }

        setReason('ok');
        setReady(true);
      } catch (e) {
        console.error('[AuthGate] profile ensure failed:', e);
        if (!alive) return;
        // Fail open: render the app with a soft error
        setReason('profile-error');
        setReady(true);
      }
    };

    run();
    return () => { alive = false; };
  }, [loading, user?.id]); // important: re-run when loading flips OR user changes

  // Breadcrumbs
  console.log('[AuthGate] render', { ready, authed: !!user, reason });

  if (!ready) {
    console.log('[AuthGate] showing spinner (not ready)');
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Loading Kutable…
      </div>
    );
  }

  // Optional: tiny banner if we failed open (won't block UI)
  if (reason === 'profile-error' || reason === 'timeout') {
    console.warn('[AuthGate] soft error:', reason);
  }

  return <>{children}</>;
}