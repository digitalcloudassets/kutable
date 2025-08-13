const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resJson = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Body = {
  priceId?: string;              // preferred
  amount?: number; currency?: string; name?: string; // fallback if no priceId
  mode: 'payment' | 'subscription';
  customerEmail?: string;
  customerId?: string;           // do not send both customerId & customerEmail
  metadata?: Record<string, string>;
  successUrl: string;            // absolute https
  cancelUrl: string;             // absolute https
  connectedAccountId?: string;   // barber's Stripe acct id for Connect
};

function form(params: Record<string, any>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) p.append(k, String(v));
  return p;
}

async function stripePost(path: string, body: URLSearchParams, key: string, stripeAccount?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Stripe-Version': '2023-10-16',
  };
  if (stripeAccount) headers['Stripe-Account'] = stripeAccount;

  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers, body });
  const reqId = r.headers.get('request-id') || undefined;
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = json?.error?.message || 'Stripe API error';
    console.warn('Stripe checkout error', { status: r.status, reqId, msg, type: json?.error?.type, code: json?.error?.code });
    return { ok: false, status: r.status, message: msg, requestId: reqId };
  }
  return { ok: true, status: r.status, data: json };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) return resJson(500, { success: false, error: 'Server not configured' });

    let body: Body;
    try { body = await req.json(); } catch { return resJson(400, { success: false, error: 'Invalid JSON body' }); }

    const { priceId, amount, currency, name, mode, customerEmail, customerId, metadata, successUrl, cancelUrl, connectedAccountId } = body;

    // Basic validation
    if (!mode || !successUrl || !cancelUrl) {
      return resJson(400, { success: false, error: 'Missing required fields: mode, successUrl, cancelUrl' });
    }
    if (!/^https:\/\//i.test(successUrl) || !/^https:\/\//i.test(cancelUrl)) {
      return resJson(400, { success: false, error: 'successUrl/cancelUrl must be absolute https URLs' });
    }
    if (customerEmail && customerId) {
      return resJson(400, { success: false, error: 'Send either customerEmail or customerId, not both' });
    }
    if (!priceId && (!amount || !currency || !name)) {
      return resJson(400, { success: false, error: 'Provide priceId OR amount+currency+name' });
    }
    if (amount && (!Number.isInteger(amount) || amount <= 0)) {
      return resJson(400, { success: false, error: 'amount must be integer cents > 0' });
    }

    // Import Supabase client
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return resJson(500, { success: false, error: 'Database not configured' });
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Extract booking details from metadata
    const barberId = metadata?.barberId;
    const clientId = metadata?.clientId;
    const serviceId = metadata?.serviceId;
    const appointmentDate = metadata?.appointmentDate;
    const appointmentTime = metadata?.appointmentTime;
    
    if (!barberId || !clientId || !serviceId || !appointmentDate || !appointmentTime) {
      return resJson(400, { success: false, error: 'Missing booking details in metadata' });
    }
    
    // Calculate platform fee (1%)
    const totalAmountDollars = amount ? amount / 100 : 0;
    const platformFee = Math.round(totalAmountDollars * 0.01 * 100) / 100;
    const platformFeeCents = Math.round(totalAmountDollars * 0.01 * 100); // Platform fee in cents
    
    // Create pending booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        barber_id: barberId,
        client_id: clientId,
        service_id: serviceId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        total_amount: totalAmountDollars,
        deposit_amount: 0,
        platform_fee: platformFee,
        status: 'pending',
        notes: metadata?.notes || null
      })
      .select()
      .single();
    
    if (bookingError) {
      console.error('Failed to create booking:', bookingError);
      return resJson(400, { success: false, error: 'Failed to create booking record' });
    }
    
    // Add booking ID to metadata
    const enhancedMetadata = {
      ...metadata,
      bookingId: booking.id
    };

    // Build session params
    const params: Record<string, any> = {
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Any metadata constraints: keep small strings
      ...(enhancedMetadata ? Object.fromEntries(Object.entries(enhancedMetadata).map(([k, v]) => [`metadata[${k}]`, `${v}`.slice(0, 500)])) : {}),
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(customerId ? { customer: customerId } : {}),
    };

    if (priceId) {
      params['line_items[0][price]'] = priceId;
      params['line_items[0][quantity]'] = 1;
    } else {
      // ad-hoc item
      params['line_items[0][quantity]'] = 1;
      params['line_items[0][price_data][currency]'] = currency;
      params['line_items[0][price_data][unit_amount]'] = amount; // integer cents
      params['line_items[0][price_data][product_data][name]'] = name;
    }

    // Add payment intent data for platform fee and barber payout
    if (connectedAccountId && platformFeeCents > 0) {
      params['payment_intent_data[application_fee_amount]'] = platformFeeCents;
      params['payment_intent_data[transfer_data][destination]'] = connectedAccountId;
    }

    const resp = await stripePost('checkout/sessions', form(params), STRIPE_SECRET_KEY, connectedAccountId);
    if (!resp.ok) {
      // If checkout session creation fails, clean up the booking
      if (booking?.id) {
        await supabase
          .from('bookings')
          .delete()
          .eq('id', booking.id);
      }
      return resJson(resp.status || 400, { success: false, error: resp.message, requestId: resp.requestId });
    }

    return resJson(200, { success: true, sessionId: resp.data.id, url: resp.data.url, bookingId: booking.id });
  } catch (e: any) {
    return resJson(500, { success: false, error: e?.message || 'Unexpected server error' });
  }
});