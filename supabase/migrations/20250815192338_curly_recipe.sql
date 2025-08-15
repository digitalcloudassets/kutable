/*
  # Add is_admin column to profile tables

  1. New Columns
    - Add `is_admin` boolean column to `barber_profiles` table
    - Add `is_admin` boolean column to `client_profiles` table
    - Default to false for security

  2. Security
    - Only computed server-side using ADMIN_UIDS and ADMIN_EMAILS
    - Not exposed to client environment variables
*/

-- Add is_admin column to barber_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barber_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Add is_admin column to client_profiles  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_barber_profiles_is_admin ON barber_profiles (is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_client_profiles_is_admin ON client_profiles (is_admin) WHERE is_admin = true;