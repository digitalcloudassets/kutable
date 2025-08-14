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

  const { data: { session }, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) return { ok: false, detail: `Auth session error: ${sessErr.message}` };

  const url = `${base}/ping`;
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        "Content-Type": "application/json",
      },
    });
    let body: any = null;
    try { body = await resp.clone().json(); } catch { body = await resp.text(); }
    if (!resp.ok) return { ok: false, detail: "HTTP error", status: resp.status, body, url };
    return { ok: true, detail: "Reachable", status: resp.status, body, url };
  } catch (e: any) {
    return { ok: false, detail: `Network failure: ${e?.message ?? String(e)}`, url };
  }
}