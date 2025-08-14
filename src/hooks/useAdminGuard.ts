import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { isWebContainer, isRealRuntime } from "../lib/runtimeEnv";

export function useAdminGuard() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;



    if (isWebContainer() && !isRealRuntime()) {
      setAllowed(false);
      setErrorMsg("Admin features are disabled in WebContainer environments. Deploy or run locally.");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        // 1) Ensure session exists and is fresh
        let { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;

        // 2) If no session or near expiry, refresh
        const now = Math.floor(Date.now() / 1000);
        const exp = session?.expires_at ?? 0;
        if (!session || exp - now < 30) {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          session = data.session;
        }
        if (!session?.access_token) {
          setAllowed(false);
          setErrorMsg("No active session");
          return;
        }

        // 3) Call admin-guard function with fresh session
        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        if (cancelled) return;

        if (error) {
          setAllowed(false);
          setErrorMsg(error.message ?? "admin-guard failed");
        } else {
          setAllowed(Boolean(data?.ok));
          if (!data?.ok) setErrorMsg(data?.reason ?? "Forbidden");
        }
      } catch (e: any) {
        if (!cancelled) {
          setAllowed(false);
          setErrorMsg(e?.message ?? "Failed to reach admin-guard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Return errorMsg to show helpful debugging info
  return { loading, allowed, errorMsg };
}