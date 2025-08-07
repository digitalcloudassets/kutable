import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  'smtp-id'?: string;
  reason?: string;
  status?: string;
  sg_event_id: string;
  sg_message_id: string;
}

interface MailgunEvent {
  'event-data': {
    event: string;
    recipient: string;
    timestamp: number;
    message: {
      headers: {
        'message-id': string;
      };
    };
    'delivery-status'?: {
      message?: string;
    };
  };
}

interface ResendEvent {
  type: string;
  data: {
    email_id: string;
    to: string[];
    created_at: string;
    subject?: string;
  };
}

// Rate limiting for webhook processing
const webhookAttempts = new Map<string, { count: number; lastAttempt: number }>();

const isRateLimited = (identifier: string, maxAttempts: number = 100, windowMs: number = 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = webhookAttempts.get(identifier);
  
  if (!attempts) {
    webhookAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (now - attempts.lastAttempt > windowMs) {
    webhookAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (attempts.count >= maxAttempts) {
    return true;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  webhookAttempts.set(identifier, attempts);
  
  return false;
};

const sanitizeInput = (input: string, maxLength: number = 500): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
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
    if (isRateLimited(`email_webhook_${clientIP}`, 200, 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email webhook rate limit exceeded'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing database configuration'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Detect email service provider from headers or payload
    const userAgent = req.headers.get('user-agent') || '';
    const contentType = req.headers.get('content-type') || '';
    
    let emailProvider = 'unknown';
    let events: any[] = [];

    // Parse webhook data based on provider
    if (userAgent.includes('SendGrid') || req.headers.get('x-twilio-email-event-webhook')) {
      // SendGrid webhook
      emailProvider = 'sendgrid';
      const body = await req.json();
      events = Array.isArray(body) ? body : [body];
      
      console.log('Processing SendGrid webhook events:', events.length);
      
      for (const event of events) {
        await processSendGridEvent(event as SendGridEvent, supabase);
      }
      
    } else if (userAgent.includes('Mailgun') || req.headers.get('x-mailgun-signature')) {
      // Mailgun webhook
      emailProvider = 'mailgun';
      const body = await req.json();
      events = [body];
      
      console.log('Processing Mailgun webhook event');
      
      for (const event of events) {
        await processMailgunEvent(event as MailgunEvent, supabase);
      }
      
    } else if (userAgent.includes('Resend') || contentType.includes('application/json')) {
      // Resend webhook (or generic JSON webhook)
      emailProvider = 'resend';
      const body = await req.json();
      events = Array.isArray(body) ? body : [body];
      
      console.log('Processing Resend webhook events:', events.length);
      
      for (const event of events) {
        await processResendEvent(event as ResendEvent, supabase);
      }
      
    } else {
      console.warn('Unknown email provider webhook received:', {
        userAgent,
        contentType,
        headers: Object.fromEntries(req.headers.entries())
      });
    }

    // Log webhook receipt
    console.log('Email webhook processed:', {
      provider: emailProvider,
      eventCount: events.length,
      timestamp: new Date().toISOString(),
      ip: clientIP
    });

    return new Response(
      JSON.stringify({
        success: true,
        provider: emailProvider,
        eventsProcessed: events.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Email webhook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Email webhook processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Process SendGrid webhook events
async function processSendGridEvent(event: SendGridEvent, supabase: any): Promise<void> {
  try {
    const sanitizedEmail = sanitizeInput(event.email, 254);
    const eventType = sanitizeInput(event.event, 50);
    
    console.log('SendGrid event:', {
      type: eventType,
      email: sanitizedEmail,
      timestamp: event.timestamp,
      messageId: event.sg_message_id
    });

    // Handle unsubscribe events
    if (eventType === 'unsubscribe' || eventType === 'group_unsubscribe') {
      await handleEmailOptOut(sanitizedEmail, supabase);
    }
    
    // Handle bounce/drop events
    if (eventType === 'bounce' || eventType === 'dropped') {
      await handleEmailBounce(sanitizedEmail, event.reason || '', supabase);
    }

    // Log the event (optional - you might want to store email delivery stats)
    await logEmailEvent(eventType, sanitizedEmail, event.sg_message_id, supabase);

  } catch (error) {
    console.error('Error processing SendGrid event:', error);
  }
}

// Process Mailgun webhook events
async function processMailgunEvent(event: MailgunEvent, supabase: any): Promise<void> {
  try {
    const eventData = event['event-data'];
    const sanitizedEmail = sanitizeInput(eventData.recipient, 254);
    const eventType = sanitizeInput(eventData.event, 50);
    
    console.log('Mailgun event:', {
      type: eventType,
      email: sanitizedEmail,
      timestamp: eventData.timestamp,
      messageId: eventData.message?.headers?.['message-id']
    });

    // Handle unsubscribe events
    if (eventType === 'unsubscribed') {
      await handleEmailOptOut(sanitizedEmail, supabase);
    }
    
    // Handle bounce/failure events
    if (eventType === 'failed' || eventType === 'rejected') {
      const reason = eventData['delivery-status']?.message || '';
      await handleEmailBounce(sanitizedEmail, reason, supabase);
    }

  } catch (error) {
    console.error('Error processing Mailgun event:', error);
  }
}

// Process Resend webhook events
async function processResendEvent(event: ResendEvent, supabase: any): Promise<void> {
  try {
    const eventType = sanitizeInput(event.type, 50);
    const emails = event.data.to || [];
    
    console.log('Resend event:', {
      type: eventType,
      emails: emails.length,
      emailId: event.data.email_id
    });

    // Handle unsubscribe events
    if (eventType === 'email.unsubscribed') {
      for (const email of emails) {
        await handleEmailOptOut(sanitizeInput(email, 254), supabase);
      }
    }
    
    // Handle bounce events
    if (eventType === 'email.bounced' || eventType === 'email.complained') {
      for (const email of emails) {
        await handleEmailBounce(sanitizeInput(email, 254), eventType, supabase);
      }
    }

  } catch (error) {
    console.error('Error processing Resend event:', error);
  }
}

// Handle email opt-out requests
async function handleEmailOptOut(email: string, supabase: any): Promise<void> {
  try {
    console.log('Processing email opt-out for:', email);
    
    // Update client profiles
    const { error: clientError } = await supabase
      .from('client_profiles')
      .update({ 
        email_consent: false,
        communication_consent: false,
        consent_updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (clientError) {
      console.warn('Failed to update client email consent:', clientError);
    }

    // Update barber profiles
    const { error: barberError } = await supabase
      .from('barber_profiles')
      .update({ 
        email_consent: false,
        communication_consent: false,
        consent_updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (barberError) {
      console.warn('Failed to update barber email consent:', barberError);
    }

    console.log('Email opt-out processed successfully for:', email);
  } catch (error) {
    console.error('Error handling email opt-out:', error);
  }
}

// Handle email bounces/failures
async function handleEmailBounce(email: string, reason: string, supabase: any): Promise<void> {
  try {
    console.log('Processing email bounce for:', email, 'reason:', reason);
    
    // If it's a hard bounce (permanent failure), disable email for this address
    const hardBounceReasons = ['invalid', 'not_found', 'rejected', 'bounce'];
    const isHardBounce = hardBounceReasons.some(bounceType => 
      reason.toLowerCase().includes(bounceType)
    );

    if (isHardBounce) {
      // Update client profiles
      await supabase
        .from('client_profiles')
        .update({ 
          email_consent: false,
          consent_updated_at: new Date().toISOString()
        })
        .eq('email', email);

      // Update barber profiles
      await supabase
        .from('barber_profiles')
        .update({ 
          email_consent: false,
          consent_updated_at: new Date().toISOString()
        })
        .eq('email', email);

      console.log('Hard bounce processed - disabled email for:', email);
    }

  } catch (error) {
    console.error('Error handling email bounce:', error);
  }
}

// Log email events for analytics (optional)
async function logEmailEvent(eventType: string, email: string, messageId: string, supabase: any): Promise<void> {
  try {
    // You could create an email_events table to track delivery statistics
    // For now, just log to console
    console.log('Email event logged:', {
      type: eventType,
      email: email.slice(0, 20) + '...', // Partially obscure for privacy
      messageId: messageId?.slice(0, 20),
      timestamp: new Date().toISOString()
    });

    // Example of how you might store this data:
    // await supabase
    //   .from('email_events')
    //   .insert({
    //     event_type: eventType,
    //     email_address: email,
    //     message_id: messageId,
    //     created_at: new Date().toISOString()
    //   });

  } catch (error) {
    console.error('Error logging email event:', error);
  }
}