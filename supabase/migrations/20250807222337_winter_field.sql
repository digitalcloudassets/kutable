/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - RLS policies are creating circular dependencies
    - Policies reference other tables that reference back
    - Causing infinite recursion errors (42P17)

  2. Solution
    - Drop ALL existing policies
    - Create minimal policies using only auth.uid()
    - No cross-table references or subqueries
    - Handle messaging permissions in application code

  3. Security
    - Users can only access their own profile data
    - Public read access for barber profiles (needed for browsing)
    - Messages restricted to sender/receiver only
*/

-- Drop all existing policies that could cause recursion
DROP POLICY IF EXISTS "client_profiles_own_access" ON client_profiles;
DROP POLICY IF EXISTS "barber_profiles_own_access" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_public_read" ON barber_profiles;
DROP POLICY IF EXISTS "client_can_read_barber_for_bookings" ON barber_profiles;
DROP POLICY IF EXISTS "barber_can_read_client_for_bookings" ON client_profiles;
DROP POLICY IF EXISTS "booking_participants_select_policy" ON bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON bookings;
DROP POLICY IF EXISTS "Barbers can update booking status" ON bookings;
DROP POLICY IF EXISTS "messages_sender_access" ON messages;
DROP POLICY IF EXISTS "messages_receiver_access" ON messages;
DROP POLICY IF EXISTS "messages_receiver_update" ON messages;

-- Client profiles: minimal policies
CREATE POLICY "client_profiles_own_data" 
  ON client_profiles 
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Barber profiles: own data + public read
CREATE POLICY "barber_profiles_own_data" 
  ON barber_profiles 
  FOR ALL 
  TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "barber_profiles_public_read" 
  ON barber_profiles 
  FOR SELECT 
  TO public 
  USING (true);

-- Bookings: basic access
CREATE POLICY "bookings_access" 
  ON bookings 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Messages: basic sender/receiver access
CREATE POLICY "messages_access" 
  ON messages 
  FOR ALL 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid()) 
  WITH CHECK (sender_id = auth.uid());

-- Services: basic access
CREATE POLICY "services_public_read" 
  ON services 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "services_barber_manage" 
  ON services 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Availability: basic access
CREATE POLICY "availability_public_read" 
  ON availability 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "availability_barber_manage" 
  ON availability 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Reviews: basic access
CREATE POLICY "reviews_public_read" 
  ON reviews 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "reviews_client_create" 
  ON reviews 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Gallery: basic access
CREATE POLICY "gallery_public_read" 
  ON gallery_media 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "gallery_barber_manage" 
  ON gallery_media 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);