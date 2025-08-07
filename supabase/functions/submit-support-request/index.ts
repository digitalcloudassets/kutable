import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SupportRequest {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  userId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required environment variables for database connection'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate input lengths and content
    if (name.length > 100 || subject.length > 200 || message.length > 2000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Input too long. Name: 100 chars, Subject: 200 chars, Message: 2000 chars max.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Sanitize inputs (basic XSS prevention)
    const sanitizeInput = (input: string) => input.replace(/<[^>]*>/g, '').trim();
    
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})