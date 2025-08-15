import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

// --- in-memory storage fallback (used only if creds missing or localStorage unavailable) ---
const memoryStore: Record<string, string> = {};
const memoryStorage = {
  getItem: (k: string) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k: string, v: string) => {
    memoryStore[k] = v;
  },
  removeItem: (k: string) => {
    delete memoryStore[k];
  },
};

// Try to use real localStorage; fall back to memory if not available (Safari ITP, Bolt quirks, etc.)
function safeLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return memoryStorage;
    const t = '__sb_probe__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return memoryStorage;
  }
}

// --- decide storage ---
// Only fall back when credentials are missing, not based on environment.
const hasValidCredentials = Boolean(env.supabaseUrl && env.supabaseAnonKey);
const storage = hasValidCredentials ? safeLocalStorage() : memoryStorage;

// --- create client ---
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-client-info': 'kutable-web' },
  },
});

// ✅ Pin Functions base URL to prevent invoke() going to wrong host
if (env.supabaseFunctionsUrl) {
  (supabase as any)._functionsUrl = env.supabaseFunctionsUrl;
}</action>
export type { Database } from './database.types';