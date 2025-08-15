import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, getSession, getUser } from '../lib/supabaseClient';
import { repairAuthIfNeeded } from '../utils/authRepair';
import { uploadAvatar } from '../lib/uploadAvatar';

type AuthCtx = {
  loading: boolean;   // initial hydration/loading state
  session: Session | null;
  user: User | null;
};

const Ctx = createContext<AuthCtx>({ loading: true, session: null, user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // Initial session fetch with error handling
    (async () => {
      try {
        const session = await getSession();
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        const repaired = await repairAuthIfNeeded(error);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    })();

    // Subscribe to changes with error handling
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        return;
      }
      
      try {
        // Verify session is valid before setting it
        const verifiedSession = await getSession();
        setSession(verifiedSession);
      } catch (error) {
        const repaired = await repairAuthIfNeeded(error);
        setSession(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Process any deferred avatar immediately after first login (one-time)
  useEffect(() => {
    let cancelled = false;
    
    async function run() {
      if (!session?.user) return;
      
      const j = localStorage.getItem('kutable:pendingAvatar');
      if (!j) return;
      
      try {
        const pending = JSON.parse(j) as { role: 'clients'|'barbers'; userId: string; name: string; b64: string };
        if (!pending?.userId || pending.userId !== session.user.id) return;

        // Re-create the File from base64
        const bin = atob(pending.b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], pending.name || 'avatar.jpg', { type: 'image/jpeg' });

        const url = await uploadAvatar(file, session.user.id, pending.role);
        if (cancelled) return;

        // Persist to profile + user metadata
        if (pending.role === 'clients') {
          await supabase.from('client_profiles').update({ profile_image_url: url }).eq('user_id', session.user.id);
        } else {
          await supabase.from('barber_profiles').update({ profile_image_url: url }).eq('user_id', session.user.id);
        }
        await supabase.auth.updateUser({ data: { avatar_url: url } });

        localStorage.removeItem('kutable:pendingAvatar');
      } catch {
        console.warn('Avatar upload failed during auth restore, user can retry later');
      }
    }
    
    run();
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