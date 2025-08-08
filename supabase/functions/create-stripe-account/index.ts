const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const json = (status: number, data: any) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const form = (body: Record<string, any>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) if (v !== undefined && v !== null) p.append(k, String(v));
  return p;
};

interface CreateAccountRequest {
  barberId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: { line1: string; city: string; state: string; postal_code: string };
}

async function stripePost(path: string, body: URLSearchParams, key: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
    },
    body,
  });
  const requestId = res.headers.get('request-id');
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Stripe error', { path, status: res.status, requestId, payload });
    // Bubble a clean error JSON to the client
    return { ok: false, status: res.status, error: payload?.error?.message || 'Stripe API error', requestId };
  }
  console.log('Stripe success', { path, status: res.status, requestId, id: payload.id });
  return { ok: true, status: res.status, data: payload, requestId };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://kutable.com';

    const missing: string[] = [];
    if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length) return json(400, { success: false, error: `Missing env: ${missing.join(', ')}` });

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let body: CreateAccountRequest;
    try {
      body = await req.json();
    } catch {
      return json(400, { success: false, error: 'Invalid JSON body' });
    }

    const { barberId, businessName, ownerName, email, phone, address } = body || ({} as CreateAccountRequest);
    if (!barberId || !businessName || !ownerName || !email) {
      return json(400, { success: false, error: 'Missing required fields: barberId, businessName, ownerName, email' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { success: false, error: 'Invalid email format' });
    }

    const [first, ...rest] = ownerName.trim().split(/\s+/);
    const last = rest.join(' ') || first;

    // Create Express account
    const accountParams = form({
      type: 'express',
      country: 'US',
      email,
      business_type: 'individual',
      'individual[first_name]': first,
      'individual[last_name]': last,
      'individual[email]': email,
      ...(phone ? { 'individual[phone]': phone } : {}),
      ...(address
        ? {
            'individual[address][line1]': address.line1,
            'individual[address][city]': address.city,
            'individual[address][state]': address.state,
            'individual[address][postal_code]': address.postal_code,
            'individual[address][country]': 'US',
          }
        : {}),
      'business_profile[name]': businessName,
      'business_profile[mcc]': '7230',
      'business_profile[url]': `${SITE_URL}/barber/${barberId}`,
      ...(phone ? { 'business_profile[support_phone]': phone } : {}),
      'business_profile[support_email]': email,
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
    });

    const accountRes = await stripePost('accounts', accountParams, STRIPE_SECRET_KEY!);
    if (!accountRes.ok) return json(400, { success: false, error: accountRes.error, requestId: accountRes.requestId });
    const accountId = accountRes.data.id as string;

    // Create onboarding link — DO NOT pass client_id to account_links as it causes OAuth conflicts
    const linkParams = form({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${SITE_URL}/dashboard?stripe_refresh=true&account_id=${accountId}`,
      return_url: `${SITE_URL}/dashboard?stripe_setup=complete&account_id=${accountId}`,
      collect: 'eventually_due',
    });

    const linkRes = await stripePost('account_links', linkParams, STRIPE_SECRET_KEY!);
    if (!linkRes.ok) return json(400, { success: false, error: linkRes.error, requestId: linkRes.requestId });

    // Persist to database (best-effort)
    const now = new Date().toISOString();
    const { error: profileErr } = await supabase
      .from('barber_profiles')
      .update({ stripe_account_id: accountId, updated_at: now })
      .eq('id', barberId);
    if (profileErr) console.error('barber_profiles update error', profileErr);

    const { error: upsertErr } = await supabase
      .from('stripe_accounts')
      .upsert({ 
        barber_id: barberId, 
        stripe_account_id: accountId, 
        account_status: 'pending', 
        charges_enabled: false, 
        payouts_enabled: false, 
        updated_at: now 
      });
    if (upsertErr) console.error('stripe_accounts upsert error', upsertErr);

    return json(200, { success: true, accountId, onboardingUrl: linkRes.data.url });
  } catch (e: any) {
    console.error('Stripe Connect edge error', e?.message || e);
    return json(400, { success: false, error: e?.message || 'Unexpected error' });
  }
});