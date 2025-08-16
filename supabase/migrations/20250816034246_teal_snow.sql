/*
  # Fix messaging profile access and service names

  1. Party-based profile access
    - Allow reading client/barber profiles when on shared bookings
    - Enables proper names and avatars in messaging UI
  
  2. Security
    - Users can only see profiles of people they have bookings with
    - Maintains data isolation while enabling messaging features
*/

-- Add read-only policies for client_profiles and barber_profiles
-- so parties on a booking can see each other's names/avatars

-- Client profiles: readable by booking parties
CREATE POLICY "read_client_profiles_party"
  ON client_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE (b.client_id = client_profiles.user_id OR b.barber_id = client_profiles.user_id)
        AND (b.client_id = auth.uid() OR b.barber_id = auth.uid())
    )
  );

-- Barber profiles: readable by booking parties
CREATE POLICY "read_barber_profiles_party"
  ON barber_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE (b.client_id = barber_profiles.user_id OR b.barber_id = barber_profiles.id)
        AND (b.client_id = auth.uid() OR b.barber_id = auth.uid())
    )
  );

-- Services: readable by anyone (needed for service names in conversations)
CREATE POLICY "services_read_all"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);