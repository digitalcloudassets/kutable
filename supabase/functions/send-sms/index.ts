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

// Rate limiting for SMS sends
const smsAttempts = new Map<string, { count: number; lastAttempt: number }>();

const isRateLimited = (identifier: string, maxAttempts: number = 5, windowMs: number = 60 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = smsAttempts.get(identifier);
  
  if (!attempts) {
    smsAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (now - attempts.lastAttempt > windowMs) {
    smsAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (attempts.count >= maxAttempts) {
    return true;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  smsAttempts.set(identifier, attempts);
  
  return false;
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>&"']/g, '');
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
    if (isRateLimited(`sms_${clientIP}`, 10, 60 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SMS rate limit exceeded. Please wait before sending more messages.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }

    const { to, message, type }: SMSRequest = await req.json()

    if (!to || !message) {
      throw new Error('Missing required fields: to and message are required')
    }

    // Enhanced input validation and sanitization
    const sanitizedMessage = sanitizeInput(message, 1600);
    const sanitizedTo = to.replace(/[^\d\+\-\(\)\s]/g, '');
    const sanitizedType = type;

    // Security: Validate input lengths and content
    if (sanitizedMessage.length > 1600) { // SMS limit
      throw new Error('Message too long for SMS delivery')
    }

    if (sanitizedMessage.length < 1) {
      throw new Error('Message cannot be empty')
    }

    // Check for spam patterns in message
    const spamPatterns = [
      /click here/gi,
      /free money/gi,
      /urgent/gi,
      /congratulations/gi,
      /winner/gi,
      /http[s]?:\/\/(?!kutable\.com)/gi // Block external URLs except our domain
    ];
    
    if (spamPatterns.some(pattern => pattern.test(sanitizedMessage))) {
      throw new Error('Message contains prohibited content')
    }
    // Validate phone number format more strictly
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = sanitizedTo.replace(/\D/g, '');
    
    if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new Error('Invalid phone number format')
    }

    // Validate message type
    const validTypes = ['booking_confirmation', 'booking_reminder', 'booking_update'];
    if (!validTypes.includes(sanitizedType)) {
      throw new Error('Invalid message type')
    }

    // Additional rate limiting per phone number
    if (isRateLimited(`phone_${cleanPhone}`, 5, 60 * 60 * 1000)) {
      throw new Error('Too many messages sent to this number. Please wait before sending more.')
    }
    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    // Validate Twilio credentials more strictly
    if (!accountSid || !authToken || !fromNumber || 
        accountSid.trim() === '' || authToken.trim() === '' || fromNumber.trim() === '') {
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

    // Additional validation for credential format
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      console.error('Invalid Twilio Account SID format:', accountSid.substring(0, 5) + '...');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid Twilio Account SID format',
          warning: 'Booking was successful but SMS notification could not be sent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
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
    console.log('Sending SMS with Twilio:', {
      to: formattedPhone,
      type: type,
      messagePreview: sanitizedMessage.slice(0, 50) + '...'
    });
    // Create Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid.trim()}/Messages.json`
    
    const body = new URLSearchParams({
      To: formattedPhone,
      From: fromNumber,
      Body: sanitizedMessage,
    })

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
      console.error('Twilio API error:', {
        status: response.status,
        statusText: response.statusText,
        error: error.slice(0, 200) // Limit error log size
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `SMS service error: ${response.status}`,
          warning: 'Booking was successful but SMS notification could not be sent'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
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