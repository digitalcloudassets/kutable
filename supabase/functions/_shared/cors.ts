// Centralized CORS + Origin allowlist for all public-facing Edge Functions.

const DEFAULT_METHODS = ["POST", "GET", "OPTIONS"] as const;
type Method = (typeof DEFAULT_METHODS)[number];

const parseCsv = (v: string | undefined | null) =>
  (v ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

// Dev-safe CORS: Auto-allow localhost in development, strict allowlist in production
const configuredOrigins = parseCsv(Deno.env.get("ALLOWED_ORIGINS"));
const devOrigins = [
  "http://localhost:5173",
  "http://localhost:3000", 
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000"
];

// Production domains that should always be allowed
const productionOrigins = [
  "https://kutable.com",
  "https://www.kutable.com",
  "https://comfy-centaur-130de9.netlify.app" // Netlify default domain
];

// In development, auto-include localhost origins. In production, use strict allowlist.
const isDev = !Deno.env.get("DENO_DEPLOYMENT_ID"); // Supabase sets this in production
const allowedOrigins = isDev 
  ? [...configuredOrigins, ...devOrigins, ...productionOrigins]
  : [...configuredOrigins, ...productionOrigins];

const ALLOWED = new Set(allowedOrigins);

// Hard fail if no origins configured in production
if (!isDev && configuredOrigins.length === 0) {
  console.error("🚨 CRITICAL: ALLOWED_ORIGINS not configured for production deployment!");
  console.error("Set ALLOWED_ORIGINS in Supabase Functions environment to your production domains");
}

// Log CORS configuration on startup
console.log(`🔒 CORS Configuration (${isDev ? 'DEV' : 'PROD'}):`, {
  allowedOrigins: Array.from(ALLOWED),
  totalAllowed: ALLOWED.size,
  isDevelopment: isDev
});

// Some internal calls (cron, server-to-server) won't send an Origin.
// If you want to allow those, set ALLOW_NO_ORIGIN=true
const ALLOW_NO_ORIGIN = (Deno.env.get("ALLOW_NO_ORIGIN") ?? "true").toLowerCase() === "true";

// Build headers per-function with the exact methods you support.
export function corsHeaders(methods: Method[] = [...DEFAULT_METHODS]) {
  return {
    "Access-Control-Allow-Origin": "*", // temporarily filled; replaced dynamically in withCors()
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Vary": "Origin", // inform caches that responses vary by Origin
  } as Record<string, string>;
}

// Validate Origin and return headers with the matched origin (or 403).
export function withCors(
  req: Request,
  baseHeaders: Record<string, string>,
  {
    // If this endpoint is ONLY used by Stripe or other machine clients, set requireBrowserOrigin=false.
    requireBrowserOrigin = true,
  }: { requireBrowserOrigin?: boolean } = {},
): { ok: true; headers: Record<string, string> } | { ok: false; res: Response } {
  const origin = req.headers.get("Origin");
  const isDev = !Deno.env.get("DENO_DEPLOYMENT_ID");

  // Machine-to-machine or local server calls might not send Origin
  if (!origin) {
    if (!requireBrowserOrigin && ALLOW_NO_ORIGIN) {
      // echo back nothing; browsers won't check CORS for non-browser requests
      const headers = { ...baseHeaders };
      // Ensure no wildcard in production: omit A-C-A-Origin if no origin
      delete headers["Access-Control-Allow-Origin"];
      return { ok: true, headers };
    }
    // If we require a browser origin but didn't get one, deny.
    console.warn(`🚨 CORS: Origin required but not provided. Request from: ${req.url}`);
    const res = new Response(JSON.stringify({ error: "Origin required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
    return { ok: false, res };
  }

  // Explicit allowlist check
  if (!ALLOWED.has(origin)) {
    console.warn(`🚨 CORS: Origin "${origin}" not in allowlist. Allowed origins:`, Array.from(ALLOWED));
    
    // In development, provide helpful error message
    const errorMessage = isDev 
      ? `Origin "${origin}" not allowed. Add it to ALLOWED_ORIGINS or use: ${Array.from(ALLOWED).join(', ')}`
      : "Origin not allowed";
      
    const res = new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
    return { ok: false, res };
  }

  // Log successful CORS validation in development
  if (isDev) {
    console.log(`✅ CORS: Origin "${origin}" allowed`);
  }

  // Reflect the allowed origin (never use '*')
  const headers = {
    ...baseHeaders,
    "Access-Control-Allow-Origin": origin,
  };
  return { ok: true, headers };
}

// Alternative: Build CORS headers directly for consistent usage
export function buildCorsHeaders(
  origin: string | null,
  methods: Method[] = [...DEFAULT_METHODS]
): Record<string, string> {
  const headers = {
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Vary": "Origin",
  };

  // If no origin provided (server-to-server calls), don't add Access-Control-Allow-Origin
  if (!origin) {
    return headers;
  }

  // Check if origin is allowed
  if (ALLOWED.has(origin)) {
    return {
      ...headers,
      "Access-Control-Allow-Origin": origin
    };
  }

  // Origin not allowed - don't add CORS headers (will result in CORS error)
  return headers;
}

// Standard preflight handler (use in every function that serves browsers).
export function handlePreflight(
  req: Request,
  headers: Record<string, string>,
  opts?: { requireBrowserOrigin?: boolean },
) {
  if (req.method === "OPTIONS") {
    const cors = withCors(req, headers, opts ?? {});
    if (!cors.ok) return cors.res;
    return new Response("ok", { headers: cors.headers });
  }
  return null as Response | null;
}