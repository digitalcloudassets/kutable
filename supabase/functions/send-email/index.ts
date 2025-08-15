// Replace entire file. Explicit ok flags, logs every attempt, no silent 200s.
// Swap the provider call with your ESP of choice. Example shows a generic JSON API.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handlePreflight, withCors } from "../_shared/cors.ts";
import { withSecurityHeaders } from "../_shared/security_headers.ts";
import { recordNotification } from "../_shared/notify.ts";

const base = withSecurityHeaders(
  corsHeaders(["POST", "OPTIONS"]),
);

const EMAIL_PROVIDER_API_KEY = Deno.env.get("EMAIL_PROVIDER_API_KEY")!;
const EMAIL_PROVIDER_URL = Deno.env.get("EMAIL_PROVIDER_URL") ?? "https://api.emailprovider.example/send";

serve(async (req) => {
  const pre = handlePreflight(req, base, { requireBrowserOrigin: true });
  if (pre) return pre;

  const cors = withCors(req, base, { requireBrowserOrigin: true });
  if (!cors.ok) return cors.res;

  try {
    const body = await req.json().catch(() => ({}));
    const to = String(body?.to ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const html = String(body?.html ?? "").trim();
    const template = typeof body?.template === "string" ? body.template : undefined;

    if (!to || !subject || !html) {
      const resBody = { ok: false, error: "Missing to, subject, or html" };
      return new Response(JSON.stringify(resBody), {
        status: 200, // keep 200 now
        headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "failed" },
      });
    }

    const resp = await fetch(EMAIL_PROVIDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMAIL_PROVIDER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, html }),
    });

    const raw = await resp.text();
    if (!resp.ok) {
      await recordNotification({
        channel: "email",
        recipient: to,
        template,
        payload: { to, subject },
        status: "failed",
        provider_message_id: null,
        error_detail: raw.slice(0, 2000),
      });

      const resBody = { ok: false, error: "Email send failed", detail: raw };
      return new Response(JSON.stringify(resBody), {
        status: 200, // later you can flip to 502
        headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "failed" },
      });
    }

    // Try to parse a message id if the provider returns one
    let providerId: string | null = null;
    try {
      const data = JSON.parse(raw);
      providerId = data?.messageId ?? data?.id ?? null;
    } catch {
      providerId = null;
    }

    await recordNotification({
      channel: "email",
      recipient: to,
      template,
      payload: { to, subject },
      status: "sent",
      provider_message_id: providerId,
    });

    return new Response(JSON.stringify({ ok: true, messageId: providerId }), {
      status: 200,
      headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "sent" },
    });
  } catch (e) {
    await recordNotification({
      channel: "email",
      recipient: "unknown",
      status: "failed",
      error_detail: String(e).slice(0, 2000),
    });

    const resBody = { ok: false, error: "Unexpected error", detail: String(e) };
    return new Response(JSON.stringify(resBody), {
      status: 200, // later you can flip to 500
      headers: { ...cors.headers, "Content-Type": "application/json", "X-Notification-Status": "failed" },
    });
  }
});