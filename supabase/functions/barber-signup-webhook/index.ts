import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const json = (status: number, data: any) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

interface BarberProfile {
  id: string;
  business_name: string;
  owner_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: BarberProfile;
  schema: string;
  old_record?: BarberProfile;
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Resend API error');
    }

    return {
      success: true,
      messageId: result.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

function generateSignupEmailHTML(barber: BarberProfile): string {
  const location = barber.city && barber.state ? `${barber.city}, ${barber.state}` : (barber.city || barber.state || 'Location not provided');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>New Barber Signup</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0066FF 0%, #00D4AA 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; font-size: 28px; margin: 0; font-weight: bold;">Kutable</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">New Barber Signup Alert</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 20px 0;">🎉 New Barber Profile Created</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            A new barber has just signed up for Kutable! Here are their details:
          </p>

          <!-- Barber Details Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #374151; width: 30%;">Business Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937; font-weight: 500;">${barber.business_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #374151;">Owner Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937; font-weight: 500;">${barber.owner_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #374151;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937;">
                  ${barber.email ? `<a href="mailto:${barber.email}" style="color: #0066FF; text-decoration: none;">${barber.email}</a>` : 'Not provided'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #374151;">Phone:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937;">
                  ${barber.phone ? `<a href="tel:${barber.phone}" style="color: #0066FF; text-decoration: none;">${barber.phone}</a>` : 'Not provided'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #374151;">Location:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #1f2937;">${location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Profile ID:</td>
                <td style="padding: 8px 0; color: #6b7280; font-family: monospace; font-size: 14px;">${barber.id}</td>
              </tr>
            </table>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://kutable.com/admin" 
               style="display: inline-block; background-color: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">
              View in Admin Dashboard
            </a>
            <a href="https://kutable.com/barber/${barber.id}" 
               style="display: inline-block; background-color: #00D4AA; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              View Profile
            </a>
          </div>

          <!-- Signup Details -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin-top: 25px;">
            <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">Signup Details</h4>
            <p style="color: #1e40af; font-size: 14px; margin: 0;">
              <strong>Signed up:</strong> ${new Date(barber.created_at).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This is an automated notification from the Kutable platform.<br>
            <a href="https://kutable.com/admin" style="color: #0066FF; text-decoration: none;">Admin Dashboard</a> | 
            <a href="https://kutable.com/support" style="color: #0066FF; text-decoration: none;">Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Method not allowed' })
  }

  try {
    // Get environment variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const DB_WEBHOOK_SECRET = Deno.env.get('DB_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY || !DB_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { 
        success: false, 
        error: 'Missing required environment variables' 
      })
    }

    // Verify webhook secret for security
    const receivedSecret = req.headers.get('authorization')?.replace('Bearer ', '') || 
                          req.headers.get('x-webhook-secret') || 
                          '';

    if (receivedSecret !== DB_WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret received');
      return json(401, { 
        success: false, 
        error: 'Unauthorized: Invalid webhook secret' 
      })
    }

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    console.log('Received webhook:', {
      type: payload.type,
      table: payload.table,
      schema: payload.schema,
      recordId: payload.record?.id
    });

    // Only process INSERT events for barber_profiles table
    if (payload.type !== 'INSERT' || payload.table !== 'barber_profiles') {
      return json(200, { 
        success: true, 
        message: 'Event ignored - not a barber profile insertion' 
      })
    }

    const barberProfile = payload.record;

    if (!barberProfile || !barberProfile.id) {
      return json(400, { 
        success: false, 
        error: 'Invalid barber profile data in webhook payload' 
      })
    }

    console.log('Processing new barber signup:', {
      id: barberProfile.id,
      business_name: barberProfile.business_name,
      owner_name: barberProfile.owner_name,
      location: `${barberProfile.city || 'Unknown'}, ${barberProfile.state || 'Unknown'}`
    });

    // Generate email content
    const emailSubject = `New barber signup: ${barberProfile.business_name || barberProfile.owner_name}`;
    const emailHTML = generateSignupEmailHTML(barberProfile);

    // Send email notification
    const emailResult = await sendResendEmail(
      RESEND_API_KEY,
      'Kutable Platform <notifications@mail.kutable.com>',
      'signups@kutable.com',
      emailSubject,
      emailHTML
    );

    if (!emailResult.success) {
      console.error('Failed to send signup notification email:', emailResult.error);
      // Don't fail the webhook - just log the error
      return json(200, {
        success: true,
        warning: `Barber signup processed but email notification failed: ${emailResult.error}`,
        barberId: barberProfile.id
      })
    }

    console.log('Signup notification email sent successfully:', {
      barberId: barberProfile.id,
      messageId: emailResult.messageId,
      businessName: barberProfile.business_name
    });

    return json(200, {
      success: true,
      message: 'Barber signup processed and notification sent',
      barberId: barberProfile.id,
      emailSent: true,
      messageId: emailResult.messageId
    })

  } catch (error) {
    console.error('Barber signup webhook error:', error);
    
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed'
    })
  }
})