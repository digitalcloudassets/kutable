// Creates a PaymentIntent ON THE PLATFORM account using Destination Charges,
// so you can take your fee and auto-transfer to the barber connected account.
// Uses REST via fetch (Stripe Node SDK is not used on Supabase Edge).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resJson = (status: number, data: any) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type ReqBody = {
  barberId: string;
  amount: number;             // integer cents
  currency: string;           // e.g. 'usd'
  customerEmail?: string;
  metadata?: Record<string, string>; // bookingId, userId, etc
};

function form(params: Record<string, any>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    p.append(k, String(v));
  }
  return p;
}

async function stripePost(path: string, body: URLSearchParams, key: string) {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
    },
    body,
  });
  const reqId = r.headers.get('request-id') || undefined;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || 'Stripe API error';
    console.warn('stripe error', { path, status: r.status, reqId, msg });
    return { ok: false, status: r.status, message: msg, requestId: reqId };
  }
  return { ok: true, status: r.status, data: j };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return resJson(500, { error: 'Server not configured' });
    }

    const body: ReqBody = await req.json().catch(() => null as any);
    if (!body) return resJson(400, { error: 'Invalid JSON body' });

    const { barberId, amount, currency, customerEmail, metadata } = body;
    if (!barberId || !Number.isInteger(amount) || amount <= 0 || !currency) {
      return resJson(400, { error: 'Missing or invalid fields: barberId, amount (cents), currency' });
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const db = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Lookup connected account
    const { data: barber, error: barberErr } = await db
      .from('barber_profiles')
      .select('stripe_account_id, business_name, stripe_onboarding_completed')
      .eq('id', barberId)
      .single();
    
    if (barberErr || !barber?.stripe_account_id) {
      console.error('Barber lookup error:', barberErr, 'Barber data:', barber);
      return resJson(400, { success: false, error: 'Barber is not connected to Stripe' });
    }

    if (!barber.stripe_onboarding_completed) {
      return resJson(400, { success: false, error: 'Barber has not completed Stripe onboarding yet' });
    }

    // Calculate platform fee (1%)
    const application_fee_amount = Math.floor(amount * 0.01);

    const params: Record<string, any> = {
      amount,
      currency,
      'automatic_payment_methods[enabled]': 'true',
      'transfer_data[destination]': barber.stripe_account_id,
      application_fee_amount,
      ...(customerEmail ? { receipt_email: customerEmail } : {}),
      ...(metadata
        ? Object.fromEntries(
            Object.entries(metadata).map(([k, v]) => [`metadata[${k}]`, `${v}`.slice(0, 500)])
          )
        : {}
      ),
    };

    // Create PaymentIntent on the PLATFORM (destination charge)
    const pi = await stripePost('payment_intents', form(params), STRIPE_SECRET_KEY!);
    if (!pi.ok) return resJson(pi.status || 400, { success: false, error: pi.message, requestId: pi.requestId });

    console.log('Payment intent created successfully:', pi.data.id);
    return resJson(200, { success: true, clientSecret: pi.data.client_secret, paymentIntentId: pi.data.id });
  } catch (e: any) {
    console.error('Payment intent creation error:', e);
    return resJson(500, { success: false, error: e?.message || 'Unexpected server error' });
  }
});