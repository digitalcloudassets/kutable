/*
  # Client Profiles RLS Policies

  1. Security
    - Enable RLS on client_profiles table
    - Allow clients to SELECT their own profile
    - Allow clients to INSERT their own profile  
    - Allow clients to UPDATE their own profile
    - Prevent unauthorized access to other users' profiles

  2. Notes
    - Policies use auth.uid() to ensure users can only access their own data
    - WITH CHECK ensures user_id must match authenticated user on inserts/updates
*/

-- Ensure RLS is enabled
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- Allow a logged-in user to SELECT their own row
CREATE POLICY "client_profiles_select_own"
  ON public.client_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow a logged-in user to INSERT their own row
CREATE POLICY "client_profiles_insert_own"
  ON public.client_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow a logged-in user to UPDATE their own row
CREATE POLICY "client_profiles_update_own"
  ON public.client_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Prevent deletes by clients (keep data for business records)
CREATE POLICY "client_profiles_no_delete" 
  ON public.client_profiles 
  FOR DELETE 
  TO authenticated 
  USING (false);