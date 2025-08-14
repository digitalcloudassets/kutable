import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts';

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);

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

// Minimal state helpers (prod-safe)
const STATE_MAP: Record<string, string> = {
  alabama:'AL', alaska:'AK', arizona:'AZ', arkansas:'AR', california:'CA', colorado:'CO', connecticut:'CT', delaware:'DE', 'district of columbia':'DC', florida:'FL', georgia:'GA', hawaii:'HI', idaho:'ID', illinois:'IL', indiana:'IN', iowa:'IA', kansas:'KS', kentucky:'KY', louisiana:'LA', maine:'ME', maryland:'MD', massachusetts:'MA', michigan:'MI', minnesota:'MN', mississippi:'MS', missouri:'MO', montana:'MT', nebraska:'NE', nevada:'NV', 'new hampshire':'NH', 'new jersey':'NJ', 'new mexico':'NM', 'new york':'NY', 'north carolina':'NC', 'north dakota':'ND', ohio:'OH', oklahoma:'OK', oregon:'OR', pennsylvania:'PA', 'rhode island':'RI', 'south carolina':'SC', 'south dakota':'SD', tennessee:'TN', texas:'TX', utah:'UT', vermont:'VT', virginia:'VA', washington:'WA', 'west virginia':'WV', wisconsin:'WI', wyoming:'WY',
  'puerto rico':'PR', guam:'GU', 'american samoa':'AS', 'northern mariana islands':'MP', 'us virgin islands':'VI'
};
const normalizeUSState = (s?: string) => !s ? null : (/^[A-Za-z]{2}$/.test(s.trim()) ? s.trim().toUpperCase() : STATE_MAP[s.trim().toLowerCase()] || null);
const isValidUSZip = (z?: string) => !!z && /^\d{5}(-\d{4})?$/.test(z.trim());
const nonEmpty = (v?: string) => typeof v === 'string' && v.trim().length > 0;

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
  const requestId = res.headers.get('request-id') || undefined;
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Minimal log (no secrets)
    console.warn('Stripe request failed', { path, status: res.status, requestId });
    const message = payload?.error?.message || 'Stripe API error';
    return { ok: false, status: res.status, message, requestId };
  }
  return { ok: true, status: res.status, data: payload };
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (status: number, data: any) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors.headers, 'Content-Type': 'application/json' } });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://kutable.com';

    const missing: string[] = [];
    if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length) return json(500, { success: false, error: 'Server not configured' });

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let body: CreateAccountRequest;
    try { body = await req.json(); } catch { return json(400, { success: false, error: 'Invalid JSON body' }); }

    const { barberId, businessName, ownerName, email, phone, address } = body;
    if (!barberId || !businessName || !ownerName || !email) {
      return json(400, { success: false, error: 'Missing required fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { success: false, error: 'Invalid email format' });
    }

    // Check if barber already has a Stripe account
    const { data: existingBarber } = await supabase
      .from('barber_profiles')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', barberId)
      .single();

    // If they have an existing account, create a new account link instead of a new account
    if (existingBarber?.stripe_account_id) {
      try {
        // Create a new account link for the existing account
        const linkParams = form({
          account: existingBarber.stripe_account_id,
          type: 'account_onboarding',
          refresh_url: `${SITE_URL}/dashboard?stripe_refresh=true&account_id=${existingBarber.stripe_account_id}`,
          return_url: `${SITE_URL}/dashboard?stripe_setup=complete&account_id=${existingBarber.stripe_account_id}`,
          collect: 'eventually_due',
        });

        const linkRes = await stripePost('account_links', linkParams, STRIPE_SECRET_KEY!);
        if (linkRes.ok) {
          return json(200, { 
            success: true, 
            accountId: existingBarber.stripe_account_id, 
            onboardingUrl: linkRes.data.url,
            isExistingAccount: true
          });
        } else {
          console.warn('Failed to create account link for existing account, creating new account');
        }
      } catch (linkError) {
        console.warn('Failed to create account link for existing account, creating new account:', linkError);
      }
    }
    const [first, ...rest] = ownerName.trim().split(/\s+/);
    const last = rest.join(' ') || first;

    // Address (optional, only if valid)
    const normalizedState = normalizeUSState(address?.state);
    const addressOk = address && nonEmpty(address.line1) && nonEmpty(address.city) && normalizedState && isValidUSZip(address.postal_code);
    const addressParams = addressOk
      ? {
          'individual[address][line1]': address!.line1,
          'individual[address][city]': address!.city,
          'individual[address][state]': normalizedState!,
          'individual[address][postal_code]': address!.postal_code.trim(),
          'individual[address][country]': 'US',
        }
      : {};

    const accountParams = form({
      type: 'express',
      country: 'US',
      email,
      business_type: 'individual',
      'individual[first_name]': first,
      'individual[last_name]': last,
      'individual[email]': email,
      ...(phone ? { 'individual[phone]': phone } : {}),
      ...addressParams,
      'business_profile[name]': businessName,
      'business_profile[mcc]': '7230',
      'business_profile[url]': `${SITE_URL}/barber/${barberId}`,
      ...(phone ? { 'business_profile[support_phone]': phone } : {}),
      'business_profile[support_email]': email,
      'capabilities[card_payments][requested]': 'true',
      'capabilities[transfers][requested]': 'true',
    });

    const accountRes = await stripePost('accounts', accountParams, STRIPE_SECRET_KEY!);
    if (!accountRes.ok) return json(accountRes.status || 400, { success: false, error: accountRes.message });

    const accountId = accountRes.data.id as string;

    const linkParams = form({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${SITE_URL}/dashboard?stripe_refresh=true&account_id=${accountId}`,
      return_url: `${SITE_URL}/dashboard?stripe_setup=complete&account_id=${accountId}`,
      collect: 'eventually_due',
    });

    const linkRes = await stripePost('account_links', linkParams, STRIPE_SECRET_KEY!);
    if (!linkRes.ok) return json(linkRes.status || 400, { success: false, error: linkRes.message });

    // Persist (best effort)
    const now = new Date().toISOString();
    await supabase.from('barber_profiles').update({ stripe_account_id: accountId, updated_at: now }).eq('id', barberId);
    await supabase.from('stripe_accounts').upsert({
      barber_id: barberId, stripe_account_id: accountId,
      account_status: 'pending', charges_enabled: false, payouts_enabled: false, updated_at: now
    });

    return json(200, { success: true, accountId, onboardingUrl: linkRes.data.url, isExistingAccount: false });
  } catch {
    return json(500, { success: false, error: 'Unexpected server error' });
  }
});