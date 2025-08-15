/*
  # Finalize client profiles RLS policies
  
  1. Security
    - Enable RLS on client_profiles table
    - Add policies for clients to manage their own data
    - Prevent unauthorized access between users
  
  2. Changes
    - Clients can select, insert, and update their own profiles
    - No delete permissions to maintain business records
    - Policies use auth.uid() for security
*/

-- Ensure RLS is enabled
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies first (if they exist)
DROP POLICY IF EXISTS "client_profiles_select_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_insert_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_update_own" ON public.client_profiles;
DROP POLICY IF EXISTS "client_profiles_no_delete" ON public.client_profiles;

-- Allow clients to select their own profile
CREATE POLICY "client_profiles_select_own"
  ON public.client_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow clients to insert their own profile
CREATE POLICY "client_profiles_insert_own"
  ON public.client_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow clients to update their own profile
CREATE POLICY "client_profiles_update_own"
  ON public.client_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent clients from deleting profiles (maintain business records)
CREATE POLICY "client_profiles_no_delete"
  ON public.client_profiles
  FOR DELETE
  TO authenticated
  USING (false);