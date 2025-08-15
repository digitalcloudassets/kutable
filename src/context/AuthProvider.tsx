import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthState = {
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
};

const AuthCtx = createContext<AuthState>({ session: null, loading: true });

async function healSession(): Promise<import('@supabase/supabase-js').Session | null> {
  // 1) Load current session
  const { data: { session } } = await supabase.auth.getSession();

  // No session -> nothing to heal
  if (!session) return null;

  // 2) Try a refresh; if it fails with "session_not_found", wipe locally
  const { data, error } = await supabase.auth.refreshSession();
  if (error?.message?.toLowerCase().includes('session_not_found')) {
    // Local-only sign out to clear bad tokens; don't revoke server session we don't own.
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    return null;
  }

  // 3) Return fresh session if available
  return data?.session ?? session;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await healSession();
        if (!cancelled) setSession(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      // Whenever auth changes, attempt a light heal then publish the latest session.
      const healed = await healSession();
      if (!cancelled) setSession(healed);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);