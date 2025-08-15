import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { decideRoleAndState, type UserRole } from '../utils/onboarding';

type Props = { children: React.ReactNode };

export default function OnboardingGuard({ children }: Props) {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    const run = async () => {
      // wait for auth settle (max 4s)
      const start = Date.now();
      while (loading && Date.now() - start < 4000) {
        await new Promise(r => setTimeout(r, 50));
      }

      const uid = user?.id ?? null;
      if (!uid) { 
        setChecking(false); 
        return; // let login UI handle it
      }

      /** 🚨 TEMP BYPASS: allow specific barber(s) to enter unconditionally */
      const ALLOW_UIDS = new Set<string>([
        // Add your barber's auth.users.id here
        // 'YOUR_BARBER_AUTH_USER_ID',
      ]);
      const ALLOW_EMAILS = new Set<string>([
        'pete@kutable.com', // Add barber emails here
      ]);

      if (ALLOW_UIDS.has(uid) || ALLOW_EMAILS.has((user.email ?? '').toLowerCase())) {
        localStorage.setItem('kutable:lastRole', 'barber');
        localStorage.setItem('kutable:returning', '1');
        setChecking(false);
        return;
      }

      try {
        const lastRolePref = (localStorage.getItem('kutable:lastRole') as UserRole | null) ?? undefined;
        const { role, state } = await decideRoleAndState(uid, lastRolePref);

        console.log('[OnboardingGuard] decision', {
          uid, email: user.email, role, state, path: loc.pathname, search: loc.search
        });

        // mark returning once they pass guard
        localStorage.setItem('kutable:returning', '1');

        const onOnboarding = loc.pathname.startsWith('/onboarding') || loc.search.includes('step=');

        // Route rules:
        // - Barbers → payouts if needed; else let them in
        // - Clients → let them in
        // - Unknown → onboarding
        if (role === 'barber' && state === 'needs_payouts' && !onOnboarding) {
          nav('/onboarding/barber?step=payouts', { replace: true });
          return;
        }
        if (role === 'unknown' && state === 'needs_profile' && !onOnboarding) {
          nav('/onboarding', { replace: true });
          return;
        }

        setChecking(false);
      } catch (e) {
        console.warn('[OnboardingGuard] fail-open due to error:', e);
        setChecking(false);
      }
    };

    run();
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