import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { shouldBypassAdminGuards } from '../lib/devFlags';

type AdminGuardState = {
  loading: boolean;
  allowed: boolean;
  error: string | null;
};

export function useAdminGuard(): AdminGuardState {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminGuardState>({
    loading: true,
    allowed: false,
    error: null,
  });

  useEffect(() => {
    // Bypass admin guards in preview environments to prevent network errors
    if (shouldBypassAdminGuards()) {
      setState({ loading: false, allowed: true, error: null });
      return;
    }

    if (authLoading) return;

    if (!user) {
      setState({ loading: false, allowed: false, error: 'No session' });
      return;
    }

    try {
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

      setState({ loading: false, allowed, error: null });
    } catch (err: any) {
      setState({ loading: false, allowed: false, error: err?.message ?? 'Admin guard error' });
    }
  }, [authLoading, user]);

  return state;
}