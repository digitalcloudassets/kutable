// Replace any direct Deno.env.get(...) usage with the centralized helper.
// Remove any reliance on VITE_* keys here.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { serverEnv } from '../_shared/env.ts';
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts';
import { consumeRateLimit } from '../_shared/rateLimit.ts';

const headers = corsHeaders(['POST', 'OPTIONS']);

serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  // RATE LIMIT: 3 SMS per 60 seconds per IP to prevent abuse
  const rl = await consumeRateLimit(req, "send-sms", { limit: 3, windowSeconds: 60 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Too many SMS attempts. Try again in a minute.",
      retryAfter: 60
    }), {
      status: 429,
      headers: cors.headers
    });
  }

  // Hard fail if SMS service environment variables are missing
  if (!serverEnv.twilio.sid || !serverEnv.twilio.token || !serverEnv.twilio.from) {
    console.error("🚨 CRITICAL: Missing Twilio configuration for SMS service");
    console.error("Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER");
    return new Response(JSON.stringify({ 
      error: 'SMS service not configured',
      details: 'Missing Twilio environment variables'
    }), { status: 500, headers: cors.headers });
  }

  try {
    const { to, body } = await req.json();

    if (!to || !body) {
      return new Response(JSON.stringify({ error: 'Missing to or body' }), { status: 400, headers: cors.headers });
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
        headers: cors.headers,
      });
    }

    const data = await twilioResp.json();
    return new Response(JSON.stringify({ ok: true, sid: data.sid }), { status: 200, headers: cors.headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(e) }), {
      status: 500,
      headers: cors.headers,
    });
  }
});