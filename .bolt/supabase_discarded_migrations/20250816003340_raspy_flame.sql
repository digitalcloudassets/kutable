/*
  # Fix messaging RLS policies and add index

  1. RLS Policies
    - Allow both booking participants to read/write messages
    - Use booking_id as the thread key
    - Support both client and barber access

  2. Performance Index
    - Add index on booking_id and created_at for fast message loading

  3. Security
    - Ensure only booking participants can access messages
    - Prevent unauthorized message access
*/

-- Drop existing message policies to replace with booking-based ones
DROP POLICY IF EXISTS "booking participants can read messages" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_by_sender" ON public.messages;
DROP POLICY IF EXISTS "messages_mark_read_by_receiver" ON public.messages;
DROP POLICY IF EXISTS "messages_read_by_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_update_by_receiver" ON public.messages;

-- Create new RLS policies based on booking participation
CREATE POLICY "messages_select_by_booking_parties"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    LEFT JOIN public.barber_profiles bp ON bp.id = b.barber_id
    LEFT JOIN public.client_profiles cp ON cp.id = b.client_id
    WHERE b.id = messages.booking_id
      AND (
        cp.user_id = auth.uid()        -- the client
        OR bp.user_id = auth.uid()     -- the barber
      )
  )
);

-- Allow INSERT for booking participants
CREATE POLICY "messages_insert_by_booking_parties"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    LEFT JOIN public.barber_profiles bp ON bp.id = b.barber_id
    LEFT JOIN public.client_profiles cp ON cp.id = b.client_id
    WHERE b.id = new.booking_id
      AND (
        cp.user_id = auth.uid()        -- the client
        OR bp.user_id = auth.uid()     -- the barber
      )
  )
);

-- Allow UPDATE for message receivers (to mark as read)
CREATE POLICY "messages_update_read_by_receiver"
ON public.messages
FOR UPDATE
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Add performance index for fast message loading by booking
CREATE INDEX IF NOT EXISTS idx_messages_booking_created
ON public.messages (booking_id, created_at);

-- Ensure messages table has RLS enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;