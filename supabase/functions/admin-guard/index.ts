// Secure admin check: verifies the caller's Supabase auth user and compares against allowed admins.
// Deploy: supabase functions deploy admin-guard
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // (Tighten to your domain in your CORS hardening task)
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed admins (configure via Supabase Function env, NOT client)
const ADMIN_UIDS = (Deno.env.get("ADMIN_UIDS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "")
  .split(",")
  .map((s) => s.toLowerCase().trim())
  .filter(Boolean);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Debug: Log environment variables (without exposing them fully)
    console.log('Admin guard check:', {
      hasAdminUids: !!Deno.env.get("ADMIN_UIDS"),
      hasAdminEmails: !!Deno.env.get("ADMIN_EMAILS"),
      adminUidsLength: ADMIN_UIDS.length,
      adminEmailsLength: ADMIN_EMAILS.length,
      timestamp: new Date().toISOString()
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: "Missing Authorization" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Create a server client that can read the user from the JWT in the Authorization header
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log('Auth error in admin guard:', { error: error?.message, hasUser: !!user });
      return new Response(JSON.stringify({ ok: false, reason: "Unauthenticated" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const isUidAllowed = ADMIN_UIDS.includes(user.id);
    const isEmailAllowed = user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

    // Debug: Log authorization check
    console.log('Authorization check:', {
      userId: user.id,
      userEmail: user.email,
      isUidAllowed,
      isEmailAllowed,
      configuredUids: ADMIN_UIDS.length > 0 ? '[CONFIGURED]' : '[EMPTY]',
      configuredEmails: ADMIN_EMAILS.length > 0 ? '[CONFIGURED]' : '[EMPTY]'
    });

    if (!isUidAllowed && !isEmailAllowed) {
      return new Response(JSON.stringify({ ok: false, reason: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    console.log('Admin access granted:', { userId: user.id, email: user.email });

    return new Response(JSON.stringify({ ok: true, user: { id: user.id, email: user.email } }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, reason: "Error", detail: String(e) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});