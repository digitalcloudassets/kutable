import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'
import { consumeRateLimit } from '../_shared/rateLimit.ts'

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

interface TwilioWebhookData {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  SmsStatus?: string;
  SmsSid?: string;
  AccountSid: string;
}

const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

Deno.serve(async (req) => {
  // Twilio webhooks are server-to-server, not browser requests
  const preflight = handlePreflight(req, headers, { requireBrowserOrigin: false });
  if (preflight) return preflight;

  const cors = withCors(req, headers, { requireBrowserOrigin: false });
  if (!cors.ok) return cors.res;

  // RATE LIMIT: Higher limit for legitimate webhooks, 100 per minute
  const rl = await consumeRateLimit(req, "twilio-webhook", { limit: 100, windowSeconds: 60 });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook rate limit exceeded',
        retryAfter: 60
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 429,
      },
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing database configuration'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the form data from Twilio webhook
    const formData = await req.formData()
    const webhookData: Partial<TwilioWebhookData> = {}
    
    for (const [key, value] of formData.entries()) {
      webhookData[key as keyof TwilioWebhookData] = value.toString()
    }

    // Validate that this is a legitimate Twilio webhook
    if (!webhookData.MessageSid || !webhookData.From || !webhookData.To || !webhookData.Body) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid webhook data - missing required fields'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Verify the webhook is from the correct Twilio account
    if (twilioAccountSid && webhookData.AccountSid !== twilioAccountSid) {
      console.warn('Webhook from unexpected Twilio account:', webhookData.AccountSid);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized webhook source'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 403,
        },
      )
    }

    // Sanitize the message content
    const sanitizedMessage = sanitizeInput(webhookData.Body || '', 1600);
    const fromPhone = webhookData.From?.replace(/\D/g, '') || '';
    const toPhone = webhookData.To?.replace(/\D/g, '') || '';

    console.log('Received SMS webhook:', {
      messageSid: webhookData.MessageSid,
      from: fromPhone,
      to: toPhone,
      messagePreview: sanitizedMessage.slice(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    // Handle different types of incoming messages
    const messageBody = sanitizedMessage.toLowerCase();

    // Handle STOP/UNSUBSCRIBE requests
    if (messageBody.includes('stop') || messageBody.includes('unsubscribe')) {
      await handleOptOut(fromPhone, supabase);
      
      // Send confirmation response (optional)
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Message>You have been unsubscribed from Kutable SMS notifications. Text START to re-subscribe.</Message>
         </Response>`,
        {
          headers: { ...cors.headers, 'Content-Type': 'application/xml' },
          status: 200,
        },
      )
    }

    // Handle START/SUBSCRIBE requests
    if (messageBody.includes('start') || messageBody.includes('subscribe')) {
      await handleOptIn(fromPhone, supabase);
      
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Message>Welcome back to Kutable SMS notifications! You'll now receive booking confirmations and reminders.</Message>
         </Response>`,
        {
          headers: { ...cors.headers, 'Content-Type': 'application/xml' },
          status: 200,
        },
      )
    }

    // Handle HELP requests
    if (messageBody.includes('help') || messageBody.includes('info')) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Message>Kutable - Professional Barber Booking. Visit kutable.com for help. Text STOP to unsubscribe, START to resubscribe.</Message>
         </Response>`,
        {
          headers: { ...cors.headers, 'Content-Type': 'application/xml' },
          status: 200,
        },
      )
    }

    // For other messages, log them but don't auto-respond
    console.log('Incoming SMS logged:', {
      from: fromPhone,
      message: sanitizedMessage,
      timestamp: new Date().toISOString()
    });

    // Store the incoming message in database (optional)
    try {
      await supabase
        .from('incoming_sms_log')
        .insert({
          message_sid: webhookData.MessageSid,
          from_phone: fromPhone,
          to_phone: toPhone,
          message_body: sanitizedMessage,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.warn('Failed to log incoming SMS (table may not exist):', dbError);
    }

    // Return empty TwiML response (no auto-reply)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
       <Response></Response>`,
      {
        headers: { ...cors.headers, 'Content-Type': 'application/xml' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Twilio webhook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Handle SMS opt-out requests
async function handleOptOut(phoneNumber: string, supabase: any): Promise<void> {
  try {
    // Update client profiles
    await supabase
      .from('client_profiles')
      .update({ 
        sms_consent: false,
        consent_updated_at: new Date().toISOString()
      })
      .eq('phone', phoneNumber);

    // Update barber profiles
    await supabase
      .from('barber_profiles')
      .update({ 
        sms_consent: false,
        consent_updated_at: new Date().toISOString()
      })
      .eq('phone', phoneNumber);

    console.log('User opted out of SMS:', phoneNumber);
  } catch (error) {
    console.error('Error handling SMS opt-out:', error);
  }
}

// Handle SMS opt-in requests
async function handleOptIn(phoneNumber: string, supabase: any): Promise<void> {
  try {
    // Update client profiles
    await supabase
      .from('client_profiles')
      .update({ 
        sms_consent: true,
        consent_updated_at: new Date().toISOString()
      })
      .eq('phone', phoneNumber);

    // Update barber profiles
    await supabase
      .from('barber_profiles')
      .update({ 
        sms_consent: true,
        consent_updated_at: new Date().toISOString()
      })
      .eq('phone', phoneNumber);

    console.log('User opted into SMS:', phoneNumber);
  } catch (error) {
    console.error('Error handling SMS opt-in:', error);
  }
}