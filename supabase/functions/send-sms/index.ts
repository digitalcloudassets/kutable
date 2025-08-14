// Replace any direct Deno.env.get(...) usage with the centralized helper.
// Remove any reliance on VITE_* keys here.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { serverEnv } from '../_shared/env.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // tighten in your CORS pass (task #3)
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, body } = await req.json();

    if (!to || !body) {
      return new Response(JSON.stringify({ error: 'Missing to or body' }), { status: 400, headers: corsHeaders });
    }

    const auth = btoa(`${serverEnv.twilio.sid}:${serverEnv.twilio.token}`);
    const params = new URLSearchParams({
      To: to,
      From: serverEnv.twilio.from,
      Body: body,
    });

    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${serverEnv.twilio.sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      },
    );

    if (!twilioResp.ok) {
      const errText = await twilioResp.text();
      return new Response(JSON.stringify({ error: 'Twilio send failed', detail: errText }), {
        status: 502,
        headers: corsHeaders,
      });
    }

    const data = await twilioResp.json();
    return new Response(JSON.stringify({ ok: true, sid: data.sid }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});