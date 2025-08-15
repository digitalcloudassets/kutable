import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['POST', 'OPTIONS'])

interface RepairRequest {
  email: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (status: number, data: any) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors.headers, 'Content-Type': 'application/json' }
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, {
        success: false,
        error: 'Missing required environment variables'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { email }: RepairRequest = await req.json()

    if (!email) {
      return json(400, {
        success: false,
        error: 'Email is required'
      })
    }

    console.log(`[DataRepair] Starting user_id linkage repair for email: ${email}`);

    // Step 1: Find the auth user by email
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!authUser) {
      return json(404, {
        success: false,
        message: `No auth user found with email: ${email}`
      });
    }

    console.log(`[DataRepair] Found auth user:`, { id: authUser.id, email: authUser.email });

    // Step 2: Check for client profiles with this email but missing user_id
    const { data: clientProfiles, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', email);

    if (clientError) {
      throw new Error(`Failed to fetch client profiles: ${clientError.message}`);
    }

    // Step 3: Check for barber profiles with this email but missing user_id  
    const { data: barberProfiles, error: barberError } = await supabase
      .from('barber_profiles')
      .select('*')
      .eq('email', email);

    if (barberError) {
      throw new Error(`Failed to fetch barber profiles: ${barberError.message}`);
    }

    const repairs = [];

    // Repair client profiles
    for (const profile of clientProfiles || []) {
      if (!profile.user_id || profile.user_id !== authUser.id) {
        console.log(`[DataRepair] Fixing client profile user_id:`, {
          profileId: profile.id,
          currentUserId: profile.user_id,
          correctUserId: authUser.id
        });

        const { error: updateError } = await supabase
          .from('client_profiles')
          .update({ 
            user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`[DataRepair] Failed to update client profile ${profile.id}:`, updateError);
        } else {
          repairs.push(`Updated client profile: ${profile.first_name} ${profile.last_name}`);
        }
      }
    }

    // Repair barber profiles
    for (const profile of barberProfiles || []) {
      if (!profile.user_id || profile.user_id !== authUser.id) {
        console.log(`[DataRepair] Fixing barber profile user_id:`, {
          profileId: profile.id,
          businessName: profile.business_name,
          currentUserId: profile.user_id,
          correctUserId: authUser.id
        });

        const { error: updateError } = await supabase
          .from('barber_profiles')
          .update({ 
            user_id: authUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`[DataRepair] Failed to update barber profile ${profile.id}:`, updateError);
        } else {
          repairs.push(`Updated barber profile: ${profile.business_name}`);
        }
      }
    }

    return json(200, {
      success: true,
      message: `Repair completed. ${repairs.length} profiles updated.`,
      details: {
        authUserId: authUser.id,
        repairsApplied: repairs,
        clientProfilesFound: clientProfiles?.length || 0,
        barberProfilesFound: barberProfiles?.length || 0
      }
    });

  } catch (error) {
    console.error('[DataRepair] Repair failed:', error);
    return json(500, {
      success: false,
      message: error instanceof Error ? error.message : 'Repair failed with unknown error'
    });
  }
})