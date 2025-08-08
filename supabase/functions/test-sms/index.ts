// Deno Edge Function: test-sms
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resJSON = (status: number, data: any) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    const mg = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');  // optional
    const from = Deno.env.get('TWILIO_FROM_NUMBER');          // '+18776918763'

    if (!sid || !token || (!mg && !from)) {
      return resJSON(500, {
        success: false,
        error: 'Twilio configuration missing',
        details: { hasSid: !!sid, hasToken: !!token, hasMessagingService: !!mg, hasFrom: !!from },
      });
    }

    let body: { phoneNumber?: string; testMessage?: string };
    try { body = await req.json(); } catch { return resJSON(400, { success: false, error: 'Invalid JSON body' }); }

    const to = (body.phoneNumber || '').trim();
    if (!/^\+\d{10,15}$/.test(to)) {
      return resJSON(400, { success: false, error: 'Invalid E.164 phoneNumber. Example: +19077444718' });
    }

    const message = body.testMessage?.slice(0, 1600) || 'Hello from Kutable test!';

    const creds = btoa(`${sid}:${token}`);
    const form = new URLSearchParams({
      To: to,
      Body: message,
      ...(mg ? { MessagingServiceSid: mg } : { From: from! }),
    });

    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // Common Twilio fields: code, message, more_info, status
      return resJSON(502, {
        success: false,
        error: json?.message || 'Twilio send failed',
        code: json?.code,
        twilioStatus: json?.status,
        more: json?.more_info,
      });
    }

    return resJSON(200, { success: true, sid: json.sid, status: json.status });
  } catch (e: any) {
    return resJSON(500, { success: false, error: e?.message || 'Unexpected server error' });
  }
});