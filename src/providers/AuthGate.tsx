import React, { useEffect, useState } from 'react'
import { supabase, getSession, getUser } from '../lib/supabaseClient'
import { repairAuthIfNeeded } from '../utils/authRepair'
import { useNavigate, useLocation } from 'react-router-dom'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const loc = useLocation()
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  
  // Add breadcrumb logging
  console.log('[AuthGate] render', { ready, authed });

  // 1) Hydrate session FIRST
  useEffect(() => {
    let mounted = true
    
    const handleAuthChange = async (event: string, session: any) => {
      if (!mounted) return
      
      // Handle sign out event specifically
      if (event === 'SIGNED_OUT') {
        setAuthed(false)
        setReady(true)
        return
      }
      
      // For other events, verify the session is actually valid
      try {
        const currentSession = await getSession()
        setAuthed(!!currentSession)
        setReady(true)
      } catch (error) {
        const repaired = await repairAuthIfNeeded(error)
        if (mounted) {
          setAuthed(false)
          setReady(true)
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)
    
    // Initial session check
    ;(async () => {
      try {
        const session = await getSession()
        if (mounted) {
          setAuthed(!!session)
          setReady(true)
        }
      } catch (error) {
        const repaired = await repairAuthIfNeeded(error)
        if (mounted) {
          setAuthed(false)
          setReady(true)
        }
      }
    })()
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 2) If logged in, ensure profile exactly once (server idempotent)
  useEffect(() => {
    if (!ready || !authed) return
    
    let mounted = true
    
    ;(async () => {
      try {
        const user = await getUser()
        if (!mounted) return
        
        if (!user) {
          // User should be authed but no user found - repair auth
          const repaired = await repairAuthIfNeeded({ message: 'User not found but authed=true' })
          if (!repaired && mounted) {
            nav('/login', { replace: true })
          }
          return
        }

        // Ensure profile (idempotent server call)
        try {
          const email = (user.email || user.user_metadata?.email || '').toLowerCase()
          
          const response = await supabase.functions.invoke('ensure-profile', {
            body: { 
              userId: user.id, 
              email,
              userType: user.user_metadata?.user_type,
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
            console.warn('Profile ensure failed, fallback to direct check:', response.error);
            
            // Fallback: check if any profile exists for this user
            const { data: existingClient } = await supabase
              .from('client_profiles')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (!existingClient) {
              const { data: existingBarber } = await supabase
                .from('barber_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();
                
              if (!existingBarber) {
                // No profile exists, redirect to general onboarding (not forcing barber mode)
                nav('/onboarding', { replace: true });
                return;
              }
            }
          }
        } catch (error) {
          console.warn('Profile ensure error (continuing anyway):', error);
        }

        // Route only if you're on auth/landing pages
        const isOnAuthPage = loc.pathname === '/' || 
                           loc.pathname.startsWith('/login') || 
                           loc.pathname.startsWith('/signup') || 
                           loc.pathname.startsWith('/auth') ||
                           loc.pathname.startsWith('/forgot-password') ||
                           loc.pathname.startsWith('/reset-password')
        
        if (isOnAuthPage && mounted) {
          nav('/dashboard', { replace: true })
        }
      } catch (error) {
        console.error('AuthGate profile ensure error:', error)
        const repaired = await repairAuthIfNeeded(error)
        if (!repaired && mounted) {
          nav('/login', { replace: true })
        }
      }
    })()
    
    return () => { mounted = false }
  }, [ready, authed, nav, loc.pathname])

  // Handle unauthenticated users
  useEffect(() => {
    if (!ready) return
    
    if (!authed) {
      // Allow public pages
      const publicPaths = [
        '/',
        '/login', 
        '/signup', 
        '/auth',
        '/forgot-password',
        '/reset-password',
        '/barbers',
        '/barber/',
        '/how-it-works',
        '/pricing',
        '/support',
        '/privacy',
        '/terms'
      ]
      
      const isPublicPath = publicPaths.some(path => 
        path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path)
      )
      
      if (!isPublicPath) {
        nav('/login', { replace: true })
      }
    }
  }, [ready, authed, nav, loc.pathname])

  if (!ready) {
    console.log('[AuthGate] showing spinner (not ready)');
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