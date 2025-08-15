/*
  # Break RLS Recursion and Tighten Policies

  1. Remove Recursive Policies
    - Drop any client_profiles policies that reference bookings
    - Drop any cross-table lookups that cause 42P17 errors
    - Keep simple owner-only policies

  2. Simple Security Model
    - client_profiles: users can only access their own data
    - barber_profiles: users can only access their own data  
    - bookings: users can access bookings tied to their profiles
    - No recursive cross-references

  3. Clean Indexes
    - Ensure unique constraints exist for user_id columns
*/

-- CLIENT PROFILES: Owner-only, no cross-table refs
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "anon_can_read_active_barbers" ON public.client_profiles;
DROP POLICY IF EXISTS "auth_can_read_active_barbers" ON public.client_profiles;
DROP POLICY IF EXISTS "barber_profiles_insert_own" ON public.client_profiles;
DROP POLICY IF EXISTS "barber_profiles_select_own" ON public.client_profiles;
DROP POLICY IF EXISTS "barber_profiles_update_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_admin_access" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_insert_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_no_delete" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_own_insert" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_own_select" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_own_update" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_select_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_update_own" ON public.client_profiles;
DROP POLICY IF EXISTS "barbers_can_read_clients_for_bookings" ON public.client_profiles;
DROP POLICY IF EXISTS "clients can select own profile" ON public.client_profiles;
DROP POLICY IF EXISTS "clients can update own profile" ON public.client_profiles;
DROP POLICY IF EXISTS "clients can upsert own profile" ON public.client_profiles;

-- Simple owner-only policies for client_profiles
CREATE POLICY "client_profiles_select_own"
  ON public.client_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "client_profiles_insert_own"
  ON public.client_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "client_profiles_update_own"
  ON public.client_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- BARBER PROFILES: Owner-only + public listing
ALTER TABLE public.barber_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing recursive policies
DROP POLICY IF EXISTS "barber_simple_own_data" ON public.barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_select_own" ON public.barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_insert_own" ON public.barber_profiles;
DROP POLICY IF EXISTS "barber_profiles_update_own" ON public.barber_profiles;

-- Simple owner-only policies for barber_profiles
CREATE POLICY "barber_profiles_select_own"
  ON public.barber_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "barber_profiles_insert_own"
  ON public.barber_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "barber_profiles_update_own"
  ON public.barber_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Public can view active barber profiles for the directory
CREATE POLICY "barber_profiles_public_view"
  ON public.barber_profiles FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- BOOKINGS: No recursive policies, simple ownership
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "bookings_simple_authenticated" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;

-- Simple booking access: user can see bookings where they are client or barber
CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    client_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid())
    OR
    barber_id IN (SELECT id FROM public.barber_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid())
    OR
    barber_id IN (SELECT id FROM public.barber_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings_update_own"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (
    client_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid())
    OR
    barber_id IN (SELECT id FROM public.barber_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid())
    OR
    barber_id IN (SELECT id FROM public.barber_profiles WHERE user_id = auth.uid())
  );

-- Ensure unique constraints exist
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_profiles_user ON public.client_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_barber_profiles_user ON public.barber_profiles(user_id);