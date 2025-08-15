// Replace entire file. Explicit ok flags, logs every attempt, no silent 200s.
// NOTE: We keep HTTP 200 for now to avoid breaking booking flow.
// To enforce failures via HTTP status, see the commented line below.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handlePreflight, withCors } from "../_shared/cors.ts";
import { withSecurityHeaders } from "../_shared/security_headers.ts";
import { recordNotification } from "../_shared/notify.ts";

const base = withSecurityHeaders(
  corsHeaders(["POST", "OPTIONS"]),
);

const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_FROM = Deno.env.get("TWILIO_PHONE_NUMBER")!;

serve(async (req) => {
  const pre = handlePreflight(req, base, { requireBrowserOrigin: true });
  if (pre) return pre;

  const cors = withCors(req, base, { requireBrowserOrigin: true });
  if (!cors.ok) return cors.res;

  try {
    const body = await req.json().catch(() => ({}));
    const to = String(body?.to ?? "").trim();
    const text = String(body?.body ?? "").trim();
    const template = typeof body?.template === "string" ? body.template : undefined;

    if (!to || !text) {
      const resBody = { ok: false, error: "Missing to or body" };
      return new Response(JSON.stringify(resBody), {
        status: 200, // keep 200 to avoid breaking flows
        headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "failed" },
      });
      // To enforce failure via HTTP status later, change to: status: 400
    }

    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    const params = new URLSearchParams({
      To: to,
      From: TWILIO_FROM,
      Body: text,
    });

    const twilioResp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );

    const raw = await twilioResp.text();
    if (!twilioResp.ok) {
      await recordNotification({
        channel: "sms",
        recipient: to,
        template,
        payload: { to, body: text },
        status: "failed",
        provider_message_id: null,
        error_detail: raw.slice(0, 2000),
      });

      const resBody = { ok: false, error: "Twilio send failed", detail: raw };
      return new Response(JSON.stringify(resBody), {
        status: 200, // keep 200 now; later you can switch to 502
        headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "failed" },
      });
    }

    const data = JSON.parse(raw);
    await recordNotification({
      channel: "sms",
      recipient: to,
      template,
      payload: { to, body: text },
      status: "sent",
      provider_message_id: data?.sid ?? null,
    });

    return new Response(JSON.stringify({ ok: true, sid: data?.sid ?? null }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "sent" },
    });
  } catch (e) {
    await recordNotification({
      channel: "sms",
      recipient: "unknown",
      status: "failed",
      error_detail: String(e).slice(0, 2000),
    });

    const resBody = { ok: false, error: "Unexpected error", detail: String(e) };
    return new Response(JSON.stringify(resBody), {
      status: 200, // keep 200 now; later you can switch to 500
      headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "failed" },
    });
  }
});