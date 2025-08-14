import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, withCors, handlePreflight } from '../_shared/cors.ts'

const headers = corsHeaders(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

// This function should be called daily via cron job to send appointment reminders
Deno.serve(async (req) => {
  // This is typically called by cron/scheduler, not browsers
  const preflight = handlePreflight(req, headers, { requireBrowserOrigin: false });
  if (preflight) return preflight;

  const cors = withCors(req, headers, { requireBrowserOrigin: false });
  if (!cors.ok) return cors.res;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing database configuration'
        }),
        {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find all bookings that need reminders (appointments tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: bookingsNeedingReminders, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('appointment_date', tomorrowStr)
      .in('status', ['confirmed', 'pending'])

    if (bookingsError) {
      throw bookingsError;
    }

    let remindersSent = 0;
    let remindersSkipped = 0;

    // Process each booking that needs a reminder
    for (const booking of bookingsNeedingReminders || []) {
      try {
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from('booking_reminders')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('reminder_type', 'appointment_reminder')
          .gte('sent_at', new Date().toISOString().split('T')[0]) // Today or later
          .maybeSingle();

        if (existingReminder) {
          remindersSkipped++;
          continue; // Skip if reminder already sent today
        }

        // Send the reminder notification
        const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/process-booking-notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: booking.id,
            event: 'appointment_reminder'
          })
        });

        if (notificationResponse.ok) {
          // Mark reminder as sent
          await supabase
            .from('booking_reminders')
            .insert({
              booking_id: booking.id,
              reminder_type: 'appointment_reminder'
            });

          remindersSent++;
        } else {
          console.error('Failed to send reminder for booking:', booking.id);
        }

      } catch (error) {
        console.error('Error processing reminder for booking:', booking.id, error);
      }
    }

    // Clean up old reminder records (older than 30 days)
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await supabase
        .from('booking_reminders')
        .delete()
        .lt('sent_at', thirtyDaysAgo.toISOString());
    } catch (cleanupError) {
      console.warn('Error cleaning up old reminders:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalBookingsChecked: bookingsNeedingReminders?.length || 0,
          remindersSent,
          remindersSkipped,
          date: tomorrowStr
        }
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Daily reminder scheduler error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Reminder scheduling failed'
      }),
      {
        headers: { ...cors.headers, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})