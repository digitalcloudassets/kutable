/*
  # Fix messages table RLS policy

  1. Security Updates
    - Update the INSERT policy for the `messages` table to properly validate message participants
    - Ensure senders can only send messages as themselves
    - Ensure receivers are valid participants in the booking (either barber or client user_id)
    - Fix the policy logic to correctly reference user_id fields from barber_profiles and client_profiles

  2. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy with corrected logic
    - Policy validates that sender is authenticated user and receiver is valid booking participant
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert messages for their bookings only" ON messages;

-- Create a new INSERT policy with corrected logic
CREATE POLICY "Users can insert messages for their bookings only"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Sender must be the authenticated user
    sender_id = auth.uid()
    AND
    -- Booking must exist and user must be a participant
    EXISTS (
      SELECT 1 
      FROM bookings b
      JOIN barber_profiles bp ON b.barber_id = bp.id
      JOIN client_profiles cp ON b.client_id = cp.id
      WHERE b.id = booking_id
      AND (
        -- User is the barber and receiver is the client
        (bp.user_id = auth.uid() AND receiver_id = cp.user_id)
        OR
        -- User is the client and receiver is the barber
        (cp.user_id = auth.uid() AND receiver_id = bp.user_id)
      )
    )
  );