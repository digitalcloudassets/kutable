/*
  # Link Kutable Barber Profile to Demo User

  1. User Creation
     - Creates a demo user account for the Kutable barber profile
     - Links the existing barber profile to this user account
  
  2. Messaging Support
     - Enables bidirectional messaging between Pete Drake and Kutable
     - Allows barber dashboard to see client conversations
  
  3. Demo Configuration
     - Sets up proper user linkage for demo purposes
     - Maintains data integrity while enabling full messaging functionality
*/

-- First, let's check current state
DO $$
BEGIN
  RAISE NOTICE 'Current Kutable profile state:';
  PERFORM (
    SELECT CASE 
      WHEN user_id IS NULL THEN 'NO USER_ID LINKED'
      ELSE 'USER_ID: ' || user_id::text
    END
    FROM barber_profiles 
    WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5'
  );
END $$;

-- Create/update the demo user account for Kutable barber profile
-- Using a consistent demo user ID that we can reference
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at,
  email_change_token_new,
  email_change,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
)
VALUES (
  '12345678-1234-1234-1234-123456789012'::uuid, -- Fixed UUID for demo user
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'demo@kutable.com',
  '$2a$10$demohashedpasswordforthedemoaccount123', -- Demo password hash
  NOW(),
  NULL,
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Kutable", "last_name": "Demo", "user_type": "barber"}',
  FALSE,
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  0,
  NULL,
  '',
  NULL,
  FALSE,
  NULL,
  FALSE
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

-- Link the Kutable barber profile to this demo user
UPDATE barber_profiles 
SET 
  user_id = '12345678-1234-1234-1234-123456789012'::uuid,
  updated_at = NOW()
WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';

-- Ensure Pete Drake has proper client profile with demo user linkage
DO $$
DECLARE
  pete_client_id uuid;
BEGIN
  -- Check if Pete Drake client profile exists
  SELECT id INTO pete_client_id 
  FROM client_profiles 
  WHERE email = 'pete@petegdrake.com' OR first_name = 'Pete' AND last_name = 'Drake'
  LIMIT 1;

  IF pete_client_id IS NULL THEN
    -- Create Pete Drake client profile if it doesn't exist
    INSERT INTO client_profiles (
      id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      preferred_contact,
      communication_consent,
      sms_consent,
      email_consent,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      '87654321-4321-4321-4321-210987654321'::uuid, -- Demo client user ID
      'Pete',
      'Drake',
      'pete@petegdrake.com',
      '(907) 744-4718',
      'sms',
      true,
      true,
      true,
      NOW(),
      NOW()
    );
    
    pete_client_id := (SELECT id FROM client_profiles WHERE email = 'pete@petegdrake.com');
    RAISE NOTICE 'Created Pete Drake client profile: %', pete_client_id;
  ELSE
    -- Update existing profile to ensure proper linkage
    UPDATE client_profiles 
    SET 
      user_id = '87654321-4321-4321-4321-210987654321'::uuid,
      email = COALESCE(email, 'pete@petegdrake.com'),
      phone = COALESCE(phone, '(907) 744-4718'),
      communication_consent = true,
      sms_consent = true,
      email_consent = true,
      updated_at = NOW()
    WHERE id = pete_client_id;
    
    RAISE NOTICE 'Updated Pete Drake client profile: %', pete_client_id;
  END IF;

  -- Ensure there's a booking linking Pete to Kutable
  INSERT INTO bookings (
    id,
    barber_id,
    client_id,
    service_id,
    appointment_date,
    appointment_time,
    status,
    total_amount,
    deposit_amount,
    platform_fee,
    notes,
    created_at,
    updated_at
  ) VALUES (
    'demo-booking-pete-kutable-' || generate_random_uuid()::text,
    'e639f78f-abea-4a27-b995-f31032e25ab5', -- Kutable barber
    pete_client_id, -- Pete Drake client
    'demo-service-beard-trim',
    '2025-08-22', -- Friday
    '14:30:00',
    'confirmed',
    25.00,
    0.00,
    0.25,
    'Demo booking for messaging test',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    barber_id = EXCLUDED.barber_id,
    client_id = EXCLUDED.client_id,
    updated_at = NOW();

  RAISE NOTICE 'Demo booking created/updated for Pete Drake <-> Kutable';
END $$;

-- Verify the setup
DO $$
DECLARE
  kutable_user_id uuid;
  pete_client_id uuid;
  booking_count int;
BEGIN
  -- Check Kutable profile linkage
  SELECT user_id INTO kutable_user_id
  FROM barber_profiles 
  WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';
  
  -- Check Pete Drake profile
  SELECT id INTO pete_client_id
  FROM client_profiles 
  WHERE email = 'pete@petegdrake.com';
  
  -- Check booking linkage
  SELECT COUNT(*) INTO booking_count
  FROM bookings 
  WHERE barber_id = 'e639f78f-abea-4a27-b995-f31032e25ab5' 
    AND client_id = pete_client_id;

  RAISE NOTICE 'Setup verification:';
  RAISE NOTICE '  Kutable user_id: %', COALESCE(kutable_user_id::text, 'NULL');
  RAISE NOTICE '  Pete client_id: %', COALESCE(pete_client_id::text, 'NULL');
  RAISE NOTICE '  Bookings linking them: %', booking_count;
  
  IF kutable_user_id IS NOT NULL AND pete_client_id IS NOT NULL AND booking_count > 0 THEN
    RAISE NOTICE '✅ Demo messaging setup complete!';
  ELSE
    RAISE NOTICE '❌ Demo messaging setup incomplete - check the issues above';
  END IF;
END $$;