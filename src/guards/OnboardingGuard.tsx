import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { computeOnboardingState } from '../utils/onboarding';

type Props = { children: React.ReactNode };

export default function OnboardingGuard({ children }: Props) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = React.useState(true);
  const nav = useNavigate();
  const loc = useLocation();

  React.useEffect(() => {
    let alive = true;

    const run = async () => {
      const start = Date.now();
      while (loading && Date.now() - start < 4000) {
        await new Promise(r => setTimeout(r, 50));
      }

      if (!user?.id) { 
        setChecking(false); 
        return; 
      }

      try {
        const state = await computeOnboardingState(user.id);
        const onOnboarding = loc.pathname.startsWith('/onboarding') || loc.search.includes('step=');

        if (state === 'complete') {
          localStorage.setItem('kutable:returning', '1');
          setChecking(false);
          return;
        }

        if (state === 'needs_payouts' && !onOnboarding) {
          nav('/onboarding/barber?step=payouts', { replace: true });
          return;
        }

        if (state === 'needs_profile' && !onOnboarding) {
          nav('/onboarding', { replace: true });
          return;
        }

        setChecking(false);
      } catch (e) {
        console.warn('[OnboardingGuard] checker failed, failing open:', e);
        setChecking(false);
      }
    };

    if (alive) {
      run();
    }
    return () => { alive = false; };
  }, [user?.id, loading, nav, loc.pathname, loc.search]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <p className="text-gray-600 font-medium">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}