import { useEffect, useState } from 'react'
import { supabase, getUserSafe } from '../lib/auth'

export function useProfile() {
  const [profile, setProfile] = useState<any | null>(null)
  const [profileType, setProfileType] = useState<'client' | 'barber' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      setLoading(true)
      const user = await getUserSafe()
      if (!user) { 
        setProfile(null)
        setProfileType(null)
        setLoading(false)
        return 
      }

      try {
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
      } catch (error) {
        console.error('Profile lookup error:', error)
        if (isMounted) {
          setProfile(null)
          setProfileType(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })()
    return () => { isMounted = false }
  }, [])

  return { profile, profileType, loading }
}