import { supabase } from '../lib/supabase'

const SB_PREFIX = 'sb-' // Supabase localStorage keys start with this

export async function repairAuthIfNeeded(err?: unknown) {
  const msg = typeof err === 'object' && err && 'message' in err ? (err as any).message : ''
  
  // Common auth error patterns that indicate stale/invalid sessions
  const authErrors = [
    'Auth session missing!',
    'Session from session_id claim in JWT does not exist',
    'session_not_found',
    'Invalid JWT',
    'JWT expired',
    'refresh_token_not_found'
  ]
  
  const isAuthError = authErrors.some(pattern => msg.includes(pattern))
  
  if (isAuthError) {
    console.warn('Detected auth error, attempting repair:', msg)
    
    try {
      // First try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (!refreshError && refreshData.session) {
        console.log('✅ Session repaired via refresh')
        return true
      }
      
      console.warn('Session refresh failed, clearing stale tokens')
    } catch (refreshErr) {
      console.warn('Session refresh error:', refreshErr)
    }
    
    try {
      // Hard reset: clear all Supabase localStorage keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(SB_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
      
      // Force sign out to clean up any server-side session state
      await supabase.auth.signOut({ scope: 'global' })
      
      console.log('🔄 Auth state cleared, user will need to sign in again')
      return false
    } catch (signOutErr) {
      console.warn('Sign out error during repair:', signOutErr)
      return false
    }
  }
  
  return true // No auth error detected
}

export async function clearAuthState() {
  try {
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(SB_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
    
    // Sign out
    await supabase.auth.signOut({ scope: 'global' })
    
    console.log('Auth state cleared successfully')
  } catch (error) {
    console.error('Error clearing auth state:', error)
  }
}

export function isAuthError(error: unknown): boolean {
  const msg = typeof error === 'object' && error && 'message' in error ? (error as any).message : ''
  
  const authErrorPatterns = [
    'Auth session missing!',
    'Session from session_id claim in JWT does not exist',
    'session_not_found',
    'Invalid JWT',
    'JWT expired',
    'refresh_token_not_found',
    'User not found'
  ]
  
  return authErrorPatterns.some(pattern => msg.includes(pattern))
}