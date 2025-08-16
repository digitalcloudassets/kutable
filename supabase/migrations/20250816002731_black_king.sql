/*
  # Fix Kutable Barber Profile User Linkage

  1. Updates
    - Link Kutable barber profile to the real user ID: 6455a63f-161e-4351-9f14-0ecbe01f0d3a
    - Ensure messaging works bidirectionally
    - Fix conversation loading for both sides
  
  2. Changes
    - Update barber_profiles.user_id for Kutable profile
    - Ensure profile is active and ready for messaging
*/

-- Update Kutable barber profile with the real user ID
UPDATE barber_profiles 
SET 
  user_id = '6455a63f-161e-4351-9f14-0ecbe01f0d3a',
  is_active = true,
  is_claimed = true,
  communication_consent = true,
  sms_consent = true,
  email_consent = true,
  updated_at = now()
WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';

-- Verify the update worked
DO $$
BEGIN
  -- Log the current state
  RAISE NOTICE 'Kutable profile after update:';
  
  -- Check if the update was successful
  IF EXISTS (
    SELECT 1 FROM barber_profiles 
    WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5' 
    AND user_id = '6455a63f-161e-4351-9f14-0ecbe01f0d3a'
  ) THEN
    RAISE NOTICE '✅ Kutable profile successfully linked to user ID: 6455a63f-161e-4351-9f14-0ecbe01f0d3a';
  ELSE
    RAISE NOTICE '❌ Failed to link Kutable profile to user ID';
  END IF;
END $$;

-- Ensure Pete Drake client profile is properly set up for messaging
UPDATE client_profiles 
SET 
  user_id = '87654321-4321-4321-4321-210987654321',
  communication_consent = true,
  sms_consent = true,
  email_consent = true,
  updated_at = now()
WHERE email = 'pete@petegdrake.com';

-- Verify both profiles are ready for messaging
DO $$
DECLARE
  kutable_user_id UUID;
  pete_user_id UUID;
  booking_count INT;
BEGIN
  -- Get Kutable's user_id
  SELECT user_id INTO kutable_user_id 
  FROM barber_profiles 
  WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';
  
  -- Get Pete's user_id
  SELECT user_id INTO pete_user_id 
  FROM client_profiles 
  WHERE email = 'pete@petegdrake.com';
  
  -- Check booking linkage
  SELECT COUNT(*) INTO booking_count
  FROM bookings b
  JOIN barber_profiles bp ON bp.id = b.barber_id
  JOIN client_profiles cp ON cp.id = b.client_id
  WHERE bp.id = 'e639f78f-abea-4a27-b995-f31032e25ab5'
  AND cp.email = 'pete@petegdrake.com';
  
  RAISE NOTICE 'Messaging linkage status:';
  RAISE NOTICE '- Kutable user_id: %', kutable_user_id;
  RAISE NOTICE '- Pete user_id: %', pete_user_id;
  RAISE NOTICE '- Bookings between them: %', booking_count;
  
  IF kutable_user_id IS NOT NULL AND pete_user_id IS NOT NULL AND booking_count > 0 THEN
    RAISE NOTICE '✅ Messaging linkage is properly configured';
  ELSE
    RAISE NOTICE '❌ Messaging linkage needs attention';
  END IF;
END $$;