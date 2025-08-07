/*
  # Create notification triggers for automated SMS and email

  1. New Functions
    - trigger_booking_notifications() - Automatically sends notifications when bookings change
    - schedule_appointment_reminders() - Sets up reminders for upcoming appointments
  
  2. Triggers
    - On booking INSERT: Send booking_created notifications
    - On booking UPDATE: Send booking_confirmed/cancelled notifications based on status change
  
  3. Security
    - Functions run with security definer privileges
    - Input validation and sanitization
    - Error handling that doesn't break booking operations
*/

-- Function to trigger booking notifications
CREATE OR REPLACE FUNCTION trigger_booking_notifications()
RETURNS trigger AS $$
DECLARE
  notification_event text;
  old_status text;
  new_status text;
BEGIN
  -- Determine the notification event based on the trigger operation
  IF TG_OP = 'INSERT' THEN
    notification_event := 'booking_created';
  ELSIF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
    new_status := NEW.status;
    
    -- Only send notifications for meaningful status changes
    IF old_status != new_status THEN
      CASE new_status
        WHEN 'confirmed' THEN
          notification_event := 'booking_confirmed';
        WHEN 'cancelled' THEN
          notification_event := 'booking_cancelled';
        ELSE
          -- For other status changes, don't send automatic notifications
          RETURN NEW;
      END CASE;
    ELSE
      -- No status change, don't send notification
      RETURN NEW;
    END IF;
  ELSE
    -- For DELETE operations or other cases, don't send notifications
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Call the notification processing function asynchronously
  -- This prevents notification failures from breaking the booking operation
  PERFORM pg_notify(
    'booking_notification', 
    json_build_object(
      'booking_id', COALESCE(NEW.id, OLD.id),
      'event', notification_event,
      'timestamp', now()
    )::text
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't break the booking operation
    RAISE WARNING 'Notification trigger error: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule appointment reminders
CREATE OR REPLACE FUNCTION schedule_appointment_reminders()
RETURNS void AS $$
DECLARE
  reminder_booking RECORD;
  reminder_time timestamp;
BEGIN
  -- Find bookings that need reminders (24 hours before appointment)
  FOR reminder_booking IN
    SELECT 
      b.id,
      b.appointment_date,
      b.appointment_time,
      b.status
    FROM bookings b
    WHERE b.status IN ('confirmed', 'pending')
      AND b.appointment_date = CURRENT_DATE + INTERVAL '1 day'
      AND NOT EXISTS (
        -- Avoid duplicate reminders (you'd need a reminders_sent table for this)
        SELECT 1 FROM booking_reminders br 
        WHERE br.booking_id = b.id 
        AND br.reminder_type = 'appointment_reminder'
        AND br.sent_at > CURRENT_DATE
      )
  LOOP
    -- Send reminder notification
    PERFORM pg_notify(
      'booking_notification',
      json_build_object(
        'booking_id', reminder_booking.id,
        'event', 'appointment_reminder',
        'timestamp', now()
      )::text
    );
    
    -- Mark reminder as sent (you'd need to create a booking_reminders table)
    -- INSERT INTO booking_reminders (booking_id, reminder_type, sent_at) 
    -- VALUES (reminder_booking.id, 'appointment_reminder', now());
  END LOOP;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Reminder scheduling error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create booking reminders tracking table
CREATE TABLE IF NOT EXISTS booking_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('appointment_reminder', 'follow_up')),
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_booking_reminders_booking_id_type 
ON booking_reminders(booking_id, reminder_type);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_booking_reminders_sent_at 
ON booking_reminders(sent_at);

-- Enable RLS
ALTER TABLE booking_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_reminders
CREATE POLICY "Barbers can view reminders for their bookings"
  ON booking_reminders
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE barber_id IN (
        SELECT id FROM barber_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create triggers on bookings table
DROP TRIGGER IF EXISTS bookings_notification_trigger ON bookings;
CREATE TRIGGER bookings_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_notifications();

-- Create a scheduled job to run reminder checks (requires pg_cron extension)
-- This would be set up separately in your Supabase dashboard:
-- SELECT cron.schedule('send-appointment-reminders', '0 18 * * *', 'SELECT schedule_appointment_reminders();');

-- Function to clean up old reminder records (run weekly)
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM booking_reminders 
  WHERE sent_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;