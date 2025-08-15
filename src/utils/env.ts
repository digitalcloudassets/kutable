// Non-fatal env loader + Turnstile dev/bypass. Safe in Bolt & prod.
type Warn = (msg: string, ...args: any[]) => void;
const w: Warn = (...args) => { if (import.meta.env.DEV) console.warn('[env]', ...args); };

function read(name: string, opts?: { required?: boolean; default?: string | null }) {
  const v = (import.meta as any).env?.[name] ?? (import.meta as any).env?.[name.toLowerCase()];
  if (!v || v === 'undefined') { if (opts?.required) w(`Missing client env: ${name}`); return opts?.default ?? null; }
  return String(v);
}

const isBolt =
  typeof window !== 'undefined' &&
  (/webcontainer|stackblitz|bolt/i.test(window.location.host) ||
   /webcontainer|stackblitz|bolt/i.test(navigator.userAgent || ''));

const siteUrl = read('VITE_SITE_URL') || (typeof window !== 'undefined' ? window.location.origin : '');

const turnstileKey =
  read('VITE_TURNSTILE_SITE_KEY') ||
  read('VITE_TURNSTILE_SITEKEY') ||
  read('turnstileSiteKey');

const enableTurnstile = Boolean(turnstileKey) && !isBolt;

export const env = {
  isBolt,
  siteUrl,
  supabaseUrl: read('VITE_SUPABASE_URL', { required: true })!,
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY', { required: true })!,
  stripePublishableKey: read('VITE_STRIPE_PUBLISHABLE_KEY'),
  googleMapsApiKey: read('VITE_GOOGLE_MAPS_API_KEY'),
  turnstileSiteKey: turnstileKey,
  enableTurnstile,
};