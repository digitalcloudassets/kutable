import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface ConfirmPaymentRequest {
  paymentIntentId: string;
  bookingId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment processing configuration error'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { paymentIntentId, bookingId }: ConfirmPaymentRequest = await req.json()

    // Retrieve payment intent to check status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status === 'succeeded') {
      // Update booking status to confirmed
      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          stripe_charge_id: paymentIntent.latest_charge as string,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select(`
          *,
          barber_profiles(business_name, owner_name, phone),
          services(name, duration_minutes),
          client_profiles(first_name, last_name, phone, email)
        `)
        .single()

      if (updateError) {
        throw new Error('Failed to confirm booking')
      }

      // Send comprehensive notifications using the backend processor
      try {
        const { error: notificationError } = await supabase.functions.invoke('process-booking-notifications', {
          body: {
            bookingId: booking.id,
            event: 'booking_confirmed'
          }
        });

        if (notificationError) {
          console.warn('Failed to send booking notifications:', notificationError);
        }
      } catch (notificationError) {
        console.warn('Notification error (booking still succeeded):', notificationError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          booking: booking,
          paymentStatus: 'succeeded'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      // Payment not successful, update booking status
      await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment was not completed successfully',
          paymentStatus: paymentIntent.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

  } catch (error) {
    console.error('Payment confirmation error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Payment confirmation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})