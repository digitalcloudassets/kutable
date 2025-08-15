import { createClient } from "npm:@supabase/supabase-js@2";
import { handlePreflight, buildCorsHeaders } from "../_shared/cors.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";
import { withSecurityHeaders } from "../_shared/security_headers.ts";
import { slog } from "../_shared/logger.ts";
import { withSecurityHeaders } from "../_shared/security_headers.ts";
import { withSecurityHeaders } from "../_shared/security_headers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  const base = withSecurityHeaders(buildCorsHeaders(null, ["POST", "OPTIONS"]));
  const preflight = handlePreflight(req, base);
  if (preflight) return preflight;

  const origin = req.headers.get("Origin");
  const cors = withSecurityHeaders(buildCorsHeaders(origin, ["POST", "OPTIONS"]));

  // RATE LIMIT: 30 admin guard checks per 60 seconds per IP
  const rl = await consumeRateLimit(req, "admin-guard", { limit: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ 
      ok: false, 
      reason: "Rate limited",
      retryAfter: 60
    }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Hard fail if required environment variables are missing
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    slog.error("🚨 CRITICAL: Missing required environment variables for admin-guard");
    slog.error("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ 
      ok: false, 
      reason: "Server configuration error",
      error: "Missing required environment variables" 
    }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Hard fail if no admin users configured
  if (ADMIN_UIDS.length === 0 && ADMIN_EMAILS.length === 0) {
    slog.error("🚨 CRITICAL: No admin users configured");
    slog.error("Set ADMIN_UIDS and/or ADMIN_EMAILS in Supabase Functions environment");
    return new Response(JSON.stringify({ 
      ok: false, 
      reason: "No admin users configured",
      error: "Admin access not configured" 
    }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: "Missing Authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Create client with service role key - bypass RLS for admin operations
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    // Manually verify the JWT from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ ok: false, reason: "Unauthenticated" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const isUidAllowed = ADMIN_UIDS.includes(user.id);
    const isEmailAllowed = user.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

    if (!isUidAllowed && !isEmailAllowed) {
      return new Response(JSON.stringify({ ok: false, reason: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user: { id: user.id, email: user.email } }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    slog.error('Admin guard error:', e);
    return new Response(JSON.stringify({ ok: false, reason: "Error", detail: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});