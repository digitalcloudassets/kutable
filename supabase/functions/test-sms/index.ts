import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface TestSMSRequest {
  phoneNumber: string;
  testMessage?: string;
}

function isLikelyUS(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10;
}

function toE164(phone: string) {
  let p = phone.trim();
  if (isLikelyUS(p)) return `+1${p.replace(/\D/g, "")}`;
  if (/^\+/.test(p)) return p;
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('SMS Test Function called');
    
    // Check environment variables
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
    
    console.log('Environment check:', {
      hasSid: !!twilioSid,
      hasToken: !!twilioToken,
      hasMessagingService: !!twilioMessagingServiceSid,
      sidLength: twilioSid?.length || 0,
      tokenLength: twilioToken?.length || 0,
      messagingServiceLength: twilioMessagingServiceSid?.length || 0
    });

    if (!twilioSid || !twilioToken || !twilioMessagingServiceSid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio configuration missing',
          details: {
            hasSid: !!twilioSid,
            hasToken: !!twilioToken,
            hasMessagingService: !!twilioMessagingServiceSid
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    let requestData: TestSMSRequest;
    
    if (req.method === 'GET') {
      // For GET requests, use query parameters
      const url = new URL(req.url);
      const phoneNumber = url.searchParams.get('phone') || '';
      const testMessage = url.searchParams.get('message') || 'Test message from Kutable SMS system. Your SMS is working correctly! 🎉';
      
      requestData = { phoneNumber, testMessage };
    } else {
      // For POST requests, use JSON body
      try {
        requestData = await req.json();
      } catch {
        requestData = { phoneNumber: '', testMessage: 'Test message from Kutable SMS system. Your SMS is working correctly! 🎉' };
      }
    }

    const { phoneNumber, testMessage } = requestData;

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Phone number is required',
          usage: 'POST with {"phoneNumber": "+1234567890"} or GET with ?phone=1234567890'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Normalize phone number
    const normalizedPhone = toE164(phoneNumber);
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid phone number format',
          provided: phoneNumber,
          expected: 'US format: 1234567890 or +11234567890'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('Attempting to send SMS to:', normalizedPhone);

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const authHeader = `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`;
    
    const formData = new URLSearchParams({
      To: normalizedPhone,
      MessagingServiceSid: twilioMessagingServiceSid,
      Body: testMessage || 'Test message from Kutable SMS system. Your SMS is working correctly! 🎉'
    });

    console.log('Sending request to Twilio with:', {
      url: twilioUrl,
      to: normalizedPhone,
      messagingServiceSid: twilioMessagingServiceSid,
      bodyLength: formData.get('Body')?.length || 0
    });

    // Send SMS via Twilio API
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json().catch(() => ({}));
    
    console.log('Twilio response:', {
      status: twilioResponse.status,
      ok: twilioResponse.ok,
      data: twilioData
    });

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', {
        status: twilioResponse.status,
        statusText: twilioResponse.statusText,
        data: twilioData
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio API error',
          details: {
            status: twilioResponse.status,
            message: twilioData.message || twilioResponse.statusText,
            code: twilioData.code,
            moreInfo: twilioData.more_info
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('SMS sent successfully:', {
      sid: twilioData.sid,
      to: twilioData.to,
      from: twilioData.from,
      status: twilioData.status
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully!',
        details: {
          messageSid: twilioData.sid,
          to: twilioData.to,
          from: twilioData.from,
          status: twilioData.status,
          body: twilioData.body
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('SMS test error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'SMS test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
});