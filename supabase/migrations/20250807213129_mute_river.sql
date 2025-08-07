/*
  # Add profile image support for client profiles

  1. Schema Changes
    - Add `profile_image_url` column to `client_profiles` table
    - Allow clients to upload and display profile images

  2. Security
    - Maintain existing RLS policies
    - No additional policies needed as existing policies cover new column
*/

-- Add profile_image_url column to client_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_profiles' AND column_name = 'profile_image_url'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN profile_image_url text;
  END IF;
END $$;