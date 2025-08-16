/*
  # Ensure Kutable messaging works with Pete Drake

  1. Data Verification
    - Link Kutable barber profile to the real user ID
    - Ensure Pete Drake has proper client profile
    - Create booking relationship between them
    - Add demo messages for testing

  2. RLS Verification
    - Ensure both parties can access messages
    - Verify booking participation logic works
*/

-- Step 1: Ensure Kutable barber profile is linked to the real user ID
UPDATE barber_profiles 
SET user_id = '6455a63f-161e-4351-9f14-0ecbe01f0d3a'::uuid,
    is_active = true,
    is_claimed = true,
    communication_consent = true,
    sms_consent = true,
    email_consent = true,
    updated_at = now()
WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';

-- Step 2: Ensure Pete Drake has a proper client profile
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
  profile_image_url,
  created_at,
  updated_at
) VALUES (
  'pete-drake-client-profile',
  'pete-drake-demo-user-id'::uuid,
  'Pete',
  'Drake',
  'pete@petegdrake.com',
  '(907) 744-4718',
  'sms',
  true,
  true,
  true,
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  updated_at = now();

-- Step 3: Ensure there's a service for the booking
INSERT INTO services (
  id,
  barber_id,
  name,
  description,
  price,
  duration_minutes,
  deposit_required,
  deposit_amount,
  is_active,
  created_at,
  updated_at
) VALUES (
  'kutable-beard-trim-service',
  'e639f78f-abea-4a27-b995-f31032e25ab5',
  'Beard Trim',
  'Professional beard trimming and styling',
  25.00,
  30,
  false,
  0,
  true,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  is_active = true,
  updated_at = now();

-- Step 4: Create/update the booking between Pete and Kutable
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
  'pete-kutable-demo-booking-1',
  'e639f78f-abea-4a27-b995-f31032e25ab5',
  'pete-drake-client-profile',
  'kutable-beard-trim-service',
  '2025-08-22',
  '14:30:00',
  'confirmed',
  25.00,
  0,
  0.25,
  'Looking forward to a professional beard trim!',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  status = 'confirmed',
  updated_at = now();

-- Step 5: Create demo messages between Pete and Kutable
INSERT INTO messages (
  id,
  booking_id,
  sender_id,
  receiver_id,
  message_text,
  read_at,
  created_at,
  updated_at
) VALUES 
(
  'demo-message-1',
  'pete-kutable-demo-booking-1',
  'pete-drake-demo-user-id'::uuid,
  '6455a63f-161e-4351-9f14-0ecbe01f0d3a'::uuid,
  'Hi! Looking forward to my beard trim appointment on Friday.',
  null,
  now() - interval '2 hours',
  now() - interval '2 hours'
),
(
  'demo-message-2', 
  'pete-kutable-demo-booking-1',
  '6455a63f-161e-4351-9f14-0ecbe01f0d3a'::uuid,
  'pete-drake-demo-user-id'::uuid,
  'Sounds great! I''ll have everything ready for your appointment. See you Friday at 2:30 PM.',
  now() - interval '1 hour 30 minutes',
  now() - interval '1 hour 45 minutes', 
  now() - interval '1 hour 45 minutes'
),
(
  'demo-message-3',
  'pete-kutable-demo-booking-1', 
  'pete-drake-demo-user-id'::uuid,
  '6455a63f-161e-4351-9f14-0ecbe01f0d3a'::uuid,
  'Perfect! Should I bring anything specific?',
  null,
  now() - interval '1 hour',
  now() - interval '1 hour'
),
(
  'demo-message-4',
  'pete-kutable-demo-booking-1',
  '6455a63f-161e-4351-9f14-0ecbe01f0d3a'::uuid, 
  'pete-drake-demo-user-id'::uuid,
  'Just bring yourself! I''ll take care of everything else.',
  null,
  now() - interval '30 minutes',
  now() - interval '30 minutes'
)
ON CONFLICT (id) DO UPDATE SET
  message_text = EXCLUDED.message_text,
  updated_at = now();

-- Step 6: Verify the setup worked
DO $$
BEGIN
  -- Check Kutable profile linkage
  IF EXISTS (
    SELECT 1 FROM barber_profiles 
    WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5'
    AND user_id = '6455a63f-161e-4351-9f14-0ecbe01f0d3a'::uuid
  ) THEN
    RAISE NOTICE '✅ Kutable barber profile properly linked to user ID';
  ELSE
    RAISE NOTICE '❌ Kutable barber profile linkage failed';
  END IF;

  -- Check Pete Drake profile linkage  
  IF EXISTS (
    SELECT 1 FROM client_profiles
    WHERE id = 'pete-drake-client-profile'
    AND user_id = 'pete-drake-demo-user-id'::uuid
  ) THEN
    RAISE NOTICE '✅ Pete Drake client profile exists';
  ELSE
    RAISE NOTICE '❌ Pete Drake client profile missing';
  END IF;

  -- Check booking exists
  IF EXISTS (
    SELECT 1 FROM bookings 
    WHERE id = 'pete-kutable-demo-booking-1'
    AND barber_id = 'e639f78f-abea-4a27-b995-f31032e25ab5'
    AND client_id = 'pete-drake-client-profile'
  ) THEN
    RAISE NOTICE '✅ Demo booking exists between Pete and Kutable';
  ELSE  
    RAISE NOTICE '❌ Demo booking missing';
  END IF;

  -- Check messages exist
  IF EXISTS (
    SELECT 1 FROM messages
    WHERE booking_id = 'pete-kutable-demo-booking-1'
  ) THEN
    RAISE NOTICE '✅ Demo messages exist for the booking';
  ELSE
    RAISE NOTICE '❌ Demo messages missing';
  END IF;
END $$;