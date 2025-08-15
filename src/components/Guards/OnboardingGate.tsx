import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  React.useEffect(() => {
    (async () => {
      // Ignore if already on onboarding route
      if (pathname.startsWith('/onboarding/barber')) return;

      if (!user || user.user_metadata?.user_type !== 'barber') return;

      try {
        const { data: prof } = await supabase
          .from('barber_profiles')
          .select('id, business_name, owner_name, city, state, phone, stripe_onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prof) {
          // No profile exists, redirect to onboarding
          navigate('/onboarding/barber?step=account', { replace: true });
          return;
        }

        // Check if they still need onboarding
        const needAccount = !prof?.city || !prof?.state || !prof?.phone || !prof?.business_name;
        
        const { count: hours } = await supabase
          .from('availability')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', prof.id)
          .eq('is_available', true);
          
        const { count: svc } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('barber_id', prof.id)
          .eq('is_active', true);
          
        const needHours = (hours || 0) === 0;
        const needServices = (svc || 0) === 0;
        const needStripe = !prof?.stripe_onboarding_completed;

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
  }, [pathname, navigate, user]);

  return <>{children}</>;
}