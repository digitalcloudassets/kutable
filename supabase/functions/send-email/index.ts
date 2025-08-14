// Example server-only email sender using the same env helper
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { serverEnv } from '../_shared/env.ts';
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts';

const headers = corsHeaders(['POST', 'OPTIONS']);

serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  try {
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing to, subject, or html' }), { status: 400, headers: cors.headers });
    }

    // Example provider call (replace with your ESP)
    const resp = await fetch('https://api.emailprovider.example/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverEnv.emailProviderKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(JSON.stringify({ error: 'Email send failed', detail }), { status: 502, headers: cors.headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors.headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(e) }), { status: 500, headers: cors.headers });
  }
});