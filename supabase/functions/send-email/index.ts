import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface EmailRequest {
  to: string;
  name: string;
  subject: string;
  message: string;
  type: string;
}

// Rate limiting for email sends
const emailAttempts = new Map<string, { count: number; lastAttempt: number }>();

const isRateLimited = (identifier: string, maxAttempts: number = 10, windowMs: number = 60 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = emailAttempts.get(identifier);
  
  if (!attempts) {
    emailAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (now - attempts.lastAttempt > windowMs) {
    emailAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (attempts.count >= maxAttempts) {
    return true;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  emailAttempts.set(identifier, attempts);
  
  return false;
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
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
    if (isRateLimited(`email_${clientIP}`, 20, 60 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email rate limit exceeded. Please wait before sending more emails.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }

    const { to, name, subject, message, type }: EmailRequest = await req.json()

    if (!to || !subject || !message) {
      throw new Error('Missing required fields: to, subject, and message are required')
    }

    // Enhanced input validation and sanitization
    const sanitizedTo = sanitizeInput(to, 254).toLowerCase();
    const sanitizedName = sanitizeInput(name, 100);
    const sanitizedSubject = sanitizeInput(subject, 200);
    const sanitizedMessage = message.slice(0, 10000); // Allow longer content for emails
    const sanitizedType = sanitizeInput(type, 50);

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(sanitizedTo)) {
      throw new Error('Invalid email address format')
    }

    // Check for disposable email domains
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
    const emailDomain = sanitizedTo.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      throw new Error('Disposable email addresses are not allowed')
    }

    // Validate message type
    const validTypes = [
      'booking_created', 'booking_confirmed', 'booking_cancelled', 
      'booking_rescheduled', 'appointment_reminder', 'payment_received'
    ];
    if (!validTypes.includes(sanitizedType)) {
      throw new Error('Invalid email type')
    }

    // Rate limiting per email address
    if (isRateLimited(`email_addr_${sanitizedTo}`, 5, 60 * 60 * 1000)) {
      throw new Error('Too many emails sent to this address. Please wait before sending more.')
    }

    // Check for spam content
    const spamPatterns = [
      /urgent.*action/gi,
      /limited.*time/gi,
      /click.*here.*now/gi,
      /free.*money/gi,
      /congratulations.*winner/gi
    ];
    
    const contentToCheck = `${sanitizedSubject} ${sanitizedMessage}`.toLowerCase();
    if (spamPatterns.some(pattern => pattern.test(contentToCheck))) {
      throw new Error('Email content contains prohibited patterns')
    }

    // For now, we'll use Supabase's built-in email functionality
    // In production, you would integrate with SendGrid, Mailgun, or similar
    
    console.log('Email would be sent:', {
      to: sanitizedTo,
      name: sanitizedName,
      subject: sanitizedSubject,
      type: sanitizedType,
      messageLength: sanitizedMessage.length,
      timestamp: new Date().toISOString()
    });

    // Simulate email sending - replace with actual email service in production
    // Example with SendGrid:
    /*
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (sendGridApiKey) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: sanitizedTo, name: sanitizedName }],
            subject: sanitizedSubject
          }],
          from: { 
            email: 'notifications@kutable.com', 
            name: 'Kutable Notifications' 
          },
          content: [{
            type: 'text/html',
            value: sanitizedMessage
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Email sent via SendGrid:', result);
    }
    */

    // For now, return success (in production, check actual email service response)
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: `sim_${Date.now()}`,
        to: sanitizedTo,
        subject: sanitizedSubject,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Email service error:', error);
    
    // Don't expose internal error details
    let userMessage = 'Email sending failed';
    if (error instanceof Error) {
      if (error.message.includes('Invalid email')) {
        userMessage = 'Invalid email address provided';
      } else if (error.message.includes('rate limit')) {
        userMessage = error.message; // Rate limit messages are safe to expose
      } else if (error.message.includes('prohibited')) {
        userMessage = 'Email content not allowed';
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: userMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Don't break booking flow for email failures
      },
    )
  }
})