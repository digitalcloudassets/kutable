import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { devPreviewEnabled } from "../lib/devFlags";

function isWebContainerHost() {
  const h = typeof window !== "undefined" ? window.location.hostname : "";
  return h.includes("webcontainer-api.io") || h.includes("stackblitz") || h.includes("codesandbox");
}

export function useSupabaseConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // In preview sandboxes, don't hard-fail — network/CORS can be weird.
    if (isWebContainerHost()) {
      // In dev preview mode, always show as connected
      setIsConnected(devPreviewEnabled() ? true : true);
      setReason(devPreviewEnabled() ? "dev-preview-mode" : "preview-env");
      return;
    }

    (async () => {
      try {
        // Fast, safe check: auth settings endpoint (no RLS, no tables)
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 4000);

        // @ts-expect-error: supabase-js doesn't expose getSettings() typed in all versions; fallback to fetch.
        const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`;
        const resp = await fetch(url, { signal: ctrl.signal, headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } });
        clearTimeout(timeout);

        if (!resp.ok) {
          setIsConnected(false);
          setReason(`auth-settings-${resp.status}`);
          return;
        }

        setIsConnected(true);
        setReason(null);
      } catch (e: any) {
        setIsConnected(false);
        setReason(e?.name === "AbortError" ? "timeout" : "network");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { 
    isConnected: isConnected ?? true, // default to true so we never block login
    status: isConnected,
    reason 
  };
}