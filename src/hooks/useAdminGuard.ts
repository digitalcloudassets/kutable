import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';

type State = { loading: boolean; allowed: boolean | null; error: string | null };

export function useAdminGuard(): State {
  const { session } = useAuth();
  const [state, setState] = useState<State>({ loading: true, allowed: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function check(allowRetry = true) {
      if (!session) {
        if (!cancelled) setState({ loading: false, allowed: false, error: 'No session' });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('admin-guard', { body: {} });
        if (cancelled) return;

        if (error) {
          // If we got a wrapped 401/403 due to stale token, refresh once and retry.
          const msg = error.message?.toLowerCase() ?? '';
          if (allowRetry && (msg.includes('unauthenticated') || msg.includes('session_not_found'))) {
            await supabase.auth.refreshSession().catch(() => {});
            return check(false);
          }
          setState({ loading: false, allowed: false, error: error.message ?? 'Edge call failed' });
          return;
        }

        if (!data?.ok) {
          // admin-guard explicit denials
          setState({ loading: false, allowed: false, error: data?.reason ?? 'Forbidden' });
          return;
        }

        setState({ loading: false, allowed: true, error: null });
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, allowed: false, error: String(e?.message ?? e) });
      }
    }

    setState({ loading: true, allowed: null, error: null });
    check(true);

    return () => { cancelled = true; };
  }, [session?.access_token]); // re-run if token changes

  return state;
}