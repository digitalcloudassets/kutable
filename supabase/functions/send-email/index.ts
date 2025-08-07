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

function normalizeTo(to: unknown): string[] {
  if (!to) return [];
  if (Array.isArray(to)) return to.map(String).filter(Boolean);
  return [String(to)];
}

// Very light validation; let Resend handle deeper checks
const simpleEmailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const { to, name, subject, message, type } = await req.json();

    const toList = normalizeTo(to).filter((e) => simpleEmailRe.test(e));
    if (toList.length === 0) return badRequest("Invalid or missing 'to'");

    if (!subject || !message) return badRequest("Missing 'subject' or 'message'");

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM");
    if (!apiKey || !from) {
      return serverError("Resend environment not configured", 500);
    }

    const payload = {
      from,
      to: toList,
      subject: String(subject),
      html: String(message),
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Resend error", res.status, data);
      const msg = data?.message || "Resend rejected the request";
      return serverError(msg);
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { "content-type": "application/json", ...corsHeaders() },
    });
  } catch (err) {
    console.error("send-email error", err);
    return serverError("Internal error sending email");
  }
});