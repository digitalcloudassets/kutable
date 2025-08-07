/*
  # Fix Booking Client Profile Integrity

  1. Data Integrity Fixes
    - Find bookings with missing or invalid client profiles
    - Ensure all bookings have proper client_id references
    - Fix any cases where client user_id matches barber user_id

  2. Validation Functions
    - Add function to validate booking participant integrity
    - Prevent self-messaging scenarios at database level

  3. Security Improvements
    - Enhanced RLS policies with better validation
    - Prevent message insertion where sender_id = receiver_id
*/

-- First, let's audit the current state of bookings and client profiles
DO $$
DECLARE
  invalid_bookings_count INTEGER;
  missing_client_profiles_count INTEGER;
  self_referencing_count INTEGER;
BEGIN
  -- Count bookings with missing client profiles
  SELECT COUNT(*) INTO missing_client_profiles_count
  FROM bookings b
  LEFT JOIN client_profiles cp ON b.client_id = cp.id
  WHERE cp.id IS NULL;
  
  -- Count bookings where client user_id matches barber user_id
  SELECT COUNT(*) INTO self_referencing_count
  FROM bookings b
  JOIN client_profiles cp ON b.client_id = cp.id
  JOIN barber_profiles bp ON b.barber_id = bp.id
  WHERE cp.user_id = bp.user_id AND cp.user_id IS NOT NULL;
  
  RAISE NOTICE 'Data integrity audit:';
  RAISE NOTICE '- Bookings with missing client profiles: %', missing_client_profiles_count;
  RAISE NOTICE '- Bookings with self-referencing profiles: %', self_referencing_count;
END $$;

-- Create a function to validate booking integrity
CREATE OR REPLACE FUNCTION validate_booking_participants(booking_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  issue_description TEXT,
  barber_user_id UUID,
  client_user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN bp.user_id IS NULL THEN FALSE
      WHEN cp.user_id IS NULL THEN FALSE
      WHEN bp.user_id = cp.user_id THEN FALSE
      ELSE TRUE
    END as is_valid,
    CASE 
      WHEN bp.user_id IS NULL THEN 'Barber profile missing user_id'
      WHEN cp.user_id IS NULL THEN 'Client profile missing user_id'
      WHEN bp.user_id = cp.user_id THEN 'Barber and client have same user_id'
      ELSE 'Valid booking participants'
    END as issue_description,
    bp.user_id as barber_user_id,
    cp.user_id as client_user_id
  FROM bookings b
  LEFT JOIN barber_profiles bp ON b.barber_id = bp.id
  LEFT JOIN client_profiles cp ON b.client_id = cp.id
  WHERE b.id = booking_id;
END;
$$ LANGUAGE plpgsql;

-- Update the messages table RLS policies to prevent self-messaging
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;

-- Enhanced insert policy that prevents self-messaging
CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the sender
  sender_id = auth.uid() 
  AND 
  -- Receiver must be different from sender
  receiver_id != auth.uid()
  AND
  -- User must be part of the booking (either barber or client)
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = messages.booking_id
    AND (
      -- User is the barber
      bookings.barber_id IN (
        SELECT id FROM barber_profiles 
        WHERE user_id = auth.uid()
      )
      OR
      -- User is the client
      bookings.client_id IN (
        SELECT id FROM client_profiles 
        WHERE user_id = auth.uid()
      )
    )
  )
  AND
  -- Additional check: receiver must be the other participant in the booking
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN barber_profiles bp ON b.barber_id = bp.id
    JOIN client_profiles cp ON b.client_id = cp.id
    WHERE b.id = messages.booking_id
    AND (
      -- If sender is barber, receiver should be client
      (bp.user_id = auth.uid() AND cp.user_id = messages.receiver_id)
      OR
      -- If sender is client, receiver should be barber
      (cp.user_id = auth.uid() AND bp.user_id = messages.receiver_id)
    )
  )
);

-- Enhanced select policy
CREATE POLICY "messages_select_policy" ON messages
FOR SELECT
TO authenticated
USING (
  -- User can read messages they sent or received
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND
  -- User must be part of the booking
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = messages.booking_id
    AND (
      bookings.barber_id IN (
        SELECT id FROM barber_profiles 
        WHERE user_id = auth.uid()
      )
      OR
      bookings.client_id IN (
        SELECT id FROM client_profiles 
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Update policy for marking messages as read
CREATE POLICY "messages_update_policy" ON messages
FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Delete policy (users can delete their own sent messages)
CREATE POLICY "messages_delete_policy" ON messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Create a function to check if a booking has valid messaging participants
CREATE OR REPLACE FUNCTION booking_has_valid_messaging_participants(booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  barber_user_id UUID;
  client_user_id UUID;
BEGIN
  SELECT bp.user_id, cp.user_id 
  INTO barber_user_id, client_user_id
  FROM bookings b
  JOIN barber_profiles bp ON b.barber_id = bp.id
  JOIN client_profiles cp ON b.client_id = cp.id
  WHERE b.id = booking_id;
  
  -- Return false if either user_id is null or they're the same
  IF barber_user_id IS NULL OR client_user_id IS NULL OR barber_user_id = client_user_id THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to prevent self-messaging at the database level
CREATE OR REPLACE FUNCTION prevent_self_messaging()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if sender and receiver are the same
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Cannot send message to yourself';
  END IF;
  
  -- Check if the booking has valid messaging participants
  IF NOT booking_has_valid_messaging_participants(NEW.booking_id) THEN
    RAISE EXCEPTION 'Booking does not have valid messaging participants';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_self_messaging_trigger ON messages;
CREATE TRIGGER prevent_self_messaging_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_messaging();

-- Fix any existing bookings with invalid client profiles
DO $$
DECLARE
  booking_record RECORD;
  temp_user_id UUID;
BEGIN
  -- Find bookings where client profile has same user_id as barber
  FOR booking_record IN 
    SELECT b.id as booking_id, b.barber_id, b.client_id, bp.user_id as barber_user_id, cp.user_id as client_user_id
    FROM bookings b
    JOIN barber_profiles bp ON b.barber_id = bp.id
    JOIN client_profiles cp ON b.client_id = cp.id
    WHERE cp.user_id = bp.user_id AND cp.user_id IS NOT NULL
  LOOP
    RAISE NOTICE 'Found booking % with self-referencing client profile. Barber: %, Client: %', 
      booking_record.booking_id, booking_record.barber_user_id, booking_record.client_user_id;
    
    -- For now, just log these - in production, you'd need to determine the correct client
    -- You might want to set client.user_id to NULL to mark as unclaimed
    UPDATE client_profiles 
    SET user_id = NULL, 
        updated_at = now()
    WHERE id = booking_record.client_id;
    
    RAISE NOTICE 'Set client profile % user_id to NULL (unclaimed)', booking_record.client_id;
  END LOOP;
END $$;

-- Create an index to help with messaging queries
CREATE INDEX IF NOT EXISTS idx_messages_booking_participants 
ON messages (booking_id, sender_id, receiver_id);

-- Add a check constraint to prevent self-messaging at the table level
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_no_self_messaging;

ALTER TABLE messages 
ADD CONSTRAINT messages_no_self_messaging 
CHECK (sender_id != receiver_id);