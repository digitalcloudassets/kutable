import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOWED_ORIGIN = "https://kutable.com";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function badRequest(msg: string) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status: 400,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

function serverError(msg: string, status = 502) {
  return new Response(JSON.stringify({ success: false, error: msg }), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders(),
    });
  }

  try {
    const { to, message, type } = await req.json();

    if (!to || !message) return badRequest("Missing 'to' or 'message'");

    const normalized = toE164(String(to));
    if (!normalized) return badRequest("Invalid phone number");

    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const msgSvc = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
    if (!sid || !token || !msgSvc) {
      return serverError("Twilio environment not configured", 500);
    }

    const body = new URLSearchParams({
      To: normalized,
      MessagingServiceSid: msgSvc,
      Body: String(message),
    });

    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${sid}:${token}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const twilioJson = await twilioResp.json().catch(() => ({}));

    if (!twilioResp.ok) {
      console.error("Twilio error", twilioResp.status, twilioJson);
      // Common case: unverified sender/number
      const msg =
        twilioJson?.message || "Twilio rejected the request (verification pending?)";
      return serverError(msg);
    }

    return new Response(JSON.stringify({ success: true, sid: twilioJson.sid }), {
      status: 200,
      headers: { "content-type": "application/json", ...corsHeaders() },
    });
  } catch (err) {
    console.error("send-sms error", err);
    return serverError("Internal error sending SMS");
  }
});