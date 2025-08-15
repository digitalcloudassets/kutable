import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { corsHeaders, withCors, handlePreflight } from "../_shared/cors.ts";

const headers = corsHeaders(['POST', 'OPTIONS']);

const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BASE_URL = Deno.env.get('SITE_URL') ?? 'https://kutable.com';

if (!STRIPE_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing required environment variables for Stripe onboarding');
}

const stripe = new Stripe(STRIPE_SECRET, { 
  apiVersion: '2023-10-16'
});

serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const json = (status: number, data: any) =>
    new Response(JSON.stringify(data), { 
      status, 
      headers: { ...cors.headers, 'Content-Type': 'application/json' } 
    });

  try {
    const auth = req.headers.get('Authorization') ?? '';
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
      global: { headers: { Authorization: auth } } 
    });
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: { user } } = await anon.auth.getUser();
    if (!user) {
      return json(401, { success: false, error: 'Unauthorized' });
    }

    const body = await req.json().catch(() => ({}));
    const { userEmail, userName, businessName } = body;

    // Look up barber profile & existing account id
    const { data: profile, error: profileError } = await svc
      .from('barber_profiles')
      .select('id, stripe_account_id, business_name, owner_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching barber profile:', profileError);
      return json(400, { success: false, error: 'Barber profile not found' });
    }

    let accountId = profile?.stripe_account_id as string | null;

    // Create Stripe Connect account if it doesn't exist
    if (!accountId) {
      console.log('Creating new Stripe Connect account for barber:', user.id);
      
      const accountData: Stripe.AccountCreateParams = {
        type: 'express',
        country: 'US',
        email: userEmail || user.email || undefined,
        capabilities: { 
          transfers: { requested: true }, 
          card_payments: { requested: true } 
        },
        business_type: 'individual',
        metadata: { 
          barber_id: user.id,
          kutable_user: 'true'
        }
      };

      // Add business profile info if available
      if (businessName || profile?.business_name) {
        accountData.business_profile = {
          name: businessName || profile?.business_name || `${userName || profile?.owner_name || 'Barber'} Shop`,
          mcc: '7230', // Personal services - barber shops
          url: `${BASE_URL}/barber/${profile?.id || user.id}`
        };
      }

      // Add individual info if available
      if (userName || profile?.owner_name) {
        const fullName = userName || profile?.owner_name || '';
        const [firstName, ...lastNameParts] = fullName.split(' ');
        accountData.individual = {
          first_name: firstName || 'Barber',
          last_name: lastNameParts.join(' ') || firstName || 'Professional',
          email: userEmail || user.email || undefined
        };
      }

      const account = await stripe.accounts.create(accountData);
      accountId = account.id;

      // Update barber profile with Stripe account ID
      const { error: updateError } = await svc
        .from('barber_profiles')
        .update({ 
          stripe_account_id: accountId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating barber profile with Stripe account:', updateError);
      }

      // Create stripe_accounts record
      await svc
        .from('stripe_accounts')
        .upsert({
          barber_id: profile?.id || user.id,
          stripe_account_id: accountId,
          account_status: 'pending',
          charges_enabled: false,
          payouts_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'stripe_account_id'
        });
    }

    // Create Account Link for onboarding
    const refresh_url = `${BASE_URL}/onboarding/barber`;
    const return_url = `${BASE_URL}/dashboard/barber/profile?stripe_setup=complete&account_id=${accountId}`;
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url,
      return_url
    });

    console.log('Created Stripe onboarding link for barber:', user.id);

    return json(200, { 
      success: true, 
      url: accountLink.url,
      accountId: accountId
    });

  } catch (err: any) {
    console.error('Stripe onboarding error:', err);
    return json(500, { 
      success: false, 
      error: err.message ?? 'Could not start Stripe onboarding' 
    });
  }
});