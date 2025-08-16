/*
  # Reset RLS policies for messaging system

  1. Security Changes
    - Reset all RLS policies to prevent recursion
    - Use non-recursive DAG for cross-table access
    - Ensure bookings and messages work for both barbers and clients
  
  2. Policy Structure
    - Bookings: accessible by booking parties (client_id for clients, barber_id for barbers)
    - Messages: accessible by sender and receiver
    - Profiles: public read for active profiles
*/

-- Reset bookings policies (non-recursive)
DROP POLICY IF EXISTS "bookings_insert_party" ON bookings;
DROP POLICY IF EXISTS "bookings_select_party" ON bookings;
DROP POLICY IF EXISTS "bookings_update_party" ON bookings;

-- Simple, non-recursive booking policies
CREATE POLICY "bookings_read_by_parties"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM barber_profiles WHERE id = bookings.barber_id
    )
  );

CREATE POLICY "bookings_insert_by_parties"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM barber_profiles WHERE id = bookings.barber_id
    )
  );

CREATE POLICY "bookings_update_by_parties"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM barber_profiles WHERE id = bookings.barber_id
    )
  )
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM barber_profiles WHERE id = bookings.barber_id
    )
  );

-- Reset messages policies (non-recursive)
DROP POLICY IF EXISTS "messages_insert_party" ON messages;
DROP POLICY IF EXISTS "messages_select_party" ON messages;
DROP POLICY IF EXISTS "messages_update_party" ON messages;

-- Simple messages policies using direct user_id comparison
CREATE POLICY "messages_read_by_participants"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "messages_insert_by_sender"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages_update_by_receiver"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Reset barber profiles policies (simple public read)
DROP POLICY IF EXISTS "anon_can_read_active_barbers" ON barber_profiles;
DROP POLICY IF EXISTS "auth_can_read_active_barbers" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_insert_own" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_public_view" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_select_own" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_update_own" ON barber_profiles;
DROP POLICY IF EXISTS "barbers_read_public" ON barber_profiles;
DROP POLICY IF EXISTS "read_barber_profiles_public" ON barber_profiles;

-- Simple barber profile policies
CREATE POLICY "barber_profiles_public_read"
  ON barber_profiles FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "barber_profiles_owner_manage"
  ON barber_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reset client profiles policies (simple own access)
DROP POLICY IF EXISTS "client_profiles_insert_own" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_select_own" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_update_own" ON client_profiles;
DROP POLICY IF EXISTS "read_client_profiles_party" ON client_profiles;

-- Simple client profile policies
CREATE POLICY "client_profiles_owner_manage"
  ON client_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow barbers to read client profiles for their bookings
CREATE POLICY "client_profiles_read_for_bookings"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT client_id FROM bookings 
      WHERE barber_id IN (
        SELECT id FROM barber_profiles WHERE user_id = auth.uid()
      )
    )
  );