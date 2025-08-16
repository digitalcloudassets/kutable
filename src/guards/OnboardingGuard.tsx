import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../lib/supabase';

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setOk(false); return; }

    const isBarber = user.user_metadata?.user_type === 'barber';
    if (!isBarber) { setOk(true); return; }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setOk(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (loading || ok === null) return <></>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // barber without profile -> onboarding
  if (user.user_metadata?.user_type === 'barber' && !ok) {
    return <Navigate to="/onboarding/barber" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

function OnboardingGuard2({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState({ checked: false, needsOnboarding: false, targetPath: null });

  const isOnOnboardingPath = location.pathname.startsWith('/onboarding');

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

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