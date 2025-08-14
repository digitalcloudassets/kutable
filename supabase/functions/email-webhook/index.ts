// Deno Edge Function: email-webhook (Resend)
// NOTE: Webhook endpoints are server-to-server and do NOT use CORS.
// Only signature verification matters for security.

const json = (s:number,d:any)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json'}});

async function hmacSha256Hex(secret: string, body: Uint8Array) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, body);
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SECRET       = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!SUPABASE_URL || !SERVICE_KEY || !SECRET) {
      return json(500, { success:false, error:'Server not configured' });
    }

    // Read raw body for signature verification
    const raw = new Uint8Array(await req.arrayBuffer());
    const headerSig = req.headers.get('resend-signature') || '';
    if (!headerSig) return json(400, { success:false, error:'Missing resend-signature header' });

    const computed = await hmacSha256Hex(SECRET, raw);
    if (!constantTimeEq(computed, headerSig)) {
      return json(401, { success:false, error:'Invalid signature' });
    }

    // Safe to parse JSON now
    const event = JSON.parse(new TextDecoder().decode(raw));
    const type = event?.type as string;

    // Only handle the statuses we care about
    if (type === 'email.delivered' || type === 'email.bounced' || type === 'email.complained') {
      const pid = event?.data?.id as string | undefined; // Resend's message ID
      if (!pid) return json(200, { success:true, ignored:true, reason:'no provider id' });

      const status =
        type === 'email.delivered' ? 'delivered' :
        type === 'email.bounced'   ? 'bounced'   :
                                     'complained';

      const { createClient } = await import('npm:@supabase/supabase-js@2');
      const db = createClient(SUPABASE_URL, SERVICE_KEY);

      await db.from('notifications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('provider_message_id', pid);

      return json(200, { success:true });
    }

    // Ignore other event types
    return json(200, { success:true, ignored:true, type });
  } catch (e:any) {
    return json(500, { success:false, error: e?.message || 'Unexpected error' });
  }
});