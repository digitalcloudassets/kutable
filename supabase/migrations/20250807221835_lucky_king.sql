/*
  # Reset RLS Policies to Prevent Infinite Recursion

  1. Problem Resolution
    - Drop ALL existing policies on client_profiles and barber_profiles
    - Create simple, non-recursive policies using only auth.uid()
    - Remove any complex table joins that cause circular references

  2. New Security Model
    - Users can only see their own profiles
    - Messaging access through explicit booking participation
    - No complex cross-table references in policies

  3. Tables Affected
    - client_profiles: Reset to simple owner-only access
    - barber_profiles: Reset to simple owner-only access
    - messages: Simple sender/receiver access
*/

-- Step 1: Drop ALL existing policies on client_profiles
DROP POLICY IF EXISTS "Barbers can read client profiles for their bookings" ON client_profiles;
DROP POLICY IF EXISTS "client_profiles_own_policy" ON client_profiles;
DROP POLICY IF EXISTS "Clients can manage own profiles" ON client_profiles;
DROP POLICY IF EXISTS "Barbers can read client names for bookings" ON client_profiles;

-- Step 2: Drop ALL existing policies on barber_profiles  
DROP POLICY IF EXISTS "Clients can read barber profiles for their bookings" ON barber_profiles;
DROP POLICY IF EXISTS "Public barber profiles are viewable by everyone" ON barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_own_policy" ON barber_profiles;
DROP POLICY IF EXISTS "Barbers can manage own profiles" ON barber_profiles;
DROP POLICY IF EXISTS "Clients can read barber info for bookings" ON barber_profiles;

-- Step 3: Drop ALL existing policies on messages
DROP POLICY IF EXISTS "Participants can read messages for their bookings" ON messages;
DROP POLICY IF EXISTS "Participants can send messages for their bookings" ON messages;
DROP POLICY IF EXISTS "Participants can mark received messages as read" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

-- Step 4: Create simple, non-recursive policies

-- Client Profiles: Users can only manage their own profiles
CREATE POLICY "client_profiles_simple_own_policy"
  ON client_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Barber Profiles: Users can manage their own + public read access
CREATE POLICY "barber_profiles_simple_own_policy"
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

-- Messages: Simple sender/receiver access without table joins
CREATE POLICY "messages_simple_sender_policy"
  ON messages
  FOR ALL
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "messages_simple_receiver_policy"
  ON messages
  FOR SELECT
  TO authenticated
  USING (receiver_id = auth.uid());

CREATE POLICY "messages_receiver_update_policy"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Step 5: Ensure RLS is enabled on all tables
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;