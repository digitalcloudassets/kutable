import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { corsHeaders, handlePreflight, withCors } from "../_shared/cors.ts";

const headers = corsHeaders(["POST", "OPTIONS"]);

serve(async (req) => {
  const pre = handlePreflight(req, headers);
  if (pre) return pre;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...cors.headers, 'Content-Type': 'application/json' }
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing JWT' }), {
        status: 401,
        headers: { ...cors.headers, 'Content-Type': 'application/json' }
      });
    }

    // Who is calling?
    const { data: who } = await admin.auth.getUser(jwt);
    const uid = who?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...cors.headers, 'Content-Type': 'application/json' }
      });
    }

    // Find this user's barber_profile id
    const { data: bp } = await admin
      .from('barber_profiles')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();

    if (!bp?.id) {
      return new Response(JSON.stringify({ clients: [] }), {
        headers: { ...cors.headers, 'Content-Type': 'application/json' }
      });
    }

    // Fetch distinct clients who have bookings with this barber
    const { data: rows, error } = await admin
      .from('bookings')
      .select('client_id')
      .eq('barber_id', bp.id);

    if (error) throw error;

    const ids = [...new Set((rows ?? []).map(r => r.client_id).filter(Boolean))];
    if (ids.length === 0) {
      return new Response(JSON.stringify({ clients: [] }), {
        headers: { ...cors.headers, 'Content-Type': 'application/json' }
      });
    }

    const { data: clients, error: cErr } = await admin
      .from('client_profiles')
      .select('id, first_name, last_name, phone, email, profile_image_url')
      .in('id', ids);

    if (cErr) throw cErr;

    return new Response(JSON.stringify({ clients }), {
      headers: { ...cors.headers, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors.headers, 'Content-Type': 'application/json' }
    });
  }
});