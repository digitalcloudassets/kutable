// Shared helper: best-effort logging to the notification_events table.
// Never throws; booking flow is never blocked by logging failures.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type EventInput = {
  channel: "sms" | "email";
  recipient: string;
  template?: string;
  payload?: unknown;
  status: "sent" | "failed";
  provider_message_id?: string | null;
  error_detail?: string | null;
};

export async function recordNotification(evt: EventInput) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    await supabase.from("notification_events").insert({
      channel: evt.channel,
      recipient: evt.recipient,
      template: evt.template ?? null,
      payload: evt.payload ?? null,
      status: evt.status,
      provider_message_id: evt.provider_message_id ?? null,
      error_detail: evt.error_detail ?? null,
    });
  } catch (_e) {
    // swallow — logging must not break primary flows
  }
}