import { useEffect, useState } from 'react'
import { supabase, getUser } from '../lib/supabaseClient'
import { repairAuthIfNeeded } from '../utils/authRepair'

export function useProfile() {
  const [profile, setProfile] = useState<any | null>(null)
  const [profileType, setProfileType] = useState<'client' | 'barber' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        
        const user = await getUser()
        if (!isMounted) return
        
        if (!user) { 
          setProfile(null)
          setProfileType(null)
          setLoading(false)
          return 
        }

        // Check for barber profile first
        const { data: barberProfile, error: barberError } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!isMounted) return

        if (barberProfile && !barberError) {
          setProfile(barberProfile)
          setProfileType('barber')
          setLoading(false)
          return
        }

        // Check for client profile
        const { data: clientProfile, error: clientError } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!isMounted) return

        if (clientProfile && !clientError) {
          setProfile(clientProfile)
          setProfileType('client')
          setLoading(false)
          return
        }

        // No profile found
        setProfile(null)
        setProfileType(null)
        setLoading(false)
      } catch (error: any) {
        console.error('Profile lookup error:', error)
        
        // Try to repair auth if it's an auth-related error
        const repaired = await repairAuthIfNeeded(error)
        
        if (isMounted) {
          if (!repaired) {
            setError('Authentication error - please sign in again')
          } else {
            setError('Failed to load profile')
          }
          setProfile(null)
          setProfileType(null)
          setLoading(false)
        }
      }
    })()
    
    return () => { isMounted = false }
  }, [])

  return { profile, profileType, loading, error }
}