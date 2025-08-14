import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

interface DisconnectAccountRequest {
  barberId: string;
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
          error: 'Missing required environment variables'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { barberId }: DisconnectAccountRequest = await req.json()

    if (!barberId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Barber ID is required'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Get the current Stripe account ID before removing it
    const { data: barberData, error: fetchError } = await supabase
      .from('barber_profiles')
      .select('stripe_account_id, business_name')
      .eq('id', barberId)
      .single()

    if (fetchError || !barberData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Barber profile not found'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    const stripeAccountId = barberData.stripe_account_id;

    // Remove Stripe account association from barber profile
    const { error: profileUpdateError } = await supabase
      .from('barber_profiles')
      .update({
        stripe_account_id: null,
        stripe_onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', barberId)

    if (profileUpdateError) {
      throw new Error('Failed to disconnect Stripe account from profile')
    }

    // Remove from stripe_accounts table if exists
    if (stripeAccountId) {
      const { error: stripeAccountError } = await supabase
        .from('stripe_accounts')
        .delete()
        .eq('stripe_account_id', stripeAccountId)

      if (stripeAccountError) {
        console.warn('Failed to remove stripe_accounts record:', stripeAccountError)
        // Don't fail the entire operation for this
      }
    }

    console.log(`Successfully disconnected Stripe account for barber: ${barberData.business_name}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stripe account disconnected successfully',
        disconnectedAccountId: stripeAccountId
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Stripe disconnect error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect Stripe account'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})