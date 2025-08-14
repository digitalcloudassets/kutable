// Centralized, type-safe access to PUBLIC env in the client bundle
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
  // Google Maps can be public but should be referrer-restricted in Google Cloud
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
};

Object.entries(env).forEach(([key, value]) => {
  if (!value) {
    // Fail fast in dev to catch misconfigurations
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[env] Missing client env: ${key}`);
    }
  }
});