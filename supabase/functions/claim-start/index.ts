// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, data: any) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function slugify(s: string) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function randomToken(len = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://kutable.com";
    
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(500, { success: false, error: "Server not configured" });
    }

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    let body: any;
    try { 
      body = await req.json(); 
    } catch { 
      return json(400, { success: false, error: "Invalid JSON body" }); 
    }
    
    const {
      slug, 
      business_name, 
      owner_name, 
      phone, 
      email, 
      address, 
      city, 
      state, 
      zip_code,
      barberId,
      import_source = 'csv', 
      import_external_id
    } = body || {};

    if (!business_name) {
      return json(400, { success: false, error: "business_name required" });
    }
    
    const baseSlug = slugify(slug || business_name);
    if (!baseSlug) {
      return json(400, { success: false, error: "Could not compute slug from business name" });
    }

    // 1) Find or create the target barber profile
    let targetId = barberId as string | undefined;

    if (!targetId && slug) {
      const { data } = await db
        .from("barber_profiles")
        .select("id, is_claimed")
        .eq("slug", slug)
        .maybeSingle();
      
      if (data?.is_claimed) {
        return json(409, { success: false, error: "Profile already claimed" });
      }
      targetId = data?.id;
    }

    if (!targetId) {
      // Create a minimal placeholder barber profile
      const now = new Date().toISOString();
      const { data, error } = await db.from("barber_profiles").insert({
        slug: baseSlug,
        business_name,
        owner_name: owner_name || business_name,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        zip_code: zip_code ?? null,
        bio: `Professional services at ${business_name}. Contact us for appointments and more information.`,
        profile_image_url: '/clean barbershop.jpeg',
        is_active: true,
        is_claimed: false,
        import_source,
        import_external_id: import_external_id ?? null,
        status: 'inactive',
        average_rating: 4.5,
        total_reviews: 12,
        created_at: now,
        updated_at: now
      }).select("id").single();
      
      if (error) return json(400, { success: false, error: error.message });
      targetId = data.id;
    }

    // 2) Reuse existing active claim token (unconsumed + not expired)
    const { data: existingTok } = await db
      .from("claim_tokens")
      .select("token, expires_at")
      .eq("barber_id", targetId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .maybeSingle();

    let token: string;
    if (existingTok) {
      token = existingTok.token;
    } else {
      // Create fresh token (24h)
      token = randomToken(32);
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: tokErr } = await db
        .from("claim_tokens")
        .insert({ 
          barber_id: targetId, 
          token, 
          expires_at 
        });
      if (tokErr) return json(400, { success: false, error: tokErr.message });
    }

    // 3) If no email, return early so frontend can collect it
    if (!email) {
      return json(200, {
        success: true,
        needsEmail: true,
        claimUrl: `${SITE_URL}/claim/${token}`,
        message: "Email required to create account for claiming",
      });
    }

    // 4) Ensure user exists (create if missing) using admin service role
    const admin = db.auth.admin;
    let userId: string | null = null;
    
    // Check if user already exists
    const { data: usersList } = await admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user silently with random password (they'll use magic link)
      const randomPassword = crypto.getRandomValues(new Uint8Array(24))
        .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
      
      const { data: userData, error: createError } = await admin.createUser({
        email: email.toLowerCase(),
        password: randomPassword,
        email_confirm: true, // Skip email verification
        user_metadata: {
          user_type: "barber",
          source: "claim_flow",
          business_name,
          first_name: owner_name?.split(' ')[0] || '',
          last_name: owner_name?.split(' ').slice(1).join(' ') || ''
        },
      });
      
      if (createError) return json(400, { success: false, error: createError.message });
      userId = userData.user.id;
    }

    // 5) Generate magic link that will create session and redirect to claim page
    const { data: linkData, error: linkErr } = await admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: { 
        redirect_to: `${SITE_URL}/claim/${token}` 
      },
    });
    
    if (linkErr || !linkData?.properties?.action_link) {
      // Fallback: return claim URL without magic link
      return json(200, {
        success: true,
        claimUrl: `${SITE_URL}/claim/${token}`,
        token,
        message: "Magic link generation failed, manual login required"
      });
    }

    console.log('Claim flow started with magic link:', {
      barberId: targetId,
      token,
      email,
      business_name,
      userId
    });

    return json(200, {
      success: true,
      action_link: linkData.properties.action_link, // Frontend opens this immediately
      claimUrl: `${SITE_URL}/claim/${token}`,
      token,
    });
    
  } catch (e: any) {
    console.error("claim-start error", e);
    return json(500, { success: false, error: e?.message || "Unexpected error" });
  }
});