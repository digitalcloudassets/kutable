import { createClient } from '@supabase/supabase-js';

// Environment variable helpers
const getEnvVar = (key: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use Vite environment variables
    return (import.meta.env as any)[key] || '';
  } else {
    // Server-side: use process.env
    return process.env[key] || '';
  }
};

// Get Supabase configuration
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Check if we have valid credentials
const hasValidCredentials = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnonKey.length > 20
);

// Determine if we should use fallback client
const shouldUseFallback = !hasValidCredentials;

// Create mock client for development/fallback
const createMockClient = () => ({
  auth: {
    signUp: async () => ({ 
      data: { user: null, session: null }, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    }),
    signInWithPassword: async () => ({ 
      data: { user: null, session: null }, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getUser: async () => ({ data: { user: null }, error: null }),
    resetPasswordForEmail: async () => ({ 
      data: {}, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    }),
    updateUser: async () => ({ 
      data: { user: null }, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: { message: 'Connect to Supabase to enable user accounts' } }),
        maybeSingle: async () => ({ data: null, error: null }),
        limit: () => ({
          single: async () => ({ data: null, error: { message: 'Connect to Supabase to enable user accounts' } })
        })
      }),
      order: () => ({
        limit: async () => ({ data: [], error: null })
      }),
      limit: async () => ({ data: [], error: null }),
      single: async () => ({ data: null, error: { message: 'Connect to Supabase to enable user accounts' } })
    }),
    insert: async () => ({ 
      data: null, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    }),
    update: () => ({
      eq: async () => ({ 
        data: null, 
        error: { message: 'Connect to Supabase to enable user accounts' } 
      })
    }),
    delete: () => ({
      eq: async () => ({ 
        data: null, 
        error: { message: 'Connect to Supabase to enable user accounts' } 
      })
    }),
    upsert: async () => ({ 
      data: null, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    })
  }),
  storage: {
    from: () => ({
      upload: async () => ({ 
        data: null, 
        error: { message: 'Connect to Supabase to enable user accounts' } 
      }),
      remove: async () => ({ 
        data: null, 
        error: { message: 'Connect to Supabase to enable user accounts' } 
      }),
      getPublicUrl: () => ({ 
        data: { publicUrl: '' } 
      })
    })
  },
  functions: {
    invoke: async () => ({ 
      data: null, 
      error: { message: 'Connect to Supabase to enable user accounts' } 
    })
  }
});

// Export the appropriate client
export const supabase = shouldUseFallback 
  ? createMockClient() as any
  : createClient(supabaseUrl, supabaseAnonKey);

// Export configuration for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  hasValidCredentials,
  usingFallback: shouldUseFallback
};