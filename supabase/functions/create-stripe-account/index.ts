import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface CreateAccountRequest {
  barberId?: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check for required environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = 'https://kutable.com'; // Use live site URL

    const missingEnvVars = [];
    if (!stripeSecretKey) missingEnvVars.push('STRIPE_SECRET_KEY');
    if (!supabaseUrl) missingEnvVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingEnvVars.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required environment variables: ${missingEnvVars.join(', ')}. Please configure these in your Supabase Edge Functions settings.`
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

    const { 
      barberId, 
      businessName, 
      ownerName, 
      email, 
      phone, 
      address 
    }: CreateAccountRequest = await req.json()

    // Validate required fields
    if (!businessName || !ownerName || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: businessName, ownerName, and email are required.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      business_type: 'individual', // Most barbers are sole proprietors
      individual: {
        first_name: ownerName.split(' ')[0],
        last_name: ownerName.split(' ').slice(1).join(' ') || ownerName.split(' ')[0],
        email: email,
        phone: phone,
        address: address ? {
          line1: address.line1,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: 'US'
        } : undefined
      },
      business_profile: {
        name: businessName,
        mcc: '7230', // Barber and beauty shops
        url: `${siteUrl}/barber/${barberId || 'new'}`,
        support_phone: phone,
        support_email: email
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    })

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${siteUrl}/dashboard?stripe_refresh=true&account_id=${account.id}`,
      return_url: `${siteUrl}/dashboard?stripe_setup=complete&account_id=${account.id}`,
      type: 'account_onboarding',
      collect: 'eventually_due' // Collect all required information
    })

    console.log('Created Stripe account:', account.id);
    console.log('Account link URL:', accountLink.url);
    console.log('Return URL will be:', `${siteUrl}/dashboard?stripe_setup=complete&account_id=${account.id}`);

    // Store in database if barberId is provided
    if (barberId) {
      try {
        // First, update the barber profile with the Stripe account ID
        const { error: profileUpdateError } = await supabase
          .from('barber_profiles')
          .update({
            stripe_account_id: account.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', barberId)

        if (profileUpdateError) {
          console.error('Error updating barber profile:', profileUpdateError);
        }

        // Then create/update the stripe_accounts record
        const { error: stripeAccountError } = await supabase
          .from('stripe_accounts')
          .upsert({
            barber_id: barberId,
            stripe_account_id: account.id,
            account_status: 'pending',
            charges_enabled: false,
            payouts_enabled: false,
            updated_at: new Date().toISOString()
          })

        if (stripeAccountError) {
          console.error('Error storing Stripe account:', stripeAccountError);
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accountId: account.id,
        onboardingUrl: accountLink.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Stripe Connect error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid API Key')) {
        errorMessage = 'Invalid Stripe API key. Please check your STRIPE_SECRET_KEY environment variable.';
      } else if (error.message.includes('No such')) {
        errorMessage = 'Stripe configuration error. Please verify your Stripe account settings.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})