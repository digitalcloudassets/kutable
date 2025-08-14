// Minimal endpoint to confirm function deployment + CORS config.
// Deploy with: supabase functions deploy ping
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handlePreflight, withCors } from "../_shared/cors.ts";

const headers = corsHeaders(["GET", "OPTIONS"]);

serve(async (req) => {
  const pre = handlePreflight(req, headers, { requireBrowserOrigin: true });
  if (pre) return pre;

  const cors = withCors(req, headers, { requireBrowserOrigin: true });
  if (!cors.ok) return cors.res;

  return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
    status: 200,
    headers: { ...cors.headers, "Content-Type": "application/json" },
  });
});