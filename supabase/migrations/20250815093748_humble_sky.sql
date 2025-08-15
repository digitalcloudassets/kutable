/*
  # Add unique constraint for barber_profiles.user_id

  1. Database Changes
    - Add unique constraint on `barber_profiles.user_id` column
    - This enables upsert operations using `on_conflict=user_id`
  
  2. Purpose
    - Fix "no unique or exclusion constraint matching the ON CONFLICT specification" error
    - Allow safe upsert operations for barber profile creation during onboarding
*/

-- Add unique constraint to user_id column in barber_profiles table
ALTER TABLE IF EXISTS public.barber_profiles 
ADD CONSTRAINT IF NOT EXISTS barber_profiles_user_id_unique UNIQUE (user_id);