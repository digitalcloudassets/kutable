const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s:number,d:any)=>new Response(JSON.stringify(d),{status:s,headers:{...CORS,'Content-Type':'application/json'}});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
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
    
    const { token, user_id, email } = body || {};
    
    if (!token) {
      return json(400, { success: false, error: 'Missing token' });
    }

    // 1) Validate token
    const { data: tokenData } = await db
      .from('claim_tokens')
      .select('id, barber_id, expires_at, consumed_at')
      .eq('token', token)
      .maybeSingle();

    if (!tokenData) {
      return json(400, { success: false, error: 'Invalid token' });
    }
    
    if (tokenData.consumed_at) {
      return json(400, { success: false, error: 'Token already used' });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return json(400, { success: false, error: 'Token expired' });
    }

    let finalUserId = user_id;
    
    // If no user_id but we have email, try to find the user
    if (!finalUserId && email) {
      const { data: usersList } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const foundUser = usersList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (foundUser) {
        finalUserId = foundUser.id;
      }
    }

    if (!finalUserId) {
      return json(400, { success: false, error: 'Could not identify user for claim. Please ensure you followed the magic link.' });
    }

    // 2) Check if profile is already claimed by someone else
    const { data: existingProfile } = await db
      .from('barber_profiles')
      .select('id, user_id, is_claimed, business_name')
      .eq('id', tokenData.barber_id)
      .single();

    if (!existingProfile) {
      return json(404, { success: false, error: 'Profile not found' });
    }

    if (existingProfile.is_claimed && existingProfile.user_id !== finalUserId) {
      return json(409, { success: false, error: 'Profile already claimed by another user' });
    }

    // 3) Bind user and mark claimed
    const now = new Date().toISOString();
    const { error: updateErr } = await db
      .from('barber_profiles')
      .update({ 
        user_id: finalUserId, 
        is_claimed: true, 
        updated_at: now 
      })
      .eq('id', tokenData.barber_id);
      
    if (updateErr) {
      return json(400, { success: false, error: updateErr.message });
    }

    // 4) Consume token
    const { error: consumeErr } = await db
      .from('claim_tokens')
      .update({ consumed_at: now })
      .eq('id', tokenData.id);
      
    if (consumeErr) {
      console.warn('Failed to consume token (claim still succeeded):', consumeErr);
    }

    // 5) Return profile basics for redirect
    const { data: profile } = await db
      .from('barber_profiles')
      .select('id, slug, business_name')
      .eq('id', tokenData.barber_id)
      .single();

    console.log('Claim completed successfully:', {
      barberId: tokenData.barber_id,
      userId: finalUserId,
      businessName: profile?.business_name,
      slug: profile?.slug
    });

    return json(200, { 
      success: true, 
      profile: profile || { id: tokenData.barber_id, slug: null, business_name: 'Unknown' }
    });
    
  } catch (e: any) {
    console.error('claim-complete error', e);
    return json(500, { success: false, error: e?.message || 'Unexpected error' });
  }
});