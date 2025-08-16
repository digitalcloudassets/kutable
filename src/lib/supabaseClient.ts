// Compatibility shim - all imports should use ../lib/supabase instead
export * from './supabase';

// Legacy exports for backward compatibility
export { supabase } from './supabase';
export type { Database } from './supabase';