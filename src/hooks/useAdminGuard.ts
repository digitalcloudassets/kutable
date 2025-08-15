// Admin guard hook with better error bubbling
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type State = { loading: boolean; allowed: boolean | null; error: string | null };

export function useAdminGuard(): State {
  const [state, set] = useState<State>({ loading: true, allowed: null, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return !cancelled && set({ loading: false, allowed: false, error: "No session" });

        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        if (cancelled) return;

        if (error) return set({ loading: false, allowed: false, error: error.message ?? "Edge call failed" });
        if (!data?.ok) return set({ loading: false, allowed: false, error: data?.reason ?? "Not allowed" });

        set({ loading: false, allowed: true, error: null });
      } catch (e: any) {
        if (!cancelled) set({ loading: false, allowed: false, error: String(e?.message ?? e) });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}