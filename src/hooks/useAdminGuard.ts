// Admin guard hook with better error bubbling
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type State = { loading: boolean; allowed: boolean | null; errorMsg: string | null };

export function useAdminGuard(): State & { error: string | null } {
  const [state, setState] = useState<State>({ loading: true, allowed: null, errorMsg: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setState({ loading: false, allowed: false, errorMsg: "No session" });
          return;
        }

        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        if (cancelled) return;

        if (error) {
          setState({ loading: false, allowed: false, errorMsg: error.message ?? "Edge call failed" });
          return;
        }
        
        if (!data?.ok) {
          setState({ loading: false, allowed: false, errorMsg: data?.reason ?? "Not allowed" });
          return;
        }

        setState({ loading: false, allowed: true, errorMsg: null });
      } catch (e: any) {
        if (!cancelled) {
          setState({ loading: false, allowed: false, errorMsg: String(e?.message ?? e) });
        }
      }
    })();
    
    return () => { 
      cancelled = true; 
    };
  }, []);

  return { ...state, error: state.errorMsg };
}