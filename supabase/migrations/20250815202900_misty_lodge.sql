/*
  # Fix client_profiles RLS policies

  1. Security Updates
    - Ensure clients can SELECT, INSERT, and UPDATE their own profiles
    - Prevent clients from deleting their profiles
    - Allow proper upsert operations to prevent duplicate key errors

  2. Changes
    - Add missing RLS policies for client profile self-management
    - Fix permission issues that were causing 403 errors
*/

-- Ensure RLS is enabled
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first (if they exist)
DROP POLICY IF EXISTS "client_profiles_select_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_insert_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_update_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_no_delete" ON public.client_profiles;

-- Allow clients to SELECT their own profile
CREATE POLICY "client_profiles_select_own"
  ON public.client_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow clients to INSERT their own profile
CREATE POLICY "client_profiles_insert_own"
  ON public.client_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow clients to UPDATE their own profile
CREATE POLICY "client_profiles_update_own"
  ON public.client_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent clients from deleting their profiles (maintain business records)
CREATE POLICY "client_profiles_no_delete"
  ON public.client_profiles
  FOR DELETE
  TO authenticated
  USING (false);