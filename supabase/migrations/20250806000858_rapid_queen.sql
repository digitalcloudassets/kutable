/*
  # Add Consent Management Columns

  1. New Columns Added
    - `barber_profiles` table:
      - `communication_consent` (boolean) - Marketing communications opt-in
      - `sms_consent` (boolean) - SMS notifications opt-in  
      - `email_consent` (boolean) - Email notifications opt-in
      - `consent_date` (timestamp) - When consent was first given
      - `consent_updated_at` (timestamp) - Last consent update time
    
    - `client_profiles` table:
      - `communication_consent` (boolean) - Marketing communications opt-in
      - `sms_consent` (boolean) - SMS notifications opt-in
      - `email_consent` (boolean) - Email notifications opt-in  
      - `consent_date` (timestamp) - When consent was first given
      - `consent_updated_at` (timestamp) - Last consent update time

  2. Security
    - All existing RLS policies remain intact
    - Consent columns follow same access patterns as parent tables

  3. Notes
    - Default values set to false for proper opt-in compliance
    - Timestamps allow tracking consent changes for compliance
*/

-- Add consent columns to barber_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barber_profiles' AND column_name = 'communication_consent'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN communication_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barber_profiles' AND column_name = 'sms_consent'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN sms_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barber_profiles' AND column_name = 'email_consent'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN email_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barber_profiles' AND column_name = 'consent_date'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN consent_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barber_profiles' AND column_name = 'consent_updated_at'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN consent_updated_at timestamptz;
  END IF;
END $$;

-- Add consent columns to client_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_profiles' AND column_name = 'communication_consent'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN communication_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_profiles' AND column_name = 'sms_consent'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN sms_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_profiles' AND column_name = 'email_consent'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN email_consent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_profiles' AND column_name = 'consent_date'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN consent_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_profiles' AND column_name = 'consent_updated_at'
  ) THEN
    ALTER TABLE client_profiles ADD COLUMN consent_updated_at timestamptz;
  END IF;
END $$;