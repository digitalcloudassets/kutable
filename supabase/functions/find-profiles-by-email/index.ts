import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['POST', 'OPTIONS'])

interface FindProfilesRequest {
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
    const { email }: FindProfilesRequest = await req.json()

    if (!email) {
      return json(400, {
        success: false,
        error: 'Email is required'
      })
    }

    // Find auth user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }
    
    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Find client profiles
    const { data: clientProfiles, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('email', email);

    if (clientError) {
      throw new Error(`Failed to fetch client profiles: ${clientError.message}`);
    }

    // Find barber profiles
    const { data: barberProfiles, error: barberError } = await supabase
      .from('barber_profiles')
      .select('*')
      .eq('email', email);

    if (barberError) {
      throw new Error(`Failed to fetch barber profiles: ${barberError.message}`);
    }

    return json(200, {
      success: true,
      authUser: authUser || null,
      clientProfiles: clientProfiles || [],
      barberProfiles: barberProfiles || []
    });

  } catch (error) {
    console.error('Error finding profiles by email:', error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find profiles'
    });
  }
})