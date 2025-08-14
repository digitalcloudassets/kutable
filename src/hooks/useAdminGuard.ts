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
        
        // First check deployment status
        const { checkFunctionDeployment } = await import('../lib/functionsDiagnostics');
        const deployCheck = await checkFunctionDeployment();
        console.log('📋 Deployment check:', deployCheck);
        
        if (!deployCheck.deployed) {
          // Handle WebContainer restrictions gracefully
          if (deployCheck.detail.includes('WebContainer environment')) {
            console.log('ℹ️ WebContainer detected - admin features disabled in this environment');
            if (!cancelled) {
              setErrorMsg('Admin features are disabled in WebContainer environments. Deploy or run locally for full functionality.');
              setAllowed(false);
              setLoading(false);
            }
            return;
          }
          
          console.warn('🚨 Functions not deployed:', deployCheck);
          if (!cancelled) {
            setErrorMsg(`Functions not deployed: ${deployCheck.detail}`);
            setAllowed(false);
            setLoading(false);
          }
          return;
        }
        
        const pingResult = await pingFunctions();
        console.log('🏓 Ping result:', pingResult);
        
        if (!pingResult.ok) {
          console.warn('🚨 Edge Functions unreachable:', pingResult);
          
          // In development with placeholder config, this is expected
          if (pingResult.developmentMode || pingResult.skipNetworkTest) {
            console.log('ℹ️  Running in fallback mode - connect to Supabase for full functionality');
            if (!cancelled) {
              setAllowed(false);
              setLoading(false);
            }
            return;
          }
          
          // Provide helpful error message based on error type
          let errorMessage = `Network/CORS Error: ${pingResult.detail}`;
          if (pingResult.url) {
            errorMessage += ` (URL: ${pingResult.url})`;
          }
          
          if (pingResult.detail.includes('CORS not configured')) {
            errorMessage += '\n\nTo fix: Deploy functions and set ALLOWED_ORIGINS=http://localhost:5173 in Supabase Functions environment';
          } else if (pingResult.detail.includes('not deployed')) {
            errorMessage += '\n\nTo fix: Run `supabase functions deploy` to deploy Edge Functions';
          }
          
          if (!cancelled) {
            setErrorMsg(errorMessage);
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
        
        // Call Netlify function instead of Supabase function
        try {
          const response = await fetch('/.netlify/functions/admin-guard', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
          }
          
          console.log('🔐 Admin guard response:', data);
          if (!cancelled) {
            setAllowed(Boolean(data?.ok));
            if (!data?.ok) {
              setErrorMsg(`Access Denied: ${data?.reason || 'Not authorized as admin'}`);
            }
          }
        } catch (error: any) {
          console.error('🚨 Admin guard error:', error);
          if (!cancelled) {
            setErrorMsg(`Auth Error: ${error.message ?? "Admin access check failed"}`);
            setAllowed(false);
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