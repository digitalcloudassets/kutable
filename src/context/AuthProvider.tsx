import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { repairAuthIfNeeded } from '../utils/authRepair';
import { uploadAvatar } from '../lib/uploadAvatar';

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  user: User | null;
};

const Ctx = createContext<AuthCtx>({ loading: true, session: null, user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Initial boot with a safety timeout
  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth boot timeout -> continuing without session');
        setLoading(false);
      }
    }, 8000);

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(data.session ?? null);
      } catch (err) {
        console.error('Auth boot error:', err);
        try {
          await repairAuthIfNeeded(err);
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      // Do not re-call getSession here; use what Supabase gives us
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      sub?.subscription?.unsubscribe?.();
    };
  }, []); // eslint-disable-line

  // One-time deferred avatar upload after login
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session?.user) return;

      const j = localStorage.getItem('kutable:pendingAvatar');
      if (!j) return;

      let pending: { role: 'clients' | 'barbers'; userId: string; name: string; b64: string } | null = null;
      try {
        pending = JSON.parse(j);
      } catch {
        // Bad JSON; clean up and bail
        localStorage.removeItem('kutable:pendingAvatar');
        return;
      }
      if (!pending || pending.userId !== session.user.id) return;

      try {
        const bin = atob(pending.b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], pending.name || 'avatar.jpg', { type: 'image/jpeg' });

        const url = await uploadAvatar(file, session.user.id, pending.role);
        if (cancelled) return;

        if (pending.role === 'clients') {
          await supabase.from('client_profiles').update({ profile_image_url: url }).eq('user_id', session.user.id);
        } else {
          await supabase.from('barber_profiles').update({ profile_image_url: url }).eq('user_id', session.user.id);
        }
        await supabase.auth.updateUser({ data: { avatar_url: url } });

        localStorage.removeItem('kutable:pendingAvatar');
      } catch (e) {
        console.warn('Deferred avatar upload failed:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
    }),
    [loading, session]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
