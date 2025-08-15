// Admin guard using ANON key for user verification
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { corsHeaders, handlePreflight, withCors } from "../_shared/cors.ts";

const headers = corsHeaders(["POST", "OPTIONS"]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_UIDS = (Deno.env.get("ADMIN_UIDS") ?? "").split(",").map(s=>s.trim()).filter(Boolean);
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

serve(async (req) => {
  const pre = handlePreflight(req, headers, { requireBrowserOrigin: true });
  if (pre) return pre;

  const cors = withCors(req, headers, { requireBrowserOrigin: true });
  if (!cors.ok) return cors.res;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: "Missing Authorization" }), {
        status: 401, headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return new Response(JSON.stringify({ ok: false, reason: "Unauthenticated" }), {
        status: 401, headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    const user = data.user;
    const isAdmin =
      ADMIN_UIDS.includes(user.id) ||
      (user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false);

    if (!isAdmin) {
      return new Response(JSON.stringify({ ok: false, reason: "Forbidden" }), {
        status: 403, headers: { ...cors.headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user: { id: user.id, email: user.email } }), {
      status: 200, headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: "Error", detail: String(e) }), {
      status: 500, headers: { ...cors.headers, "Content-Type": "application/json" },
    });
  }
});