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

function isWebContainerEnvironment(): boolean {
  // Detect StackBlitz WebContainer environment that blocks external calls
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return hostname.includes('webcontainer-api.io') || 
           hostname.includes('stackblitz.io') ||
           hostname.includes('local-credentialless');
  }
  return false;
}

export function getFunctionsBaseUrl(): string {
  const explicit = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (explicit) return explicit;
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
  return deriveFromProjectUrl(projectUrl);
}

export async function plainFetchProbe(url: string): Promise<{
  ok: boolean;
  status?: number;
  detail: string;
  headers?: Record<string, string>;
}> {
  // Skip external network calls in WebContainer environments
  if (isWebContainerEnvironment()) {
    return {
      ok: false,
      detail: "WebContainer environment - external calls restricted",
      errorType: "WebContainerRestriction"
    };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout
    });
    
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    let body: any = null;
    try { 
      body = await response.clone().json(); 
    } catch { 
      body = await response.text(); 
    }
    
    return {
      ok: response.ok,
      status: response.status,
      detail: response.ok ? 'Connected' : `HTTP ${response.status}`,
      headers: responseHeaders
    };
  } catch (e: any) {
    let detail = "Network failure";
    
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      detail = "Network blocked or CORS issue";
    } else if (e.name === 'TimeoutError') {
      detail = "Request timeout";
    } else if (e.name === 'AbortError') {
      detail = "Request aborted";
    } else {
      detail = `Error: ${e?.message ?? String(e)}`;
    }
    
    return {
      ok: false,
      detail,
    };
  }
}

// Check if functions are deployed by testing ping endpoint
export async function checkFunctionDeployment(): Promise<{
  deployed: boolean;
  reachable: boolean;
  detail: string;
  url: string;
}> {
  const base = getFunctionsBaseUrl();
  if (!base) {
    return {
      deployed: false,
      reachable: false,
      detail: "Functions URL not configured",
      url: ""
    };
  }
  
  // Skip deployment check in WebContainer environments
  if (isWebContainerEnvironment()) {
    return {
      deployed: false,
      detail: "WebContainer environment - cannot verify deployment status",
      url: base
    };
  }

  const pingUrl = `${base}/ping`;
  
  // Test plain connectivity first
  const probe = await plainFetchProbe(pingUrl);
  
  if (!probe.ok) {
    return {
      deployed: false,
      reachable: false,
      detail: `Not reachable: ${probe.detail}`,
      url: pingUrl
    };
  }
  
  // If we get a response, functions are likely deployed
  return {
    deployed: true,
    reachable: true,
    detail: `Functions accessible (HTTP ${probe.status})`,
    url: pingUrl
  };
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

  // First check deployment status with plain fetch
  const deployCheck = await checkFunctionDeployment();
  if (!deployCheck.deployed || !deployCheck.reachable) {
    return {
      ok: false,
      detail: deployCheck.detail,
      url: deployCheck.url,
      deployed: deployCheck.deployed,
      reachable: deployCheck.reachable
    };
  }

  // If basic connectivity works, try authenticated ping
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
    
    return { ok: false, detail, url, errorType: e.name };
  }
}