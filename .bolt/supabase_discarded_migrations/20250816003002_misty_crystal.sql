/*
  # Fix Kutable barber profile with correct user ID

  1. Updates
    - Update Kutable barber profile to use correct user_id
    - Ensure profile is properly configured for messaging
    - Verify communication settings

  2. Data integrity
    - Use the actual auth user_id instead of profile id
    - Maintain existing profile data
    - Enable messaging functionality
*/

-- Update Kutable barber profile with the correct user_id
UPDATE barber_profiles 
SET 
  user_id = 'ce680847-f679-4d7f-a01a-5f895872f174',
  is_active = true,
  is_claimed = true,
  status = 'active',
  communication_consent = true,
  sms_consent = true,
  email_consent = true,
  consent_date = now(),
  consent_updated_at = now(),
  updated_at = now()
WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';

-- Verify the update
DO $$
BEGIN
  -- Log the current state
  IF EXISTS (
    SELECT 1 FROM barber_profiles 
    WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5' 
    AND user_id = 'ce680847-f679-4d7f-a01a-5f895872f174'
  ) THEN
    RAISE NOTICE 'SUCCESS: Kutable barber profile linked to user ID ce680847-f679-4d7f-a01a-5f895872f174';
  ELSE
    RAISE NOTICE 'WARNING: Kutable profile update may have failed';
  END IF;
END $$;