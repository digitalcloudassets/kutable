// Singleton Supabase client + safe auth helpers
import { createClient } from '@supabase/supabase-js'

export const supabase = (() => {
  // Avoid multiple clients during HMR
  // @ts-ignore
  if (typeof window !== 'undefined' && window.__sb) return window.__sb
  const c = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  )
  // @ts-ignore
  if (typeof window !== 'undefined') window.__sb = c
  return c
})()

export async function getSessionSafe() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session ?? null
}

export async function getUserSafe() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user ?? null
}