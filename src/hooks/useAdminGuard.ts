// Small hook that calls the admin-guard function and returns { loading, allowed }
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAdminGuard() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Ensure we have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        if (!cancelled) {
          if (error) {
            setAllowed(false);
          } else {
            setAllowed(Boolean(data?.ok));
          }
        }
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, allowed };
}