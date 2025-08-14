import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

interface SupportRequest {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  userId?: string;
}

// Rate limiting for support requests
const supportAttempts = new Map<string, { count: number; lastAttempt: number }>();

const isRateLimited = (identifier: string, maxAttempts: number = 3, windowMs: number = 60 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = supportAttempts.get(identifier);
  
  if (!attempts) {
    supportAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (now - attempts.lastAttempt > windowMs) {
    supportAttempts.set(identifier, { count: 1, lastAttempt: now });
    return false;
  }
  
  if (attempts.count >= maxAttempts) {
    return true;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  supportAttempts.set(identifier, attempts);
  
  return false;
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/[<>&"']/g, '');
};
Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting by IP
    if (isRateLimited(`support_${clientIP}`, 3, 60 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many support requests. Please wait an hour before submitting another request.'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
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
          error: 'Missing required environment variables for database connection'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const requestData: SupportRequest = await req.json()

    // Validate required fields
    const { name, email, category, subject, message, userId } = requestData;

    if (!name || !email || !category || !subject || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'All fields are required: name, email, category, subject, message'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Enhanced validation for each field
    if (typeof name !== 'string' || typeof email !== 'string' || 
        typeof category !== 'string' || typeof subject !== 'string' || 
        typeof message !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid input format'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    // Validate input lengths and content
    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Input too long. Name: 100 chars, Subject: 200 chars, Message: 5000 chars max.'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate minimum lengths
    if (name.length < 2 || subject.length < 5 || message.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Input too short. Please provide meaningful content.'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate category
    const validCategories = ['general', 'booking', 'payment', 'barber', 'technical', 'billing'];
    if (!validCategories.includes(category)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid category selected'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Check for spam content
    const spamPatterns = [
      /free money/gi,
      /click here/gi,
      /urgent.*action/gi,
      /limited.*time/gi,
      /congratulations.*winner/gi
    ];
    
    const contentToCheck = `${subject} ${message}`.toLowerCase();
    if (spamPatterns.some(pattern => pattern.test(contentToCheck))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request contains prohibited content'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Rate limiting per email
    if (isRateLimited(`email_${email}`, 2, 60 * 60 * 1000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many requests from this email. Please wait an hour before submitting another request.'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 429,
        },
      )
    }
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      category: sanitizeInput(category),
      subject: sanitizeInput(subject),
      message: sanitizeInput(message),
      user_id: userId || null
    };

    // Save to database
    const { data: supportRequest, error: dbError } = await supabase
      .from('support_requests')
      .insert(sanitizedData)
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to save support request. Please try again.'
        }),
        {
          headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    // Send email notification to support team
    try {
      const emailContent = `
New Support Request Received

From: ${sanitizedData.name} (${sanitizedData.email})
Category: ${sanitizedData.category}
Subject: ${sanitizedData.subject}

Message:
${sanitizedData.message}

---
Request ID: ${supportRequest.id}
Submitted: ${new Date().toISOString()}
User ID: ${userId || 'Anonymous'}
`;

      // Note: In production, you would integrate with an email service like SendGrid, Mailgun, or Resend
      // For now, we'll log the email content and return success
      console.log('Support email would be sent to info@kutable.com:');
      console.log(emailContent);
      
      // You could integrate with an email service here:
      // const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${emailApiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     personalizations: [{
      //       to: [{ email: 'info@kutable.com' }],
      //       subject: `Support Request: ${sanitizedData.subject}`
      //     }],
      //     from: { email: 'support@kutable.com', name: 'Kutable Support' },
      //     content: [{
      //       type: 'text/plain',
      //       value: emailContent
      //     }]
      //   })
      // });

    } catch (emailError) {
      console.warn('Email sending failed (this is expected without email service configured):', emailError);
      // Don't fail the entire request if email fails - support request is still saved
    }

    return new Response(
      JSON.stringify({
        success: true,
        supportRequestId: supportRequest.id,
        message: 'Support request submitted successfully. We will respond within 24 hours.'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Support request submission error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Support request submission failed'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})