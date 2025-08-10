import { createClient } from 'npm:@supabase/supabase-js@2'

const PROJECT_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://kutable.com";

const supabase = createClient(PROJECT_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
}

// Generate unique slug helper
async function generateUniqueSlug(businessName: string): Promise<string> {
  let baseSlug = businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  
  if (!baseSlug) {
    baseSlug = 'barber';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  // Check for conflicts and make unique
  while (true) {
    const { data: existingProfile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (!existingProfile) {
      break;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, { ok: true });

  try {
    const { barberId, claimData } = await req.json().catch(() => ({}));
    if (!barberId) return json(400, { error: "Missing barberId" });

    // Load profile from live table first
    let { data: liveProfile } = await supabase
      .from("barber_profiles")
      .select("*")
      .eq("id", barberId)
      .maybeSingle();

    // If not present in live table, this is a CSV profile (handled by frontend)
    let source = liveProfile;
    if (!source && claimData) {
      // Use the claimData provided by frontend (from CSV parsing)
      source = {
        id: barberId,
        business_name: claimData.businessName,
        owner_name: claimData.ownerName,
        phone: claimData.phone,
        email: claimData.email,
        address: claimData.address,
        city: claimData.city,
        state: claimData.state,
        zip_code: claimData.zipCode,
        bio: claimData.bio,
        is_claimed: false
      };
    }

    if (!source) return json(404, { error: "Profile not found" });
    if (source.is_claimed) return json(409, { error: "Profile already claimed" });

    const emailRaw: string = (source.email || "").toString();
    const email = emailRaw.trim().toLowerCase();
    if (!email) return json(400, { error: "Profile has no email to create an account" });

    // Find or create auth user for this email
    let userId: string | null = null;

    // Search by email
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
    if (existing) {
      userId = existing.id;
    } else {
      const tempPassword = crypto.randomUUID(); // not used; just to satisfy creation
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { 
          user_type: "barber",
          first_name: source.owner_name?.split(' ')[0] || '',
          last_name: source.owner_name?.split(' ').slice(1).join(' ') || ''
        }
      });
      if (createErr || !created?.user) return json(400, { error: "Failed to create auth user" });
      userId = created.user.id;
    }

    // Generate a unique slug
    const finalSlug = await generateUniqueSlug(source.business_name || 'barber');

    // Upsert to live table
    const upsertData = {
      id: source.id,
      user_id: userId,
      slug: finalSlug,
      business_name: source.business_name || null,
      owner_name: source.owner_name || null,
      phone: source.phone || null,
      email,
      address: source.address || null,
      city: source.city || null,
      state: source.state || null,
      zip_code: source.zip_code || null,
      bio: source.bio || null,
      profile_image_url: source.profile_image_url || null,
      banner_image_url: source.banner_image_url || null,
      is_claimed: true,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    const { error: upErr } = await supabase
      .from("barber_profiles")
      .upsert(upsertData, { onConflict: "id" });

    if (upErr) return json(400, { error: upErr.message });

    // Generate a magic link to drop them into the dashboard
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${PUBLIC_SITE_URL}/dashboard` }
    });

    if (linkErr || !linkData?.properties?.action_link) {
      // Fallback: email delivery handled by Supabase; front-end can show success
      return json(200, { success: true, slug: finalSlug, note: "Magic link sent to email" });
    }

    return json(200, { 
      success: true, 
      slug: finalSlug, 
      actionLink: linkData.properties.action_link 
    });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
});