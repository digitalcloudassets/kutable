const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ok = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function backoff(attempt: number) {
  // 1m, 5m, 15m
  return [60, 300, 900][Math.min(attempt - 1, 2)];
}

async function resendSend(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || 'Resend send failed');
  return json?.id as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!RESEND_API_KEY || !RESEND_FROM || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return ok({ success: false, error: 'Server not configured' }, 500);
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Pick failed or queued too long with attempts < 3
  const now = new Date();
  const cutoff1m = new Date(now.getTime() - 60 * 1000).toISOString();

  const { data: rows, error } = await db
    .from('notifications')
    .select('*')
    .in('status', ['failed', 'queued'])
    .lt('updated_at', cutoff1m)
    .lt('attempts', 3)
    .limit(25);

  if (error) return ok({ success: false, error: error.message }, 500);
  if (!rows || rows.length === 0) return ok({ success: true, retried: 0 });

  let sent = 0, failed = 0;
  for (const r of rows) {
    // basic backoff gate
    const wait = backoff(r.attempts || 1);
    const eligibleAt = new Date(new Date(r.updated_at).getTime() + wait * 1000);
    if (eligibleAt > now) continue;

    const attempts = (r.attempts || 0) + 1;

    await db.from('notifications').update({ status: 'sending', attempts }).eq('id', r.id);

    try {
      const pid = await resendSend(RESEND_API_KEY, RESEND_FROM, r.to_email, r.subject, r.html);
      await db.from('notifications').update({
        provider_message_id: pid,
        status: 'queued',
        updated_at: new Date().toISOString()
      }).eq('id', r.id);
      sent++;
    } catch (e: any) {
      await db.from('notifications').update({
        status: attempts >= 3 ? 'failed' : 'failed',
        last_error: e?.message || 'Retry failed',
        updated_at: new Date().toISOString()
      }).eq('id', r.id);
      failed++;
    }
  }

  return ok({ success: true, sent, failed });
});