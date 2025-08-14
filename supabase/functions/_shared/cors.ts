// Centralized CORS + Origin allowlist for all public-facing Edge Functions.

const DEFAULT_METHODS = ["POST", "GET", "OPTIONS"] as const;
type Method = (typeof DEFAULT_METHODS)[number];

const parseCsv = (v: string | undefined | null) =>
  (v ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

// Configure allowed origins via Function env:
// ALLOWED_ORIGINS=https://kutable.com,https://www.kutable.com,https://staging.kutable.com,http://localhost:5173
const ALLOWED = new Set(parseCsv(Deno.env.get("ALLOWED_ORIGINS")));

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
    const res = new Response(JSON.stringify({ error: "Origin required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
    return { ok: false, res };
  }

  // Explicit allowlist check
  if (!ALLOWED.has(origin)) {
    const res = new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
    return { ok: false, res };
  }

  // Reflect the allowed origin (never use '*')
  const headers = {
    ...baseHeaders,
    "Access-Control-Allow-Origin": origin,
  };
  return { ok: true, headers };
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