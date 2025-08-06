import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface CreatePaymentIntentRequest {
  barberId: string;
  clientId: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  clientDetails: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes?: string;
  };
  totalAmount: number;
  depositAmount?: number;
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
          error: 'Missing required environment variables for payment processing'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const requestData: CreatePaymentIntentRequest = await req.json()

    // Validate required fields
    const { 
      barberId, 
      clientId,
      serviceId, 
      appointmentDate, 
      appointmentTime, 
      clientDetails, 
      totalAmount,
      depositAmount = 0
    } = requestData;

    if (!barberId || !clientId || !serviceId || !appointmentDate || !appointmentTime || !clientDetails || !totalAmount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required booking information (barber, client, service, date/time, details, amount)'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Get barber's Stripe account for Connect transfers
    const { data: barberData, error: barberError } = await supabase
      .from('barber_profiles')
      .select('stripe_account_id, business_name, owner_name, stripe_onboarding_completed')
      .eq('id', barberId)
      .single()

    if (barberError || !barberData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Barber not found or not properly configured'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!barberData.stripe_account_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This barber has not set up payment processing yet. Please contact them directly to complete your booking.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Check if the Stripe account has the required capabilities
    try {
      const account = await stripe.accounts.retrieve(barberData.stripe_account_id);
      
      // Check if transfers capability is enabled
      if (!account.capabilities?.transfers || account.capabilities.transfers !== 'active') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This barber is still completing their payment setup verification. Please try booking again in a few hours, or contact them directly.',
            errorCode: 'STRIPE_VERIFICATION_PENDING'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      // Check if card payments capability is enabled
      if (!account.capabilities?.card_payments || account.capabilities.card_payments !== 'active') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This barber cannot accept card payments yet. Please contact them directly to complete your booking.',
            errorCode: 'STRIPE_PAYMENTS_DISABLED'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

    } catch (stripeError) {
      console.error('Error checking Stripe account capabilities:', stripeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unable to verify barber payment setup. Please try again later or contact the barber directly.',
          errorCode: 'STRIPE_ACCOUNT_ERROR'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Get service details
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('name, price, duration_minutes')
      .eq('id', serviceId)
      .single()

    if (serviceError || !serviceData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Service not found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Calculate platform fee (1%)
    const platformFeeAmount = Math.round(totalAmount * 0.01 * 100); // in cents
    const amountInCents = Math.round(totalAmount * 100); // Convert to cents for Stripe

    // Create payment intent with Connect transfer
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: barberData.stripe_account_id,
      },
      metadata: {
        barber_id: barberId,
        service_id: serviceId,
        client_name: `${clientDetails.firstName} ${clientDetails.lastName}`,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        business_name: barberData.business_name
      },
      description: `${serviceData.name} at ${barberData.business_name}`,
      receipt_email: clientDetails.email
    })

    // Create pending booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        barber_id: barberId,
        client_id: clientId,
        service_id: serviceId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        platform_fee: platformFeeAmount / 100, // Convert back to dollars
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        notes: clientDetails.notes || null
      })
      .select()
      .single()

    if (bookingError) {
      // Cancel the payment intent if booking creation fails
      await stripe.paymentIntents.cancel(paymentIntent.id)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create booking record'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        bookingId: booking.id,
        paymentIntentId: paymentIntent.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      let userMessage = 'Payment processing error';
      
      if (error.code === 'account_invalid') {
        userMessage = 'This barber cannot accept payments yet. Please contact them directly to complete your booking.';
      } else if (error.code === 'capability_disabled') {
        userMessage = 'This barber is still completing their payment setup. Please try again later or contact them directly.';
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: userMessage,
          errorCode: error.code
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})