// Persistent rate limit using Postgres via rl_consume. Keyed by action + identifier.
import { createServiceClient } from "./db.ts";

function getClientIp(req: Request): string {
  // Trust common forwarding headers. Fallback to a hashable value if none present.
  const xfwd = req.headers.get("x-forwarded-for");
  if (xfwd) return xfwd.split(",")[0].trim();
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  // Last resort: use user agent + accept as a weak identifier
  return `ua:${req.headers.get("user-agent") ?? "unknown"}`;
}

export type RateLimitConfig = {
  limit: number;          // maximum requests allowed in window
  windowSeconds: number;  // window size in seconds
  // Optional: override identifier, e.g., authenticated user id if you want stricter control
  identifier?: string;
};

export async function consumeRateLimit(req: Request, action: string, cfg: RateLimitConfig) {
  const supabase = createServiceClient();
  const identifier = cfg.identifier ?? getClientIp(req);

  // Call the Postgres function to atomically increment
  const { data, error } = await supabase.rpc("rl_consume", {
    _action: action,
    _identifier: identifier,
    _window_seconds: cfg.windowSeconds,
  });

  if (error) {
    // Fail open but log server-side. You can tighten this to fail closed if you prefer.
    console.error("[rateLimit] rpc error", error);
    return { allowed: true, remaining: 1, used: 1, limit: cfg.limit };
  }

  const used = Number(data ?? 0);
  const allowed = used <= cfg.limit;
  const remaining = Math.max(cfg.limit - used, 0);

  return { allowed, remaining, used, limit: cfg.limit, identifier };
}