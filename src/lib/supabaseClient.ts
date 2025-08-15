import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL!
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!

// Avoid duplicate clients during HMR
let client: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (client) return client
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'kutable-auth',
    },
  })
  return client
})()

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session ?? null
  } catch (error) {
    console.warn('Session retrieval error:', error)
    return null
  }
}

export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user ?? null
  } catch (error) {
    console.warn('User retrieval error:', error)
    return null
  }
}

export async function refreshSessionSafe() {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) throw error
    return data.session ?? null
  } catch (error) {
    console.warn('Session refresh error:', error)
    return null
  }
}