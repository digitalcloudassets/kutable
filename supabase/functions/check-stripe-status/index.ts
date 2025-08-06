import Stripe from 'npm:stripe@14.21.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface CheckStatusRequest {
  accountId: string;
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
          status: 400,
        },
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { accountId }: CheckStatusRequest = await req.json()

    if (!accountId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account ID is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Retrieve the account from Stripe
    const account = await stripe.accounts.retrieve(accountId)

    console.log('Checking Stripe account capabilities:', {
      id: account.id,
      type: account.type,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      transfers_capability: account.capabilities?.transfers,
      card_payments_capability: account.capabilities?.card_payments,
      currently_due: account.requirements?.currently_due,
      pending_verification: account.requirements?.pending_verification
    });
    
    // For live mode, we need to be more careful about status checking
    // Express accounts need transfers capability to be "active" for payments
    const transfersActive = account.capabilities?.transfers === 'active';
    const cardPaymentsActive = account.capabilities?.card_payments === 'active';
    
    // Check onboarding status
    const onboardingComplete = account.details_submitted && 
                              transfersActive && 
                              cardPaymentsActive;
                              
    const detailsSubmitted = account.details_submitted;
    const requiresVerification = detailsSubmitted && (!transfersActive || !cardPaymentsActive);

    console.log('Onboarding status:', {
      complete: onboardingComplete,
      detailsSubmitted,
      requiresVerification,
      transfersActive,
      cardPaymentsActive,
      currentlyDue: account.requirements?.currently_due?.length || 0,
      pendingVerification: account.requirements?.pending_verification?.length || 0
    });
    
    // Update the database based on status
    if (detailsSubmitted) {
      console.log('Updating database with completed onboarding status...');
      // Update stripe_accounts table
      const { error: stripeAccountError } = await supabase
        .from('stripe_accounts')
        .upsert({
          stripe_account_id: accountId,
          account_status: onboardingComplete ? 'active' : 'pending_verification',
          charges_enabled: cardPaymentsActive,
          payouts_enabled: account.payouts_enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'stripe_account_id'
        });

      if (stripeAccountError) {
        console.error('Error updating stripe_accounts:', stripeAccountError);
      }
      
      // Update barber_profiles table - only mark as complete if fully enabled
      const { error: barberUpdateError } = await supabase
        .from('barber_profiles')
        .update({
          stripe_onboarding_completed: onboardingComplete,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', accountId)

      if (barberUpdateError) {
        console.error('Error updating barber_profiles:', barberUpdateError);
      } else {
        console.log(`Successfully updated barber profile. Complete: ${onboardingComplete}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        onboardingComplete,
        detailsSubmitted,
        requiresVerification,
        transfersActive,
        cardPaymentsActive,
        accountStatus: {
          details_submitted: account.details_submitted,
          charges_enabled: cardPaymentsActive,
          payouts_enabled: account.payouts_enabled,
          capabilities: {
            transfers: account.capabilities?.transfers,
            card_payments: account.capabilities?.card_payments
          },
          requirements: {
            currently_due: account.requirements?.currently_due || [],
            pending_verification: account.requirements?.pending_verification || []
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error checking Stripe status:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})