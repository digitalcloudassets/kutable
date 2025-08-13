import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface RefundRequest {
  payment_intent_id: string;
  booking_id: string;
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
          error: 'Missing required environment variables'
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
    const { payment_intent_id, booking_id }: RefundRequest = await req.json()

    if (!payment_intent_id || !booking_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing payment_intent_id or booking_id'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Retrieve payment intent to get charge information
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (!paymentIntent.charges?.data[0]?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No charge found for this payment intent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    const charge = paymentIntent.charges.data[0]

    // Check if charge is already refunded
    if (charge.refunded) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This payment has already been refunded'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Create the refund
    const refund = await stripe.refunds.create({
      charge: charge.id,
      reason: 'requested_by_customer'
    })

    console.log('Refund processed successfully:', {
      refundId: refund.id,
      chargeId: charge.id,
      amount: refund.amount,
      status: refund.status,
      bookingId: booking_id
    })

    // Update payment record in database
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_charge_id', charge.id)

    if (paymentUpdateError) {
      console.error('Error updating payment record:', paymentUpdateError)
    }

    // Send refund notification to customer
    try {
      const { error: notificationError } = await supabase.functions.invoke('process-booking-notifications', {
        body: {
          bookingId: booking_id,
          event: 'booking_cancelled'
        }
      });

      if (notificationError) {
        console.warn('Failed to send refund notification:', notificationError);
      }
    } catch (notificationError) {
      console.warn('Notification error (refund still succeeded):', notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          status: refund.status,
          created: refund.created
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Refund processing error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})