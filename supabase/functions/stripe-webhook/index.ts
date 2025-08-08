import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      throw new Error('Missing Stripe signature or webhook secret')
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Update booking status to confirmed
        const bookingId = session.metadata?.bookingId
        if (bookingId) {
          const { error } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              stripe_payment_intent_id: session.payment_intent as string,
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId)

          if (error) {
            console.error('Error updating booking from checkout session:', error)
          } else {
            // Send booking confirmation notifications
            try {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-booking-notifications`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  bookingId: bookingId,
                  event: 'booking_confirmed'
                })
              });
            } catch (notificationError) {
              console.error('Failed to send booking notifications:', notificationError);
            }
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update booking status
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_payment_intent_id', paymentIntent.id)

        if (error) {
          console.error('Error updating booking:', error)
        }

        // Send SMS confirmation
        const { data: booking } = await supabase
          .from('bookings')
          .select(`
            *,
            barber_profiles(business_name, owner_name),
            client_profiles(first_name, phone),
            services(name)
          `)
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (booking && booking.client_profiles?.phone) {
          const smsMessage = `Booking confirmed! ${booking.services?.name} with ${booking.barber_profiles?.business_name} on ${booking.appointment_date} at ${booking.appointment_time}. See you soon!`
          
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: booking.client_profiles.phone,
              message: smsMessage,
              type: 'booking_confirmation'
            })
          })
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        
        // Update barber's Stripe account status
        const { error } = await supabase
          .from('stripe_accounts')
          .upsert({
            stripe_account_id: account.id,
            account_status: account.details_submitted ? 'active' : 'pending',
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            updated_at: new Date().toISOString()
          })

        if (error) {
          console.error('Error updating Stripe account:', error)
        }

        // Also update the barber profile's stripe_onboarding_completed status
        const isOnboardingCompleted = account.details_submitted && account.charges_enabled && account.payouts_enabled;
        
        const { error: barberUpdateError } = await supabase
          .from('barber_profiles')
          .update({
            stripe_onboarding_completed: isOnboardingCompleted,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id)

        if (barberUpdateError) {
          console.error('Error updating barber profile Stripe status:', barberUpdateError)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})