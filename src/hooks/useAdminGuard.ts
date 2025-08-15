import { useEffect, useState } from 'react';
import { useProfile } from './useProfile';
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
  
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  useEffect(() => {
    // Bypass admin guards in preview environments to prevent network errors
    if (shouldBypassAdminGuards()) {
      setState({ loading: false, allowed: true, error: null });
      return;
    }

    // Wait for profile to load
    if (profileLoading) {
      setState({ loading: true, allowed: false, error: null });
      return;
    }

    if (profileError) {
      setState({ loading: false, allowed: false, error: profileError });
      return;
    }

    if (!profile) {
      setState({ loading: false, allowed: false, error: 'No profile found' });
      return;
    }

    // Use server-computed is_admin flag
    const allowed = !!profile.is_admin;
    setState({ 
      loading: false, 
      allowed, 
      error: allowed ? null : 'Forbidden' 
    });
  }, [profileLoading, profile, profileError]);

  return state;
}

// Legacy hook properties for backwards compatibility
export function useAdminGuardLegacy(): AdminGuardState & { errorMsg?: string } {
  const result = useAdminGuard();
  return {
    ...result,
    errorMsg: result.error
  };
}
      }
    })();
    
    return () => { mounted = false };
  }, []);

  return state;
}