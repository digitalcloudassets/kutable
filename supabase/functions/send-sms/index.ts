import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SMSRequest {
  to: string;
  message: string;
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_update';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, message, type }: SMSRequest = await req.json()

    if (!to || !message) {
      throw new Error('Missing required fields: to and message are required')
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Missing Twilio configuration:', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasFromNumber: !!fromNumber
      });
      
      // Return success but with a warning (don't break the booking flow)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured - missing Twilio credentials',
          warning: 'Booking was successful but SMS notification could not be sent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Use 200 so booking doesn't fail
        },
      )
    }

    // Clean and format phone number
    const cleanPhone = to.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
    if (cleanPhone.length < 10) {
      throw new Error('Invalid phone number format')
    }

    // Note: In production, we should check SMS consent before sending
    // For now, we'll log this requirement
    console.log('SMS consent should be verified before sending:', {
      to: formattedPhone,
      type: type,
      note: 'Check user SMS consent in client_profiles or barber_profiles'
    });
    // Create Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const body = new URLSearchParams({
      To: formattedPhone,
      From: fromNumber,
      Body: message,
    })

    console.log('Sending SMS via Twilio:', {
      to: formattedPhone,
      from: fromNumber,
      type: type,
      messageLength: message.length
    });
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Twilio API error:', error);
      throw new Error(`Twilio API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    console.log('SMS sent successfully:', {
      messageId: result.sid,
      status: result.status,
      to: formattedPhone
    });
    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.sid,
        status: result.status,
        to: formattedPhone
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('SMS service error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'SMS sending failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Don't break booking flow for SMS failures
      },
    )
  }
})