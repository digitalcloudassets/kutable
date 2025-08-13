const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (s:number,d:any)=>new Response(JSON.stringify(d),{status:s,headers:{...CORS,'Content-Type':'application/json'}});

function slugify(s:string){
  return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function randomToken(len=48){
  const a = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(a, b => b.toString(16).padStart(2,'0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SITE_URL     = Deno.env.get('SITE_URL') ?? 'https://kutable.com';
    
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
    
    const {
      slug: rawSlug, 
      business_name, 
      owner_name, 
      phone, 
      email, 
      address, 
      city, 
      state, 
      zip_code,
      import_source = 'csv', 
      import_external_id
    } = body || {};

    if (!business_name && !rawSlug) {
      return json(400, { success: false, error: 'Missing business_name or slug' });
    }
    
    const baseSlug = slugify(rawSlug || business_name);
    if (!baseSlug) {
      return json(400, { success: false, error: 'Could not compute slug' });
    }

    // 1) Find existing by slug (case-insensitive)
    const { data: existing } = await db
      .from('barber_profiles')
      .select('id, slug, is_claimed')
      .ilike('slug', baseSlug)
      .maybeSingle();

    let barberId = existing?.id;
    let finalSlug = existing?.slug || baseSlug;

    // Check if already claimed
    if (existing?.is_claimed) {
      return json(409, { success: false, error: 'Profile already claimed' });
    }

    // 2) Create profile if missing
    if (!barberId) {
      const now = new Date().toISOString();
      const insert = {
        slug: finalSlug,
        business_name: business_name ?? 'Barbershop',
        owner_name: owner_name ?? business_name ?? 'Owner',
        phone: phone ?? null, 
        email: email ?? null,
        address: address ?? null, 
        city: city ?? null, 
        state: state ?? null, 
        zip_code: zip_code ?? null,
        bio: null, 
        profile_image_url: null, 
        banner_image_url: null,
        is_claimed: false, 
        is_active: true,
        stripe_account_id: null, 
        stripe_onboarding_completed: false,
        average_rating: 0, 
        total_reviews: 0,
        created_at: now, 
        updated_at: now,
        import_source, 
        import_external_id: import_external_id ?? null,
        status: 'inactive'
      };
      
      const { data: created, error: createErr } = await db
        .from('barber_profiles')
        .insert(insert)
        .select('id, slug')
        .single();
        
      if (createErr) {
        return json(400, { success: false, error: createErr.message });
      }
      
      barberId = created.id; 
      finalSlug = created.slug;
    }

    // 3) Issue one-time token (24h)
    // 3) Reuse an active token if it exists (unconsumed + not expired)
    const { data: existingTok } = await db
      .from('claim_tokens')
      .select('token, expires_at')
      .eq('barber_id', barberId)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .maybeSingle();

    let token: string;
    let expires_at: string;

    if (existingTok) {
      token = existingTok.token;
      expires_at = existingTok.expires_at;
    } else {
      // Create fresh token (24h)
      token = randomToken(32);
      expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: tokErr } = await db
        .from('claim_tokens')
        .insert({ 
          barber_id: barberId, 
          token, 
          expires_at 
        });
        
      if (tokErr) {
        return json(400, { success: false, error: tokErr.message });
      }
    }

    const claimUrl = `${SITE_URL}/claim/${token}`;
    
    console.log('Claim started successfully:', {
      barberId,
      finalSlug,
      tokenGenerated: true,
      claimUrl
    });
    
    return json(200, { 
      success: true, 
      barberId, 
      slug: finalSlug, 
      claimUrl,
      expires_at
    });
    
  } catch (e: any) {
    console.error('claim-start error', e);
    return json(500, { success: false, error: e?.message || 'Unexpected error' });
  }
});