// POST /functions/v1/ensure-profile
// Idempotent: creates profile if missing; returns profile if exists.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['POST', 'OPTIONS'])

interface EnsureProfileRequest {
  userId: string;
  email: string;
  userType?: 'client' | 'barber';
  defaults?: Record<string, any>;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database configuration missing'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { userId, email, userType, defaults }: EnsureProfileRequest = await req.json()

    if (!userId || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: userId and email'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Normalize email
    const normEmail = email.trim().toLowerCase()

    // Check for existing client profile first
    const { data: existingClient, error: clientErr } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (clientErr && clientErr.code !== 'PGRST116') {
      throw clientErr
    }

    if (existingClient) {
      return new Response(
        JSON.stringify({
          success: true,
          profile: existingClient,
          created: false,
          profileType: 'client'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Check for existing barber profile
    const { data: existingBarber, error: barberErr } = await supabase
      .from('barber_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (barberErr && barberErr.code !== 'PGRST116') {
      throw barberErr
    }

    if (existingBarber) {
      return new Response(
        JSON.stringify({
          success: true,
          profile: existingBarber,
          created: false,
          profileType: 'barber'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // No existing profile found - create based on userType
    if (userType === 'barber') {
      // Create barber profile
      const barberPayload = {
        user_id: userId,
        business_name: defaults?.business_name || `${defaults?.first_name || 'New'} Barber Shop`,
        owner_name: `${defaults?.first_name || ''} ${defaults?.last_name || ''}`.trim() || 'Barber',
        email: normEmail,
        phone: defaults?.phone || null,
        city: defaults?.city || null,
        state: defaults?.state || null,
        is_claimed: true,
        is_active: false, // Will be activated after full setup
        slug: `barber-${userId.slice(0, 8)}`,
        profile_image_url: null,
        ...defaults
      }

      const { data: newBarber, error: createBarberErr } = await supabase
        .from('barber_profiles')
        .upsert(barberPayload, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (createBarberErr) throw createBarberErr

      return new Response(
        JSON.stringify({
          success: true,
          profile: newBarber,
          created: true,
          profileType: 'barber'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 201,
        },
      )
    } else {
      // Create client profile (default)
      const clientPayload = {
        user_id: userId,
        first_name: defaults?.first_name || '',
        last_name: defaults?.last_name || '',
        email: normEmail,
        phone: defaults?.phone || null,
        preferred_contact: 'sms',
        profile_image_url: null, // No default avatar
        communication_consent: defaults?.communication_consent ?? false,
        sms_consent: defaults?.sms_consent ?? false,
        email_consent: defaults?.email_consent ?? false,
        ...defaults
      }

      const { data: newClient, error: createClientErr } = await supabase
        .from('client_profiles')
        .upsert(clientPayload, { onConflict: 'user_id' })
        .select('*')
        .single()

      if (createClientErr) throw createClientErr

      return new Response(
        JSON.stringify({
          success: true,
          profile: newClient,
          created: true,
          profileType: 'client'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 201,
        },
      )
    }

  } catch (error) {
    console.error('Ensure profile error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Profile creation failed'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})