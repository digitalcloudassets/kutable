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
        console.log('🔐 Admin Guard Hook: Starting admin check...');
        
        // Ensure we have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('🔐 Admin Guard Hook: No session found');
          if (!cancelled) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        console.log('🔐 Admin Guard Hook: Session found, calling admin-guard function...');
        
        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        
        console.log('🔐 Admin Guard Hook: Function response:', { 
          data, 
          error: error?.message || error,
          hasData: !!data,
          dataOk: data?.ok 
        });
        
        if (!cancelled) {
          if (error) {
            console.error('🔐 Admin Guard Hook: Function error:', error);
            setAllowed(false);
          } else {
            console.log('🔐 Admin Guard Hook: Setting allowed to:', Boolean(data?.ok));
            setAllowed(Boolean(data?.ok));
          }
        }
      } catch (err) {
        console.error('🔐 Admin Guard Hook: Unexpected error:', err);
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