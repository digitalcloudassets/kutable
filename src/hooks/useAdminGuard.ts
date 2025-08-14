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
        // Step 1: Test basic connectivity with ping function
        console.log('🏓 Testing Edge Function connectivity...');
        try {
          const { data: pingData, error: pingError } = await supabase.functions.invoke("ping", { body: {} });
          if (pingError) {
            console.error('🚨 Ping function failed:', pingError);
            if (!cancelled) {
              setErrorMsg(`Network/CORS Error: ${pingError.message || 'Cannot reach Edge Functions'}`);
              setAllowed(false);
              setLoading(false);
            }
            return;
          }
          console.log('✅ Ping successful:', pingData);
        } catch (pingErr: any) {
          console.error('🚨 Ping function network error:', pingErr);
          if (!cancelled) {
            setErrorMsg(`Network Error: ${pingErr.message || 'Edge Functions unreachable'}`);
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        // Step 2: Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('👤 No user session found');
          if (!cancelled) { setAllowed(false); setLoading(false); }
          return;
        }
        
        // Step 3: Test admin access
        console.log('🔐 Testing admin access for user:', session.user.id);
        const { data, error } = await supabase.functions.invoke("admin-guard", { body: {} });
        if (!cancelled) {
          if (error) {
            console.error('🚨 Admin guard error:', error);
            setErrorMsg(`Auth Error: ${error.message ?? "Admin access check failed"}`);
            setAllowed(false);
          } else {
            console.log('🔐 Admin guard response:', data);
            setAllowed(Boolean(data?.ok));
            if (!data?.ok) {
              setErrorMsg(`Access Denied: ${data?.reason || 'Not authorized as admin'}`);
            }
          }
        }
      } catch (e: any) {
        console.error('🚨 Admin guard hook error:', e);
        if (!cancelled) {
          setErrorMsg(`Unexpected Error: ${e?.message ?? "Admin check failed"}`);
          setAllowed(false);
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