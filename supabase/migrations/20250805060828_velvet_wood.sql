/*
  # Add banner image field to barber profiles

  1. New Columns
    - `banner_image_url` (text, nullable) - Separate banner/header image for profile pages
  
  2. Purpose
    - Allows barbers to have different images for banner (shop exterior) and profile (face/work)
    - Provides better visual separation and professional presentation
    - Falls back to profile image if banner not set
*/

-- Add banner image field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barber_profiles' AND column_name = 'banner_image_url'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN banner_image_url text;
  END IF;
END $$;