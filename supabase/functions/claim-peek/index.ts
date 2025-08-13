const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s: number, d: any) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json(500, { success: false, error: 'Server not configured' });
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: any;
    try { 
      body = await req.json(); 
    } catch { 
      return json(400, { success: false, error: 'Invalid JSON body' }); 
    }
    
    const { token } = body || {};
    
    if (!token) {
      return json(400, { success: false, error: 'Missing token' });
    }

    // 1) Validate token and get barber info
    const { data: tokenData } = await db
      .from('claim_tokens')
      .select(`
        id, 
        barber_id, 
        expires_at, 
        consumed_at,
        barber_profiles!inner (
          id,
          slug,
          business_name,
          owner_name,
          phone,
          email,
          address,
          city,
          state,
          zip_code,
          bio,
          is_claimed
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (!tokenData) {
      return json(404, { success: false, error: 'Invalid or expired claim token' });
    }
    
    if (tokenData.consumed_at) {
      return json(400, { success: false, error: 'Claim token already used' });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return json(400, { success: false, error: 'Claim token expired' });
    }

    if (tokenData.barber_profiles?.is_claimed) {
      return json(409, { success: false, error: 'Profile already claimed' });
    }

    // 2) Return profile data for prefill
    return json(200, { 
      success: true, 
      profile: {
        id: tokenData.barber_profiles?.id,
        slug: tokenData.barber_profiles?.slug,
        business_name: tokenData.barber_profiles?.business_name,
        owner_name: tokenData.barber_profiles?.owner_name,
        phone: tokenData.barber_profiles?.phone,
        email: tokenData.barber_profiles?.email,
        address: tokenData.barber_profiles?.address,
        city: tokenData.barber_profiles?.city,
        state: tokenData.barber_profiles?.state,
        zip_code: tokenData.barber_profiles?.zip_code,
        bio: tokenData.barber_profiles?.bio
      }
    });
    
  } catch (e: any) {
    console.error('claim-peek error', e);
    return json(500, { success: false, error: e?.message || 'Unexpected error' });
  }
});