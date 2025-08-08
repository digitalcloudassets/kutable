const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const json = (statusCode: number, data: any) => {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

const form = (body: any) => {
  const formData = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  return formData;
};

interface CreateAccountRequest {
  barberId: string;
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

// Stripe REST API helper
const stripePost = async (endpoint: string, body: any, stripeSecretKey: string) => {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
    },
    body: form(body)
  });

  const requestId = response.headers.get('request-id');
  const responseData = await response.json();

  if (!response.ok) {
    console.error(`Stripe ${endpoint} error (request-id: ${requestId}):`, {
      status: response.status,
      error: responseData
    });
    throw new Error(responseData.error?.message || `Stripe API error: ${response.status}`);
  }

  console.log(`Stripe ${endpoint} success (request-id: ${requestId}):`, {
    id: responseData.id,
    type: responseData.type || responseData.object
  });

  return responseData;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for required environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = 'https://kutable.com';

    const missingEnvVars = [];
    if (!stripeSecretKey) missingEnvVars.push('STRIPE_SECRET_KEY');
    if (!supabaseUrl) missingEnvVars.push('SUPABASE_URL');
    if (!supabaseServiceKey) missingEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missingEnvVars.length > 0) {
      return json(400, {
        success: false,
        error: `Missing required environment variables: ${missingEnvVars.join(', ')}. Please configure these in your Supabase Edge Functions settings.`
      });
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: CreateAccountRequest = await req.json();

    // Validate required fields
    const { barberId, businessName, ownerName, email, phone, address } = requestData;

    if (!barberId || !businessName || !ownerName || !email) {
      return json(400, {
        success: false,
        error: 'Missing required fields: barberId, businessName, ownerName, email are required'
      });
    }

    // Validate field formats
    if (typeof barberId !== 'string' || typeof businessName !== 'string' || 
        typeof ownerName !== 'string' || typeof email !== 'string') {
      return json(400, {
        success: false,
        error: 'Invalid field types provided'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Create Stripe Express account
    const accountPayload: any = {
      type: 'express',
      country: 'US',
      email: email,
      business_type: 'individual'
    };

    // Add individual details
    const nameParts = ownerName.split(' ');
    accountPayload['individual[first_name]'] = nameParts[0];
    accountPayload['individual[last_name]'] = nameParts.slice(1).join(' ') || nameParts[0];
    accountPayload['individual[email]'] = email;
    
    if (phone) {
      accountPayload['individual[phone]'] = phone;
    }

    if (address) {
      accountPayload['individual[address][line1]'] = address.line1;
      accountPayload['individual[address][city]'] = address.city;
      accountPayload['individual[address][state]'] = address.state;
      accountPayload['individual[address][postal_code]'] = address.postal_code;
      accountPayload['individual[address][country]'] = 'US';
    }

    // Add business profile
    accountPayload['business_profile[name]'] = businessName;
    accountPayload['business_profile[mcc]'] = '7230'; // Barber and beauty shops
    accountPayload['business_profile[url]'] = `${siteUrl}/barber/${barberId}`;
    
    if (phone) {
      accountPayload['business_profile[support_phone]'] = phone;
    }
    accountPayload['business_profile[support_email]'] = email;

    // Add capabilities
    accountPayload['capabilities[card_payments][requested]'] = 'true';
    accountPayload['capabilities[transfers][requested]'] = 'true';

    const account = await stripePost('/accounts', accountPayload, stripeSecretKey);

    // Create account link for onboarding
    // NOTE: client_id must never be passed to account_links when creating onboarding URLs
    // as it can cause OAuth flow conflicts with Express accounts
    const accountLinkPayload = {
      account: account.id,
      refresh_url: `${siteUrl}/dashboard?stripe_refresh=true&account_id=${account.id}`,
      return_url: `${siteUrl}/dashboard?stripe_setup=complete&account_id=${account.id}`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    };

    const accountLink = await stripePost('/account_links', accountLinkPayload, stripeSecretKey);

    // Store in database
    try {
      // Update the barber profile with the Stripe account ID
      const { error: profileUpdateError } = await supabase
        .from('barber_profiles')
        .update({
          stripe_account_id: account.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', barberId);

      if (profileUpdateError) {
        console.error('Error updating barber profile:', profileUpdateError);
      }

      // Create/update the stripe_accounts record
      const { error: stripeAccountError } = await supabase
        .from('stripe_accounts')
        .upsert({
          barber_id: barberId,
          stripe_account_id: account.id,
          account_status: 'pending',
          charges_enabled: false,
          payouts_enabled: false,
          updated_at: new Date().toISOString()
        });

      if (stripeAccountError) {
        console.error('Error storing Stripe account:', stripeAccountError);
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
    }

    return json(200, {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url
    });

  } catch (error) {
    console.error('Stripe Connect error:', error);
    
    // Provide specific error messages based on error type
    let errorMessage = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid API Key') || error.message.includes('No such')) {
        errorMessage = 'Stripe configuration error. Please verify your API keys and account settings.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (error.message.includes('Missing required environment variables')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }
    
    return json(400, {
      success: false,
      error: errorMessage
    });
  }
});