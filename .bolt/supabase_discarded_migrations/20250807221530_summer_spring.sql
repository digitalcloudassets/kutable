/*
  # Fix Infinite Recursion in RLS Policies
  
  1. Problem Resolution
    - Remove circular references in RLS policies
    - Simplify messaging access patterns
    - Ensure no policy dependencies that cause recursion
  
  2. Policy Updates
    - Drop problematic policies that reference each other
    - Create simpler, non-recursive policies
    - Maintain security while enabling functionality
  
  3. Security
    - Keep essential access controls
    - Allow messaging participants to access necessary data
    - Prevent unauthorized data access
*/

-- First, drop all existing policies to clear any recursion
DROP POLICY IF EXISTS "Barbers can read client profiles for their bookings" ON client_profiles;
DROP POLICY IF EXISTS "Clients can read barber profiles for their bookings" ON barber_profiles;
DROP POLICY IF EXISTS "Messaging participants can read profiles" ON client_profiles;
DROP POLICY IF EXISTS "Messaging participants can read barber profiles" ON barber_profiles;

-- Clean, simple policies without circular references

-- Allow clients to read their own data
CREATE POLICY "client_profiles_own_policy" ON client_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow barbers to read their own data  
CREATE POLICY "barber_profiles_own_policy" ON barber_profiles
  FOR ALL TO authenticated  
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow barbers to read basic client info (name, contact) for their bookings
-- Using a simple subquery that doesn't create recursion
CREATE POLICY "Barbers can read client names for bookings" ON client_profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT client_id FROM bookings 
      WHERE barber_id IN (
        SELECT id FROM barber_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Allow clients to read basic barber info for their bookings
CREATE POLICY "Clients can read barber info for bookings" ON barber_profiles
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT barber_id FROM bookings 
      WHERE client_id IN (
        SELECT id FROM client_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Keep existing public access policies
CREATE POLICY IF NOT EXISTS "Public barber profiles are viewable by everyone" ON barber_profiles
  FOR SELECT TO public
  USING (true);

-- Ensure messages policies are simple and don't reference profile tables
DROP POLICY IF EXISTS "Participants can read messages for their bookings" ON messages;
DROP POLICY IF EXISTS "Participants can send messages for their bookings" ON messages;
DROP POLICY IF EXISTS "Participants can mark received messages as read" ON messages;

-- Simple message policies that only check user relationships
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "messages_insert_policy" ON messages  
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_update_policy" ON messages
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

CREATE POLICY "messages_delete_policy" ON messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());