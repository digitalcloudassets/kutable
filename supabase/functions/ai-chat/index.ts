// Only if you plan to keep AI chat. Runs fully server-side; OPENAI key never touches the client.
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
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid prompt' }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ error: 'Invalid prompt' }), { status: 400, headers: cors.headers });
    }

    // Simple example using OpenAI Responses API
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverEnv.openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful scheduling assistant for a barber booking app.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(JSON.stringify({ error: 'OpenAI request failed', detail }), { status: 502, headers: corsHeaders });
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ answer }), { status: 200, headers: cors.headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(e) }), { status: 500, headers: cors.headers });
  }
});