// Safe env access for the client. No JSX here.

function warn(msg: string) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[env] ${msg}`);
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseFunctionsUrl = (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) || '';
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '';
const isBolt = !!import.meta.env.VITE_BOLT?.length;

// Light validation (dev only)
if (!supabaseUrl) warn('VITE_SUPABASE_URL is missing');
if (!supabaseAnonKey) warn('VITE_SUPABASE_ANON_KEY is missing');
if (!stripePublishableKey) warn('VITE_STRIPE_PUBLISHABLE_KEY is missing');
// functions URL is optional; only warn if you rely on it:
if (!supabaseFunctionsUrl) warn('VITE_SUPABASE_FUNCTIONS_URL not set (OK if you are not pinning Functions base)');

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  supabaseFunctionsUrl: (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string) ||
                       `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,    // ✅ fallback
  stripePublishableKey,
  googleMapsApiKey,
  turnstileSiteKey,       // optional; leave blank to disable
  isBolt,
  enableTurnstile: !!turnstileSiteKey && import.meta.env.PROD, // default OFF unless prod + real key
};

export type Env = typeof env;