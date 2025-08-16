import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type GuardState = {
  checked: boolean;        // we've finished checking DB
  needsOnboarding: boolean;
  targetPath: string | null;
};

const initialState: GuardState = {
  checked: false,
  needsOnboarding: false,
  targetPath: null,
};

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  // ✅ Hooks always run in the same order/count
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [state, setState] = useState<GuardState>(initialState);

  // Compute whether the current path is already an allowed onboarding page
  const isOnOnboardingPath = useMemo(() => {
    const p = location.pathname;
    return p.startsWith('/onboarding') || p.startsWith('/onboarding/barber');
  }, [location.pathname]);

  // DB check happens in an effect; never return early during render
  useEffect(() => {
    let cancelled = false;

    // If auth is still resolving, just wait (don't mutate state yet)
    if (authLoading) return;

    // When signed out, nothing to enforce
    if (!user) {
      if (!cancelled) setState({ checked: true, needsOnboarding: false, targetPath: null });
      return;
    }

    // Signed in: figure out which profile they need
    (async () => {
      try {
        // Infer intended role from metadata; default to "client"
        const intended = (user.user_metadata?.user_type as 'barber' | 'client' | undefined) ?? 'client';

        if (intended === 'barber') {
          const { data, error } = await supabase
            .from('barber_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          const needs = !!error || !data;
          if (!cancelled) {
            setState({
              checked: true,
              needsOnboarding: needs,
              targetPath: needs ? '/onboarding/barber' : null,
            });
          }
          return;
        }

        // client path
        const { data, error } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const needs = !!error || !data;
        if (!cancelled) {
          setState({
            checked: true,
            needsOnboarding: needs,
            targetPath: needs ? '/onboarding' : null,
          });
        }
      } catch (_e) {
        // If the probe fails, don't block the app—just let them through
        if (!cancelled) {
          setState({ checked: true, needsOnboarding: false, targetPath: null });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, user]);

  // Navigate only from an effect to avoid render-phase side effects
  useEffect(() => {
    if (!state.checked) return;
    if (!state.needsOnboarding || !state.targetPath) return;

    // Avoid redirect loops: if we're already on the proper onboarding path, do nothing
    if (isOnOnboardingPath && location.pathname.startsWith(state.targetPath)) return;

    navigate(state.targetPath, { replace: true });
  }, [state, isOnOnboardingPath, location.pathname, navigate]);

  // ✅ Always render children (no early returns = stable hook order)
  // If a redirect is needed, the effect above will handle it.
  return <>{children}</>;
}