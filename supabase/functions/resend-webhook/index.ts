const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ok = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function safeEq(a: string, b: string) {
  // simple constant time-ish compare
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_WEBHOOK_SECRET) {
    return ok({ success: false, error: 'Server not configured' }, 500);
  }

  const sig = req.headers.get('resend-signature') || '';
  const expected = RESEND_WEBHOOK_SECRET;
  if (!safeEq(sig, expected)) return ok({ success: false, error: 'Invalid signature' }, 401);

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const evt = await req.json();
    // Example payload shape:
    // { type: 'email.delivered' | 'email.bounced' | 'email.complained', data: { id, to, subject, ... } }
    const type = evt?.type as string;
    const pid = evt?.data?.id as string;

    if (!type || !pid) return ok({ success: false, error: 'Invalid payload' }, 400);

    let status: 'delivered' | 'bounced' | 'complained' | null = null;
    if (type === 'email.delivered') status = 'delivered';
    if (type === 'email.bounced') status = 'bounced';
    if (type === 'email.complained') status = 'complained';

    if (!status) return ok({ success: true, ignored: true });

    await db.from('notifications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('provider_message_id', pid);

    return ok({ success: true });
  } catch (e: any) {
    return ok({ success: false, error: e?.message || 'Unexpected error' }, 500);
  }
});