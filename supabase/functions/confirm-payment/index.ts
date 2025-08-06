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

      // Send SMS confirmation if client has phone number
      if (booking.client_profiles?.phone) {
        try {
          // Format the phone number for SMS (remove any formatting)
          const cleanPhone = booking.client_profiles.phone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
          
          // Create a detailed confirmation message
          const appointmentDate = new Date(booking.appointment_date);
          const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          });
          
          const smsMessage = `🎉 Booking Confirmed!\n\nHi ${booking.client_profiles.first_name}! Your ${booking.services?.name} appointment at ${booking.barber_profiles?.business_name} is confirmed.\n\n📅 ${formattedDate}\n⏰ ${booking.appointment_time}\n💰 $${booking.total_amount}\n\nWe'll send you a reminder 24hrs before. Questions? Reply STOP to opt out.\n\n- Kutable Team`;
          
          const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: formattedPhone,
              message: smsMessage,
              type: 'booking_confirmation'
            })
          })
          
          const smsResult = await smsResponse.json();
          
          if (smsResult.success) {
            console.log('SMS confirmation sent successfully to:', formattedPhone);
          } else {
            console.warn('SMS sending failed:', smsResult.error);
          }
          
        } catch (smsError) {
          console.warn('SMS sending failed:', smsError)
          // Don't fail the entire process if SMS fails
        }
      } else {
        console.log('No phone number provided for SMS confirmation');
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