// Surface useful errors so you can see when CORS/env is the problem.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminGuard() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) { setAllowed(false); setLoading(false); }
          return;
        }
        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        if (!cancelled) {
          if (error) {
            setErrorMsg(error.message ?? "Edge Function call failed");
            setAllowed(false);
          } else {
            setAllowed(Boolean(data?.ok));
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message ?? "Failed to reach admin-guard");
          setAllowed(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // optional: you can return errorMsg to show a toast
  return { loading, allowed, errorMsg };
}