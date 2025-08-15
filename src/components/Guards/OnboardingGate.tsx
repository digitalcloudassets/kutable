import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, profileType, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  React.useEffect(() => {
    (async () => {
      // Wait for profile to load
      if (profileLoading) return;
      
      // Ignore if already on onboarding route
      if (pathname.startsWith('/onboarding/barber')) return;

      if (!user || user.user_metadata?.user_type !== 'barber') return;

      // If no barber profile exists, go to onboarding
      if (!profile || profileType !== 'barber') {
        navigate('/onboarding/barber?step=account', { replace: true });
        return;
      }

      try {
        // Check if they still need onboarding
        const needAccount = !profile?.city || !profile?.state || !profile?.phone || !profile?.business_name;
        
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

        if (needAccount || needHours || needServices || needStripe) {
          let redirectStep = 'account';
          if (!needAccount && needHours) redirectStep = 'hours';
          else if (!needAccount && !needHours && needServices) redirectStep = 'services';
          else if (!needAccount && !needHours && !needServices && needStripe) redirectStep = 'payouts';
          
          navigate(`/onboarding/barber?step=${redirectStep}`, { replace: true });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If there's an error, don't block navigation
      }
    })();
  }, [pathname, navigate, user, profile, profileType, profileLoading]);

  return <>{children}</>;
}