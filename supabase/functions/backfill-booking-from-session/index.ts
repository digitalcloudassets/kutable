import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts';

const headers = corsHeaders(['POST', 'OPTIONS']);

Deno.serve(async (req) => {
  const preflight = handlePreflight(req, headers);
  if (preflight) return preflight;

  const cors = withCors(req, headers);
  if (!cors.ok) return cors.res;

  const ok = (d: any, s = 200) => new Response(JSON.stringify(d), {
    status: s,
    headers: { ...cors.headers, 'Content-Type': 'application/json' }
  });

  if (req.method !== 'POST') return ok({ error: 'POST only' }, 405);
  
  try {
    const { session } = await req.json().catch(() => ({}));
    if (!session?.id || !session?.payment_intent) {
      return ok({ error: 'Provide full Checkout Session JSON with id and payment_intent' }, 400);
    }

    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return ok({ error: 'Database not configured' }, 500);
    }
    
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const md = session.metadata || {};
    const bookingId = md.bookingId || crypto.randomUUID();

    console.log('Backfilling booking from session:', {
      sessionId: session.id,
      paymentIntent: session.payment_intent,
      bookingId,
      metadata: md
    });

    // Upsert booking (idempotent)
    const { data: booking, error: bookingError } = await db.from('bookings').upsert({
      id: bookingId,
      barber_id: md.barberId ?? null,
      client_id: md.clientId ?? null,
      service_id: md.serviceId ?? null,
      appointment_date: md.appointmentDate ?? null,
      appointment_time: md.appointmentTime ?? null,
      total_amount: session.amount_total ? session.amount_total / 100 : 0,
      deposit_amount: 0,
      platform_fee: session.amount_total ? Math.floor(session.amount_total * 0.01) / 100 : 0,
      notes: md.notes ?? '',
      status: 'confirmed',
      stripe_payment_intent_id: session.payment_intent,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    }).select().single();

    if (bookingError) {
      console.error('Error upserting booking:', bookingError);
      return ok({ error: 'Failed to create booking', details: bookingError }, 500);
    }

    // Upsert payment record (idempotent)
    const { error: paymentError } = await db.from('payments').upsert({
      payment_intent_id: session.payment_intent,
      session_id: session.id,
      booking_id: bookingId,
      barber_id: md.barberId ?? null,
      user_id: md.clientId ?? null,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? 'usd',
      status: 'succeeded',
      raw: session,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'payment_intent_id'
    });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
    }

    // Send booking confirmation notifications (if not already sent)
    try {
      await db.functions.invoke('process-booking-notifications', {
        body: {
          bookingId: bookingId,
          event: 'booking_confirmed'
        }
      });
    } catch (notificationError) {
      console.warn('Failed to send notifications (booking still created):', notificationError);
    }

    return ok({ 
      success: true, 
      bookingId, 
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      booking: booking
    });
  } catch (error: any) {
    console.error('Backfill error:', error);
    return ok({ error: error?.message || 'Backfill failed' }, 500);
  }
});