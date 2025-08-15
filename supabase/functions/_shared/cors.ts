// CORS with exact origins + suffix matching for preview domains
const DEFAULT_METHODS = ["POST", "GET", "OPTIONS"] as const;
type Method = (typeof DEFAULT_METHODS)[number];

const csv = (v?: string | null) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Exact origins (scheme+host)
const EXACT = new Set(csv(Deno.env.get("ALLOWED_ORIGINS")));

// Suffix match (e.g., .netlify.app)
const SUFFIXES = csv(Deno.env.get("ALLOWED_ORIGIN_SUFFIXES"));

// Allow calls that have no/"null" Origin? (useful for Bolt/webcontainer/dev tools)
const ALLOW_NO_ORIGIN = (Deno.env.get("ALLOW_NO_ORIGIN") ?? "true").toLowerCase() === "true";
const ALLOW_NULL_ORIGIN = (Deno.env.get("ALLOW_NULL_ORIGIN") ?? "true").toLowerCase() === "true";

function isAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (origin === "null") return ALLOW_NULL_ORIGIN ? "null" : null;

  if (EXACT.has(origin)) return origin;

  // Fallback: if no allowlist configured, allow the requesting origin
  if (EXACT.size === 0 && SUFFIXES.length === 0) {
    return origin;
  }

  // Fallback: if no allowlist configured, allow the requesting origin
  if (EXACT.size === 0 && SUFFIXES.length === 0) {
    return origin;
  }

  try {
    const u = new URL(origin);
    for (const suf of SUFFIXES) {
      const clean = suf.replace(/^\./, "");
      if (u.host.endsWith(clean)) return `${u.protocol}//${u.host}`;
    }
  } catch {
    // ignore
  }
  return null;
}

export function corsHeaders(methods: Method[] = [...DEFAULT_METHODS]) {
  return {
    "Access-Control-Allow-Origin": "*", // will be swapped/removed
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
    Vary: "Origin",
  } as Record<string, string>;
}

export function withCors(
  req: Request,
  baseHeaders: Record<string, string>,
  { requireBrowserOrigin = true }: { requireBrowserOrigin?: boolean } = {},
):
  | { ok: true; headers: Record<string, string> }
  | { ok: false; res: Response } {
  const origin = req.headers.get("Origin");

  // Handle no/"null" origin first
  if (!origin || origin === "null") {
    if ((!requireBrowserOrigin && ALLOW_NO_ORIGIN) || (origin === "null" && ALLOW_NULL_ORIGIN)) {
      // For non-browser/server calls or credentialless frames:
      // omit A-C-A-Origin to avoid wildcard leakage
      const headers = { ...baseHeaders };
      delete headers["Access-Control-Allow-Origin"];
      return { ok: true, headers };
    }
    return {
      ok: false,
      res: new Response(JSON.stringify({ error: "Origin required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const allowed = isAllowedOrigin(origin);
  if (!allowed) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ error: "Origin not allowed", origin }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const headers = { ...baseHeaders, "Access-Control-Allow-Origin": allowed === "null" ? "*" : allowed };
  return { ok: true, headers };
}

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