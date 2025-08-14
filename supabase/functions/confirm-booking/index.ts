import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

interface ConfirmBookingRequest {
  bookingId: string;
  paymentIntentId: string;
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
    const { bookingId, paymentIntentId }: ConfirmBookingRequest = await req.json()

    if (!bookingId || !paymentIntentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: bookingId and paymentIntentId'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Update booking status to confirmed
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select(`
        *,
        barber_profiles(business_name, owner_name, phone, email),
        services(name, duration_minutes),
        client_profiles(first_name, last_name, phone, email)
      `)
      .single()

    if (updateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to confirm booking'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: booking
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Booking confirmation error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Booking confirmation failed'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})