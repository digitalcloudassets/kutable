import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ok = (data: any, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
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
        const s = event.data.object as any;
        const bookingId = s.metadata?.bookingId ?? null;
        const barberId = s.metadata?.barberId ?? null;
        const clientId = s.metadata?.clientId ?? null;
        const serviceId = s.metadata?.serviceId ?? null;
        const appointmentDate = s.metadata?.appointmentDate ?? null;
        const appointmentTime = s.metadata?.appointmentTime ?? null;
        const notes = s.metadata?.notes ?? '';

        console.log('Processing checkout.session.completed:', {
          sessionId: s.id,
          paymentIntent: s.payment_intent,
          bookingId,
          barberId,
          clientId
        });

        // 1) Create/attach booking (idempotent)
        const newBookingId = bookingId || crypto.randomUUID();
        const { error: bookingError } = await supabase.from('bookings').upsert({
          id: newBookingId,
          barber_id: barberId,
          client_id: clientId,
          service_id: serviceId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          total_amount: s.amount_total / 100, // Convert cents to dollars
          deposit_amount: 0,
          platform_fee: Math.floor(s.amount_total * 0.01) / 100, // 1% platform fee
          notes: notes || null,
          status: 'confirmed',
          stripe_payment_intent_id: s.payment_intent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

        if (bookingError) {
          console.error('Error upserting booking:', bookingError);
        }

        // 2) Record payment (idempotent)
        const { error: paymentError } = await supabase.from('platform_transactions').upsert({
          booking_id: newBookingId,
          barber_id: barberId,
          transaction_type: 'booking',
          gross_amount: s.amount_total / 100,
          platform_fee: Math.floor(s.amount_total * 0.01) / 100,
          stripe_fee: 0, // Will be calculated from actual charge
          net_amount: (s.amount_total - Math.floor(s.amount_total * 0.01)) / 100,
          stripe_transaction_id: s.payment_intent,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'stripe_transaction_id'
        });

        if (paymentError) {
          console.error('Error recording payment transaction:', paymentError);
        }

        // 3) Send booking confirmation notifications
        try {
          await supabase.functions.invoke('process-booking-notifications', {
            body: {
              bookingId: newBookingId,
              event: 'booking_confirmed'
            }
          });
        } catch (notificationError) {
          console.error('Failed to send booking notifications:', notificationError);
        }

        return ok({ received: true, bookingId: newBookingId });
      }

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
        const pi = event.data.object as any;
        const md = pi.metadata || {};
        const bookingId = md.bookingId ?? null;
        const barberId = md.barberId ?? null;
        const clientId = md.clientId ?? md.userId ?? null;

        console.log('Processing payment_intent.succeeded:', {
          paymentIntentId: pi.id,
          bookingId,
          barberId,
          clientId,
          amount: pi.amount
        });

        // Record payment transaction (idempotent)
        const { error: paymentError } = await supabase.from('platform_transactions').upsert({
          booking_id: bookingId,
          barber_id: barberId,
          transaction_type: 'booking',
          gross_amount: pi.amount / 100,
          platform_fee: Math.floor(pi.amount * 0.01) / 100,
          stripe_fee: 0, // Will be updated from charge object if available
          net_amount: (pi.amount - Math.floor(pi.amount * 0.01)) / 100,
          stripe_transaction_id: pi.id,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'stripe_transaction_id'
        });

        if (paymentError) {
          console.error('Error recording payment:', paymentError);
        }

        // Update booking if it exists
        if (bookingId) {
          const { error: bookingUpdateError } = await supabase
            .from('bookings')
            .update({ 
              status: 'confirmed',
              stripe_payment_intent_id: pi.id,
              stripe_charge_id: pi.charges?.data?.[0]?.id || null,
              updated_at: new Date().toISOString() 
            })
            .eq('id', bookingId);

          if (bookingUpdateError) {
            console.error('Error updating booking:', bookingUpdateError);
          }
        }

        return ok({ received: true, paymentIntentId: pi.id });
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update booking status to confirmed
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: paymentIntent.id,
            stripe_charge_id: paymentIntent.charges?.data?.[0]?.id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentIntent.metadata?.bookingId || '')

        if (error) {
          console.error('Error updating booking:', error)
          break
        }

        // Send booking confirmation notifications
        const { data: booking } = await supabase
          .from('bookings')
          .select(`
            *,
            barber_profiles(business_name, owner_name, phone, email),
            client_profiles(first_name, last_name, phone, email),
            services(name)
          `)
          .eq('id', paymentIntent.metadata?.bookingId || '')
          .single()

        if (booking) {
          // Send comprehensive notifications
          try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-booking-notifications`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: booking.id,
                event: 'booking_confirmed'
              })
            });
          } catch (notificationError) {
            console.error('Failed to send booking confirmation notifications:', notificationError);
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as any;
        const md = pi.metadata || {};
        const bookingId = md.bookingId ?? null;

        console.log('Processing payment_intent.payment_failed:', {
          paymentIntentId: pi.id,
          bookingId,
          lastError: pi.last_payment_error?.message
        });

        // Record failed payment
        const { error: paymentError } = await supabase.from('platform_transactions').upsert({
          booking_id: bookingId,
          barber_id: md.barberId ?? null,
          transaction_type: 'booking',
          gross_amount: pi.amount / 100,
          platform_fee: 0,
          stripe_fee: 0,
          net_amount: 0,
          stripe_transaction_id: pi.id,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'stripe_transaction_id'
        });

        if (paymentError) {
          console.error('Error recording failed payment:', paymentError);
        }

        // Mark booking as failed
        if (bookingId) {
          const { error: bookingUpdateError } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (bookingUpdateError) {
            console.error('Error updating failed booking:', bookingUpdateError);
          }
        }

        return ok({ received: true, paymentIntentId: pi.id });
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Mark booking as failed
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentIntent.metadata?.bookingId || '')

        if (error) {
          console.error('Error updating failed booking:', error)
        } else {
          console.log('Booking marked as cancelled due to payment failure:', paymentIntent.metadata?.bookingId)
        }
        break
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment requires additional action (3DS):', paymentIntent.id)
        // No action needed - the client will handle 3DS authentication
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        console.log('Dispute created for charge:', dispute.charge)
        
        // Find booking by charge ID and mark for review
        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'refund_requested',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_charge_id', dispute.charge)

        if (error) {
          console.error('Error updating disputed booking:', error)
        }
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        console.log('Transfer created to barber account:', transfer.destination, 'Amount:', transfer.amount)
        
        // Record platform transaction
        if (transfer.source_transaction && transfer.metadata?.bookingId) {
          try {
            await supabase
              .from('platform_transactions')
              .insert({
                booking_id: transfer.metadata.bookingId,
                barber_id: transfer.metadata.barberId,
                transaction_type: 'booking',
                gross_amount: (transfer.amount + (transfer.metadata.applicationFee || 0)) / 100,
                platform_fee: (transfer.metadata.applicationFee || 0) / 100,
                stripe_fee: 0, // Calculate from charge if needed
                net_amount: transfer.amount / 100,
                stripe_transaction_id: transfer.id
              });
          } catch (dbError) {
            console.error('Error recording platform transaction:', dbError);
          }
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        
        // Update barber's Stripe account status
        const { error: stripeAccountError } = await supabase
          .from('stripe_accounts')
          .upsert({
            stripe_account_id: account.id,
            account_status: account.details_submitted ? 'active' : 'pending',
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            updated_at: new Date().toISOString()
          })

        if (stripeAccountError) {
          console.error('Error updating Stripe account:', stripeAccountError)
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