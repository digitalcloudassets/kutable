import { useEffect, useState } from 'react';
import { getUser } from '../lib/supabaseClient';
import { repairAuthIfNeeded } from '../utils/authRepair';
import { shouldBypassAdminGuards } from '../lib/devFlags';

type AdminGuardState = {
  loading: boolean;
  allowed: boolean;
  error: string | null;
};

export function useAdminGuard(): AdminGuardState {
  const [state, setState] = useState<AdminGuardState>({
    loading: true,
    allowed: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    
    (async () => {
      // Bypass admin guards in preview environments to prevent network errors
      if (shouldBypassAdminGuards()) {
        if (mounted) {
          setState({ loading: false, allowed: true, error: null });
        }
        return;
      }

      try {
        const user = await getUser();
        
        if (!mounted) return;

        if (!user) {
          setState({ loading: false, allowed: false, error: 'No session' });
          return;
        }

        const email = (user.email ?? '').toLowerCase();

        // Only use whitelist if the env var exists.
        const raw = (import.meta.env.VITE_ADMIN_EMAILS as string | undefined);
        const whitelist = raw
          ? raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
          : [];

        const allowByEmail = raw ? whitelist.includes(email) : false;

        // Prefer secure app_metadata for admin gating
        const app = (user as any).app_metadata ?? {};
        const userMeta = (user as any).user_metadata ?? {};

        // Only trust app_metadata in production; user_metadata allowed in DEV as fallback
        const allowByMeta =
          app.role === 'admin' ||
          app.is_admin === true ||
          (import.meta.env.DEV && (userMeta.role === 'admin' || userMeta.is_admin === true));

        const allowed = allowByEmail || allowByMeta;

        setState({ loading: false, allowed, error: allowed ? null : 'Forbidden' });
      } catch (err: any) {
        // Try to repair auth if it's an auth error
        const repaired = await repairAuthIfNeeded(err);
        
        if (mounted) {
          if (!repaired) {
            setState({ loading: false, allowed: false, error: 'Authentication error' });
          } else {
            setState({ loading: false, allowed: false, error: err?.message ?? 'Admin guard error' });
          }
        }
      }
    })();
    
    return () => { mounted = false };
  }, []);

  return state;
}