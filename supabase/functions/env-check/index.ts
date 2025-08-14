import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts';

const headers = corsHeaders(['GET', 'OPTIONS']);

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (s:number,d:any)=>new Response(JSON.stringify(d),{status:s,headers:{...cors.headers,'Content-Type':'application/json'}});

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const RESEND_FROM = Deno.env.get('RESEND_FROM');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('env-check', {
    hasResendKey: !!RESEND_API_KEY,
    hasFrom: !!RESEND_FROM,
    hasUrl: !!SUPABASE_URL,
    hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  });

  return json(200, {
    ok: true,
    hasResendKey: !!RESEND_API_KEY,
    hasFrom: !!RESEND_FROM,
    hasUrl: !!SUPABASE_URL,
    hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  });
});