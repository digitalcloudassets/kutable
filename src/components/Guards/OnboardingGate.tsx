import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { repairAuthIfNeeded } from '../../utils/authRepair';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, profileType, loading: profileLoading, error: profileError } = useProfile();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  React.useEffect(() => {
    (async () => {
      // Wait for profile to load
      if (profileLoading) return;
      
      // Handle profile loading errors
      if (profileError) {
        console.warn('Profile loading error in OnboardingGate:', profileError);
        if (profileError.includes('Authentication error')) {
          navigate('/login', { replace: true });
          return;
        }
      }
      
      // Ignore if already on onboarding route
      if (pathname.startsWith('/onboarding/barber')) return;

      // Only check barber onboarding requirements
      if (!user || user.user_metadata?.user_type !== 'barber') return;

      // If no barber profile exists, go to onboarding
      if (!profile || profileType !== 'barber') {
        navigate('/onboarding/barber?step=account', { replace: true });
        return;
      }

      try {
        // Check if they still need onboarding steps
        const needAccount = !profile?.city || !profile?.state || !profile?.phone || !profile?.business_name;
        
        if (needAccount) {
          navigate('/onboarding/barber?step=account', { replace: true });
          return;
        }
        
        const { count: hours } = await supabase
          .from('availability')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', profile.id)
          .eq('is_available', true);
          
        const { count: svc } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', profile.id)
          .eq('is_active', true);
          
        const needHours = (hours || 0) === 0;
        const needServices = (svc || 0) === 0;
        const needStripe = !profile?.stripe_onboarding_completed;

        if (needHours) {
          navigate('/onboarding/barber?step=hours', { replace: true });
        } else if (needServices) {
          navigate('/onboarding/barber?step=services', { replace: true });
        } else if (needStripe) {
          navigate('/onboarding/barber?step=payouts', { replace: true });
        }
      } catch (error: any) {
        console.error('Error checking onboarding status:', error);
        
        // Try to repair auth if needed
        const repaired = await repairAuthIfNeeded(error);
        if (!repaired) {
          navigate('/login', { replace: true });
          return;
        }
        
        // If there's an error but auth is OK, don't block navigation
      }
    })();
  }, [pathname, navigate, user, profile, profileType, profileLoading, profileError]);

  return <>{children}</>;
}