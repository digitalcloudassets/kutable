// Shared server-side env loader for Edge Functions (Deno). No VITE_ here.
type RequiredEnvKeys =
  | 'STRIPE_SECRET_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'OPENAI_API_KEY'
  | 'TWILIO_ACCOUNT_SID'
  | 'TWILIO_AUTH_TOKEN'
  | 'TWILIO_PHONE_NUMBER'
  | 'EMAIL_PROVIDER_API_KEY';

const get = (key: string, required = true) => {
  const v = Deno.env.get(key);
  if (required && (!v || v.trim() === '')) {
    throw new Error(`Missing required server env: ${key}`);
  }
  return v!;
};

export const serverEnv = {
  stripeSecretKey: get('STRIPE_SECRET_KEY'),
  supabaseServiceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
  openAiKey: get('OPENAI_API_KEY'),
  twilio: {
    sid: get('TWILIO_ACCOUNT_SID'),
    token: get('TWILIO_AUTH_TOKEN'),
    from: get('TWILIO_PHONE_NUMBER'),
  },
  emailProviderKey: get('EMAIL_PROVIDER_API_KEY', false) ?? '',
};