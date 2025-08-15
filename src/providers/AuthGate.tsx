import React, { useEffect, useState } from 'react'
import { supabase, getSessionSafe, getUserSafe } from '../lib/auth'
import { useNavigate, useLocation } from 'react-router-dom'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  // 1) Hydrate session FIRST
  useEffect(() => {
    let unsub = supabase.auth.onAuthStateChange((_e, _s) => {
      // no-op; we always read fresh on mount
    })
    ;(async () => {
      const session = await getSessionSafe()
      setAuthed(!!session)
      setReady(true)
    })()
    return () => unsub.data.subscription.unsubscribe()
  }, [])

  // 2) If logged in, ensure profile exactly once (server idempotent)
  useEffect(() => {
    if (!ready) return
    ;(async () => {
      const user = await getUserSafe()
      if (!user) {
        // Allow only auth pages unauthenticated
        if (!loc.pathname.startsWith('/login') && 
            !loc.pathname.startsWith('/signup') && 
            !loc.pathname.startsWith('/forgot-password') &&
            !loc.pathname.startsWith('/reset-password') &&
            !loc.pathname.startsWith('/barbers') &&
            !loc.pathname.startsWith('/how-it-works') &&
            !loc.pathname.startsWith('/pricing') &&
            !loc.pathname.startsWith('/support') &&
            !loc.pathname.startsWith('/privacy') &&
            !loc.pathname.startsWith('/terms') &&
            !loc.pathname.startsWith('/barber/') &&
            loc.pathname !== '/') {
          nav('/login', { replace: true })
        }
        return
      }

      // LINK IDENTITIES safeguard: prefer primary email lowercase
      const email = (user.email || user.user_metadata?.email || '').toLowerCase()
      const userType = user.user_metadata?.user_type as 'client' | 'barber' | undefined

      // Ensure profile (idempotent server call)
      try {
        const response = await supabase.functions.invoke('ensure-profile', {
          body: { 
            userId: user.id, 
            email,
            userType,
            defaults: {
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              business_name: user.user_metadata?.business_name,
              communication_consent: user.user_metadata?.communication_consent ?? false,
              sms_consent: user.user_metadata?.sms_consent ?? false,
              email_consent: user.user_metadata?.email_consent ?? false
            }
          }
        });

        if (response.error) {
          console.warn('Profile ensure failed (continuing anyway):', response.error);
        }
      } catch (error) {
        console.warn('Profile ensure error (continuing anyway):', error);
      }

      // Route only if you're on auth/onboarding pages or root
      if (loc.pathname === '/' || 
          loc.pathname.startsWith('/login') || 
          loc.pathname.startsWith('/signup') || 
          loc.pathname.startsWith('/onboarding')) {
        
        // Check if user needs onboarding (barbers only)
        if (userType === 'barber') {
          try {
            const { data: barberProfile } = await supabase
              .from('barber_profiles')
              .select('id, business_name, city, state, phone, stripe_onboarding_completed')
              .eq('user_id', user.id)
              .maybeSingle();

            if (barberProfile) {
              // Check if onboarding is needed
              const needsAccount = !barberProfile.business_name || !barberProfile.city || !barberProfile.state || !barberProfile.phone;
              
              const { count: hoursCount } = await supabase
                .from('availability')
                .select('id', { count: 'exact', head: true })
                .eq('barber_id', barberProfile.id)
                .eq('is_available', true);
                
              const { count: servicesCount } = await supabase
                .from('services')
                .select('id', { count: 'exact', head: true })
                .eq('barber_id', barberProfile.id)
                .eq('is_active', true);
                
              const needsHours = (hoursCount || 0) === 0;
              const needsServices = (servicesCount || 0) === 0;
              const needsStripe = !barberProfile.stripe_onboarding_completed;

              if (needsAccount || needsHours || needsServices || needsStripe) {
                // Still needs onboarding
                let step = 'account';
                if (!needsAccount && needsHours) step = 'hours';
                else if (!needsAccount && !needsHours && needsServices) step = 'services';
                else if (!needsAccount && !needsHours && !needsServices && needsStripe) step = 'payouts';
                
                nav(`/onboarding/barber?step=${step}`, { replace: true });
                return;
              }
            }
          } catch (error) {
            console.warn('Error checking barber onboarding status:', error);
          }
        }
        
        // Profile exists and complete, go to dashboard
        nav('/dashboard', { replace: true })
      }
    })()
  }, [ready, nav, loc.pathname])

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading Kutable...</p>
            <p className="text-sm text-gray-500">Preparing your experience</p>
          </div>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}