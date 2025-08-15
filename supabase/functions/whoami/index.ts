import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { corsHeaders, handlePreflight, withCors } from "../_shared/cors.ts";

const headers = corsHeaders(["POST", "OPTIONS"]);
const REQUIRE_BROWSER_ORIGIN = (Deno.env.get("REQUIRE_BROWSER_ORIGIN") ?? "true").toLowerCase() === "true";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  const pre = handlePreflight(req, headers, { requireBrowserOrigin: REQUIRE_BROWSER_ORIGIN });
  if (pre) return pre;

  const cors = withCors(req, headers, { requireBrowserOrigin: REQUIRE_BROWSER_ORIGIN });
  if (!cors.ok) return cors.res;

  const origin = req.headers.get("Origin") ?? null;
  const auth = req.headers.get("Authorization") ?? null;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth ?? "" } },
    });
    const { data, error } = await supabase.auth.getUser();

    return new Response(JSON.stringify({
      ok: true,
      origin,
      hasAuthHeader: !!auth,
      user: error ? null : { id: data?.user?.id ?? null, email: data?.user?.email ?? null },
      error: error?.message ?? null,
    }), { status: 200, headers: { ...cors.headers, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, origin, error: String(e) }), {
      status: 500,
      headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});