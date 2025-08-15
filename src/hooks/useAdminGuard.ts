import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

export function useAdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    try {
      const raw = import.meta.env.VITE_ADMIN_EMAILS || '';
      const allowlist = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const email = (user?.email || '').toLowerCase();
      setAllowed(!!email && allowlist.includes(email));
    } catch (e: any) {
      setError(e?.message || 'admin guard failed');
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.email]);

  return { allowed, loading, error };
}

// Legacy hook properties for backwards compatibility
export function useAdminGuardLegacy() {
  const result = useAdminGuard();
  return {
    ...result,
    errorMsg: result.error
  };
}