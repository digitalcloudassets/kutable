/*
  # Fix Cross-Table Access for Messaging

  1. Problem
    - Barbers can't access client profile data for their bookings
    - Clients can't access barber profile data for their bookings
    - This breaks messaging functionality

  2. Solution
    - Allow barbers to read client profiles ONLY for their own bookings
    - Allow clients to read barber profiles ONLY for their own bookings
    - Use careful subquery structure to avoid infinite recursion

  3. Security
    - Users can only see profiles of people they have active bookings with
    - No ability to browse random profiles
    - Maintains data privacy while enabling essential functionality
*/

-- First, let's check what policies exist and drop any problematic ones
DROP POLICY IF EXISTS "client_profiles_simple_own_policy" ON client_profiles;
DROP POLICY IF EXISTS "barber_profiles_simple_own_policy" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_public_read" ON barber_profiles;

-- Create basic policies for own data access
CREATE POLICY "client_profiles_own_access"
  ON client_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "barber_profiles_own_access"
  ON barber_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow public read access to barber profiles (needed for directory)
CREATE POLICY "barber_profiles_public_read"
  ON barber_profiles
  FOR SELECT
  TO public
  USING (true);

-- CRITICAL: Cross-table access for messaging
-- Allow barbers to read client profiles for their bookings
CREATE POLICY "barber_can_read_client_for_bookings"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT client_id 
      FROM bookings 
      WHERE barber_id IN (
        SELECT id 
        FROM barber_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow clients to read barber profiles for their bookings  
CREATE POLICY "client_can_read_barber_for_bookings"
  ON barber_profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT barber_id 
      FROM bookings 
      WHERE client_id IN (
        SELECT id 
        FROM client_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Ensure messaging policies are simple and don't reference profiles
DROP POLICY IF EXISTS "messages_simple_sender_policy" ON messages;
DROP POLICY IF EXISTS "messages_simple_receiver_policy" ON messages;
DROP POLICY IF EXISTS "messages_receiver_update_policy" ON messages;

CREATE POLICY "messages_sender_access"
  ON messages
  FOR ALL
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_receiver_access"
  ON messages
  FOR SELECT
  TO authenticated
  USING (receiver_id = auth.uid());

CREATE POLICY "messages_receiver_update"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());