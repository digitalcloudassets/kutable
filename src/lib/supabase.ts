import { createClient } from '@supabase/supabase-js';

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

export async function validateSession() {
  const { data, error } = await supabase.auth.getSession();
  // If SDK reports a "session_not_found" or token is null, nuke storage so the next login is clean
  if (error?.message?.toLowerCase().includes('session_not_found') || !data?.session) {
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    clearSupabaseSessionStorage();
    return { isValid: false };
  }
  return { isValid: true, session: data.session };
}

// Re-export database types for compatibility
export type { Database } from './supabaseClient';