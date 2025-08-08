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

// Rate limiting map for payment attempts
const paymentAttempts = new Map<string, { count: number; lastAttempt: number }>();

const isRateLimited = (identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = paymentAttempts.get(identifier);
  
  if (!attempts) {
    paymentAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (now - attempts.lastAttempt > windowMs) {
    paymentAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (attempts.count >= maxAttempts) {
    return true;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  paymentAttempts.set(identifier, attempts);
  
  return false;
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&"']/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[match] || match;
    });
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting by IP
    if (isRateLimited(`payment_${clientIP}`, 5, 15 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many payment attempts. Please wait 15 minutes before trying again.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }

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

    // Enhanced validation for required fields
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

    // Comprehensive input validation
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

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(barberId) && !barberId.startsWith('csv-')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid barber identifier'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!uuidRegex.test(clientId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid client identifier'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!uuidRegex.test(serviceId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid service identifier'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    // Validate input formats
    if (typeof totalAmount !== 'number' || totalAmount <= 0 || totalAmount > 10000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid payment amount'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (typeof depositAmount !== 'number' || depositAmount < 0 || depositAmount > totalAmount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid deposit amount'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid date format'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate date is not in the past
    const appointmentDateObj = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDateObj < today) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot book appointments in the past'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate date is not too far in the future (90 days)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    
    if (appointmentDateObj > maxDate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot book appointments more than 90 days in advance'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(appointmentTime)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid time format'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate business hours (basic check)
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    if (hours < 6 || hours > 22 || minutes % 15 !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid appointment time'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    // Sanitize client details
    const sanitizedDetails = {
      firstName: sanitizeInput(clientDetails.firstName, 50),
      lastName: sanitizeInput(clientDetails.lastName, 50),
      phone: clientDetails.phone?.replace(/\D/g, '').slice(0, 15) || '',
      email: sanitizeInput(clientDetails.email, 254).toLowerCase(),
      notes: sanitizeInput(clientDetails.notes || '', 500)
    };

    // Additional validation for sanitized details
    if (!sanitizedDetails.firstName || sanitizedDetails.firstName.length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid first name is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!sanitizedDetails.lastName || sanitizedDetails.lastName.length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid last name is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Enhanced email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(sanitizedDetails.email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid email address is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Enhanced phone validation
    const cleanPhone = sanitizedDetails.phone;
    if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid phone number is required'
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

    // Validate fee calculations
    if (platformFeeAmount < 0 || platformFeeAmount > amountInCents * 0.1) { // Max 10% platform fee
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid fee calculation'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
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
        client_name: `${sanitizedDetails.firstName} ${sanitizedDetails.lastName}`,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        business_name: sanitizeInput(barberData.business_name, 100)
      },
      description: `${serviceData.name} at ${barberData.business_name}`,
      receipt_email: sanitizedDetails.email,
      statement_descriptor: 'KUTABLE*' + barberData.business_name.toUpperCase().replace(/[^A-Z0-9\s\*\.\/\-]/g, '').slice(0, 14)
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