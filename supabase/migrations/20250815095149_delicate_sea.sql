/*
  # Add unique constraint for barber_profiles.user_id

  1. Database Changes
    - Add unique constraint on `barber_profiles.user_id` column
    - This enables upsert operations using `on_conflict=user_id`

  2. Purpose
    - Fixes the onboarding engine upsert operation
    - Ensures each user can only have one barber profile
*/

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'barber_profiles_user_id_key'
    AND table_name = 'barber_profiles'
    AND constraint_type = 'UNIQUE'
  ) THEN
    ALTER TABLE barber_profiles 
    ADD CONSTRAINT barber_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;