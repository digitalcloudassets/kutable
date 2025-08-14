// Server-side Supabase client for Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

export function createServiceClient(authHeader?: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}