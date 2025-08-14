// Prefer the explicit FUNCTIONS_URL when present; fall back to derivation.
import { supabase } from "./supabase";

function deriveFromProjectUrl(projectUrl: string): string {
  try {
    const u = new URL(projectUrl);
    const [projectRef, supa, tld] = u.hostname.split(".");
    if (supa !== "supabase" || tld !== "co") throw new Error("not supabase");
    return `https://${projectRef}.functions.supabase.co`;
  } catch {
    return "";
  }
}

export function getFunctionsBaseUrl(): string {
  const explicit = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (explicit) return explicit;
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return deriveFromProjectUrl(projectUrl);
}

export async function pingFunctions() {
  const base = getFunctionsBaseUrl();
  if (!base) return { ok: false, detail: "Invalid FUNCTIONS URL" };

  // In development, check if we're likely using a real Supabase project or fallback mode
  const isDev = import.meta.env.DEV;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const isPlaceholder = !supabaseUrl || 
    supabaseUrl.includes('placeholder') || 
    supabaseUrl === 'https://your-project.supabase.co' ||
    supabaseUrl === 'your_supabase_url_here';

  if (isDev && isPlaceholder) {
    return { 
      ok: false, 
      detail: "Supabase not connected - using fallback mode",
      url: base,
      developmentMode: true
    };
  }
  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  // In development with credentialless preview, external requests may be blocked
  if (isDev && window.location.hostname.includes('webcontainer-api.io')) {
    return {
      ok: false,
      detail: "Development environment detected - external Edge Functions calls disabled",
      url: base,
      developmentMode: true,
      skipNetworkTest: true
    };
  }
  if (sessErr) return { ok: false, detail: `Auth session error: ${sessErr.message}` };

  const url = `${base}/ping`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        "Content-Type": "application/json",
      },
      // Add timeout for faster failure detection
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    let body: any = null;
    try { body = await resp.clone().json(); } catch { body = await resp.text(); }
    if (!resp.ok) return { ok: false, detail: "HTTP error", status: resp.status, body, url };
    return { ok: true, detail: "Reachable", status: resp.status, body, url };
  } catch (e: any) {
    // Provide more specific error details for different failure types
    let detail = "Network failure";
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      detail = isDev ? "Edge Functions not deployed or CORS not configured for localhost:5173" : "Network connectivity issue";
    } else if (e.name === 'TimeoutError') {
      detail = "Request timeout - functions may be unavailable";
    } else {
      detail = `Network failure: ${e?.message ?? String(e)}`;
    }
    
    return { ok: false, detail: `Network failure: ${e?.message ?? String(e)}`, url };
  }
}