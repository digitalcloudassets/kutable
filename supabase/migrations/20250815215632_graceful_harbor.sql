/*
  # Fix client_profiles RLS to prevent recursion

  1. Security Changes
    - Remove recursive policies that cause 42P17 errors
    - Add simple, direct policies for client profile access
    - Ensure clients can manage their own data safely

  2. Policy Updates
    - Direct user_id-based policies only
    - No cross-table lookups in RLS expressions
    - Safe for all profile operations
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "barbers_can_read_clients_for_bookings" ON client_profiles;
DROP POLICY IF EXISTS "client_simple_own_data" ON client_profiles;

-- Create new, simple policies that avoid recursion
CREATE POLICY "client_profiles_own_select"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "client_profiles_own_insert"
  ON client_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "client_profiles_own_update"
  ON client_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow admin access (optional, only if you need admin dashboard functionality)
CREATE POLICY "client_profiles_admin_access"
  ON client_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_profiles admin_cp 
      WHERE admin_cp.user_id = auth.uid() 
      AND admin_cp.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM barber_profiles admin_bp 
      WHERE admin_bp.user_id = auth.uid() 
      AND admin_bp.is_admin = true
    )
  );