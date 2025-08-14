import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { env } from "../lib/env";
import { pingFunctions, getFunctionsBaseUrl } from "../lib/functionsDiagnostics";

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
        // Step 1: Verify Supabase URL configuration
        console.log('🔍 Verifying Supabase configuration...');
        const supabaseUrl = env.supabaseUrl;
        const supabaseKey = env.supabaseAnonKey;
        const functionsUrl = getFunctionsBaseUrl();
        
        if (!supabaseUrl || !supabaseKey) {
          if (!cancelled) {
            setErrorMsg('Supabase configuration missing - check environment variables');
            setAllowed(false);
            setLoading(false);
          }
          return;
        }
        
        if (supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
          if (!cancelled) {
            setErrorMsg('Supabase configuration contains placeholder values');
            setAllowed(false);
            setLoading(false);
          }
          return;
        }
        
        if (!supabaseUrl.includes('.supabase.co')) {
          if (!cancelled) {
            setErrorMsg('Invalid Supabase URL format - should contain .supabase.co');
            setAllowed(false);
            setLoading(false);
          }
          return;
        }
        
        console.log('✅ Supabase URL verified:', supabaseUrl.split('//')[1]);
        console.log('🔗 Functions URL:', functionsUrl);

        // Step 2: Test Edge Function connectivity with direct ping
        console.log('🏓 Testing Edge Function connectivity...');
        const pingResult = await pingFunctions();
        console.log('🏓 Ping result:', pingResult);
        
        if (!pingResult.ok) {
          console.error('🚨 Edge Functions unreachable:', pingResult);
          if (!cancelled) {
            setErrorMsg(`Network/CORS Error: ${pingResult.detail} (URL: ${pingResult.url || functionsUrl})`);
            setAllowed(false);
            setLoading(false);
          }
          return;
        }
        console.log('✅ Edge Functions reachable:', pingResult.body);

        // Step 3: Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('👤 No user session found');
          if (!cancelled) { setAllowed(false); setLoading(false); }
          return;
        }
        
        
        // Step 4: Test admin access
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