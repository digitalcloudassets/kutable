import { useEffect, useState } from 'react';
import { supabase, validateSession, clearSupabaseSessionStorage } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<ReturnType<typeof getUserShape> | null>(null);
  const [loading, setLoading] = useState(true);

  function getUserShape(u: any) {
    return u ? { id: u.id, email: u.email, user_metadata: u.user_metadata } : null;
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Step 1: validate session quickly
      const { isValid } = await validateSession();
      if (!isValid) {
        if (mounted) { setUser(null); setLoading(false); }
        return;
      }

      // Step 2: fetch the current user safely (now there is a session)
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) {
        // Safety: if backend still says session invalid, nuke and continue as logged-out
        if (error.message?.toLowerCase().includes('session_not_found')) {
          try { await supabase.auth.signOut(); } catch {}
          clearSupabaseSessionStorage();
        }
        setUser(null);
      } else {
        setUser(getUserShape(data.user));
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(getUserShape(session?.user || null));
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}