/*
  # Ensure unique constraint on barber_profiles.user_id

  1. Database Changes
    - Add unique constraint on `barber_profiles.user_id` if it doesn't exist
    - This enables upsert operations with `on_conflict=user_id`

  2. Purpose
    - Fixes the "there is no unique or exclusion constraint matching the ON CONFLICT specification" error
    - Allows barber onboarding to properly upsert profile records
*/

-- Add unique constraint on user_id if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'barber_profiles_user_id_key' 
    AND table_name = 'barber_profiles'
  ) THEN
    ALTER TABLE public.barber_profiles 
    ADD CONSTRAINT barber_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;