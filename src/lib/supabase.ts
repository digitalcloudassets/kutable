import { createClient, type AuthError, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function getProjectRefFromUrl(url?: string) {
  try {
    const host = (url || '').replace(/^https?:\/\//, '').split('.')[0];
    return host || '';
  } catch {
    return '';
  }
}

export function clearSupabaseSessionStorage() {
  try {
    const ref = getProjectRefFromUrl(SUPABASE_URL);
    if (!ref) return;
    const prefix = `sb-${ref}-auth-token`;
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k));
  } catch { /* no-op */ }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Treat these auth errors as "nuke the broken token and continue signed-out".
 */
function isFatalAuthError(err?: unknown) {
  const msg = (err as AuthError)?.message?.toLowerCase?.() || '';
  return (
    msg.includes('user_not_found') ||
    msg.includes('session_not_found') ||
    msg.includes('jwt') // corrupted/foreign token
  );
}

/**
 * Validate the current session. If the token points to a non-existent user,
 * clear storage and sign out so the next login works cleanly.
 */
export async function validateSession(): Promise<{ isValid: boolean; session?: Session | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session) {
      // No usable session → ensure clean slate
      try { await supabase.auth.signOut(); } catch {}
      clearSupabaseSessionStorage();
      return { isValid: false, session: null };
    }

    // Optional: ping /user to verify the JWT actually maps to a real user
    const userRes = await supabase.auth.getUser();
    if ((userRes as any)?.error && isFatalAuthError((userRes as any).error)) {
      try { await supabase.auth.signOut(); } catch {}
      clearSupabaseSessionStorage();
      return { isValid: false, session: null };
    }

    return { isValid: true, session: data.session };
  } catch (err) {
    if (isFatalAuthError(err)) {
      try { await supabase.auth.signOut(); } catch {}
      clearSupabaseSessionStorage();
      return { isValid: false, session: null };
    }
    // Non-auth failure → don't block the app
    return { isValid: true, session: null };
  }
}

// Helper functions for compatibility
export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user ?? null;
  } catch (error) {
    console.warn('User retrieval error:', error);
    return null;
  }
}

// Re-export database types for compatibility
export type { Database } from './supabaseClient';