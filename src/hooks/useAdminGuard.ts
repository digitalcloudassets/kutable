// Admin guard hook: session-aware, only calls Edge Function when logged in
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { shouldBypassAdminGuards } from "../lib/devFlags";

type State = { loading: boolean; allowed: boolean | null; error: string | null };

export function useAdminGuard(): State {
  const [state, set] = useState<State>({ loading: true, allowed: null, error: null });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Bypass admin guards in preview environments to prevent network errors
        if (shouldBypassAdminGuards()) {
          if (!cancelled) set({ loading: false, allowed: true, error: null });
          return;
        }

        // 1) Check session first
        const { data: { session } } = await supabase.auth.getSession();

        // No session is NOT an error; just say not allowed (quietly)
        if (!session) {
          if (!cancelled) set({ loading: false, allowed: false, error: null });
          return;
        }

        // 2) We have a session — call the guard
        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });

        if (cancelled) return;

        if (error) {
          // Real failure (CORS/401/403/5xx)
          set({ loading: false, allowed: false, error: error.message ?? "Edge call failed" });
          return;
        }

        if (!data?.ok) {
          // Not an admin (403) or unauth (401) — still not an exception
          set({ loading: false, allowed: false, error: data?.reason ?? null });
          return;
        }

        set({ loading: false, allowed: true, error: null });
      } catch (e: any) {
        if (!cancelled) {
          set({ loading: false, allowed: false, error: String(e?.message ?? e) });
        }
      }
    };

    run();

    // Also react to login/logout so the guard re-evaluates
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, _session) => {
      // Re-run on auth events
      set({ loading: true, allowed: null, error: null });
      run();
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return state;
}