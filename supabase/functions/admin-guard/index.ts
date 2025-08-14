import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { corsHeaders, withCors, handlePreflight } from "../_shared/cors.ts";

const headers = corsHeaders(["POST", "OPTIONS"]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Allowed admins (configure via Supabase Function env, NOT client)
const ADMIN_UIDS = (Deno.env.get("ADMIN_UIDS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .split(",")
  .map((s) => s.toLowerCase().trim())
  .filter(Boolean);

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  // Hard fail if required environment variables are missing
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error("🚨 CRITICAL: Missing required environment variables for admin-guard");
    console.error("Required: SUPABASE_URL, SUPABASE_ANON_KEY");
    return new Response(JSON.stringify({ 
      ok: false, 
      reason: "Server configuration error",
      error: "Missing required environment variables" 
    }), {
      status: 500,
      headers: cors.headers,
    });
  }

  // Hard fail if no admin users configured
  if (ADMIN_UIDS.length === 0 && ADMIN_EMAILS.length === 0) {
    console.error("🚨 CRITICAL: No admin users configured");
    console.error("Set ADMIN_UIDS and/or ADMIN_EMAILS in Supabase Functions environment");
    return new Response(JSON.stringify({ 
      ok: false, 
      reason: "No admin users configured",
      error: "Admin access not configured" 
    }), {
      status: 500,
      headers: cors.headers,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: "Missing Authorization" }), {
        status: 401,
        headers: cors.headers,
      });
    }

    // Create client with anon key and use the provided auth header
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ ok: false, reason: "Unauthenticated" }), {
        status: 401,
        headers: cors.headers,
      });
    }

    const isUidAllowed = ADMIN_UIDS.includes(user.id);
    const isEmailAllowed = user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

    if (!isUidAllowed && !isEmailAllowed) {
      return new Response(JSON.stringify({ ok: false, reason: "Forbidden" }), {
        status: 403,
        headers: cors.headers,
      });
    }

    return new Response(JSON.stringify({ ok: true, user: { id: user.id, email: user.email } }), {
      status: 200,
      headers: cors.headers,
    });
  } catch (e) {
    console.error('Admin guard error:', e);
    return new Response(JSON.stringify({ ok: false, reason: "Error", detail: String(e) }), {
      status: 500,
      headers: cors.headers,
    });
  }
});