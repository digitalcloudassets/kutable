/*
  # Activate Kutable barber profile

  1. Updates
    - Set `is_active` to true for the Kutable barber profile
    - Set `status` to 'active' for better visibility
  
  2. Security
    - Uses specific profile ID to target only the Kutable profile
    - Safe idempotent update that won't affect other profiles
*/

-- Activate the Kutable barber profile
UPDATE barber_profiles 
SET 
  is_active = true,
  status = 'active',
  updated_at = now()
WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5'
  AND business_name = 'Kutable';

-- Verify the update was successful
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM barber_profiles 
    WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5' 
    AND is_active = true
  ) THEN
    RAISE NOTICE 'Kutable profile not found or not activated. Please check the profile ID.';
  ELSE
    RAISE NOTICE 'Kutable barber profile successfully activated!';
  END IF;
END $$;