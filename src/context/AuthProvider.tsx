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

  // Initial boot with a safety timeout so the splash can't be permanent
  useEffect(() => {
    let mounted = true;
    const bootTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[AuthProvider] Boot timeout → continuing without session');
        setLoading(false);
      }
    }, 5000); // shorter timeout is fine

    (async () => {
      let initialSession: Session | null = null;
      try {
        const { data: sessRes, error } = await supabase.auth.getSession();
        if (error) throw error;
        initialSession = sessRes?.session ?? null;
        if (!mounted) return;
        setSession(initialSession);
      } catch (err) {
        console.error('[AuthProvider] Boot error:', err);
        try { await repairAuthIfNeeded(err); } catch {}
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('[AuthProvider] READY →', { hasUser: !!initialSession?.user });
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      // Use Supabase's session directly; don't re-fetch here
      setSession(newSession ?? null);
      console.log('[AuthProvider] onAuthStateChange →', { hasUser: !!newSession?.user });
    });

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      sub?.subscription?.unsubscribe?.();
    };
  }, []); // ignore deps for this boot effect

  // One-time deferred avatar upload after login (defensive parsing)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!session?.user) return;

      const j = localStorage.getItem('kutable:pendingAvatar');
      if (!j) return;

      let pending: { role: 'clients' | 'barbers'; userId: string; name: string; b64: string } | null = null;
      try { pending = JSON.parse(j); } catch { localStorage.removeItem('kutable:pendingAvatar'); return; }
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
        console.warn('[AuthProvider] Deferred avatar upload failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, [session]);

  const value = useMemo<AuthCtx>(() => ({
    loading,
    session,
    user: session?.user ?? null,
  }), [loading, session]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}