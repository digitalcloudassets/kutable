const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ok = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type SendBody = {
  to: string;
  subject: string;
  html: string;   // already rendered html
  template: string; // a label like 'booking_confirmation'
  toUserId?: string;
  meta?: Record<string, any>;
};

async function resendSend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || 'Resend send failed');
  return json?.id as string; // provider message id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // TEMP debug:
  if (!RESEND_API_KEY || !RESEND_FROM || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return ok({
      success: false,
      error: 'Server not configured',
      details: {
        hasResendKey: !!RESEND_API_KEY,
        hasFrom: !!RESEND_FROM,
        hasUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
      }
    }, 500);
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: SendBody = await req.json();

    if (!body?.to || !body?.subject || !body?.html || !body?.template) {
      return ok({ success: false, error: 'Missing required fields' }, 400);
    }

    // Insert queued notification
    const { data: recs, error: insErr } = await db
      .from('notifications')
      .insert({
        channel: 'email',
        template: body.template,
        to_email: body.to,
        to_user_id: body.toUserId ?? null,
        subject: body.subject,
        html: body.html,
        meta: body.meta ?? {},
        status: 'sending',
        attempts: 1
      })
      .select('*')
      .limit(1);

    if (insErr || !recs || !recs[0]) throw insErr || new Error('Insert failed');
    const rec = recs[0];

    try {
      const providerId = await resendSend(RESEND_API_KEY, RESEND_FROM, body.to, body.subject, body.html);
      await db.from('notifications').update({
        provider_message_id: providerId,
        status: 'queued', // Resend will deliver asynchronously
        updated_at: new Date().toISOString()
      }).eq('id', rec.id);

      return ok({ success: true, id: rec.id, providerId });
    } catch (sendErr: any) {
      await db.from('notifications').update({
        status: 'failed',
        last_error: sendErr?.message || 'Send failed',
        updated_at: new Date().toISOString()
      }).eq('id', rec.id);
      return ok({ success: false, error: sendErr?.message || 'Send failed' }, 502);
    }
  } catch (e: any) {
    return ok({ success: false, error: e?.message || 'Unexpected error' }, 500);
  }
});