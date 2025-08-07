/*
  # Fix messaging RLS policies for cross-user access

  1. New Policies
    - Allow barbers to read client profiles for their bookings
    - Allow clients to read barber profiles for their bookings
  
  2. Security
    - Maintain privacy - only allow access through valid bookings
    - Prevent unauthorized profile access
*/

-- Allow barbers to read client profiles for their bookings
CREATE POLICY "Barbers can read client profiles for their bookings"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT client_id 
      FROM bookings 
      WHERE barber_id IN (
        SELECT id 
        FROM barber_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow clients to read barber profiles for their bookings  
CREATE POLICY "Clients can read barber profiles for their bookings"
  ON barber_profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT barber_id 
      FROM bookings 
      WHERE client_id IN (
        SELECT id 
        FROM client_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow participants to read messages for their bookings
CREATE POLICY "Participants can read messages for their bookings"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id
      FROM bookings
      WHERE 
        barber_id IN (
          SELECT id 
          FROM barber_profiles 
          WHERE user_id = auth.uid()
        )
        OR 
        client_id IN (
          SELECT id 
          FROM client_profiles 
          WHERE user_id = auth.uid()
        )
    )
  );

-- Allow participants to insert messages for their bookings
CREATE POLICY "Participants can send messages for their bookings"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND booking_id IN (
      SELECT id
      FROM bookings
      WHERE 
        barber_id IN (
          SELECT id 
          FROM barber_profiles 
          WHERE user_id = auth.uid()
        )
        OR 
        client_id IN (
          SELECT id 
          FROM client_profiles 
          WHERE user_id = auth.uid()
        )
    )
  );

-- Allow participants to update messages they received (for read receipts)
CREATE POLICY "Participants can mark received messages as read"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());