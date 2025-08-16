/*
  # Fix Booking and Message Linkage for Kutable Demo

  1. Check existing bookings between Pete Drake and Kutable
  2. Ensure proper client_id and barber_id linkage
  3. Create demo messages if needed
  4. Verify messaging functionality
*/

-- First, let's find Pete Drake's client profile
DO $$
DECLARE
  pete_client_id UUID;
  kutable_barber_id UUID := 'e639f78f-abea-4a27-b995-f31032e25ab5';
  demo_booking_id UUID;
  demo_service_id UUID;
BEGIN
  -- Find Pete Drake's client profile by email
  SELECT id INTO pete_client_id 
  FROM client_profiles 
  WHERE email ILIKE '%pete%kutable%' OR first_name ILIKE '%pete%' OR last_name ILIKE '%drake%'
  LIMIT 1;

  IF pete_client_id IS NULL THEN
    RAISE NOTICE 'Pete Drake client profile not found, will check auth users table';
    -- If no client profile found, create one for demo purposes
    INSERT INTO client_profiles (
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
      'demo-pete-user-id',
      'Pete',
      'Drake',
      'pete@kutable.com',
      '+19077444718',
      'sms',
      true,
      true,
      true,
      now(),
      now()
    ) ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      updated_at = now()
    RETURNING id INTO pete_client_id;
    
    RAISE NOTICE 'Created/updated Pete Drake client profile: %', pete_client_id;
  ELSE
    RAISE NOTICE 'Found Pete Drake client profile: %', pete_client_id;
  END IF;

  -- Get or create a demo service for Kutable
  SELECT id INTO demo_service_id
  FROM services
  WHERE barber_id = kutable_barber_id
  LIMIT 1;

  IF demo_service_id IS NULL THEN
    INSERT INTO services (
      barber_id,
      name,
      description,
      price,
      duration_minutes,
      deposit_required,
      deposit_amount,
      is_active
    ) VALUES (
      kutable_barber_id,
      'Signature Cut & Style',
      'Professional haircut and styling by Kutable master barber',
      65.00,
      45,
      false,
      0,
      true
    ) RETURNING id INTO demo_service_id;
    
    RAISE NOTICE 'Created demo service for Kutable: %', demo_service_id;
  END IF;

  -- Check for existing booking between Pete and Kutable
  SELECT id INTO demo_booking_id
  FROM bookings
  WHERE client_id = pete_client_id 
    AND barber_id = kutable_barber_id
  LIMIT 1;

  IF demo_booking_id IS NULL THEN
    -- Create a demo booking
    INSERT INTO bookings (
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
      kutable_barber_id,
      pete_client_id,
      demo_service_id,
      CURRENT_DATE + INTERVAL '7 days',
      '14:30',
      'confirmed',
      65.00,
      0,
      0.65,
      'Demo booking for Kutable messaging showcase',
      now(),
      now()
    ) RETURNING id INTO demo_booking_id;
    
    RAISE NOTICE 'Created demo booking: %', demo_booking_id;
  ELSE
    RAISE NOTICE 'Found existing booking: %', demo_booking_id;
    
    -- Update existing booking to be confirmed and current
    UPDATE bookings SET
      status = 'confirmed',
      appointment_date = CURRENT_DATE + INTERVAL '7 days',
      appointment_time = '14:30',
      updated_at = now()
    WHERE id = demo_booking_id;
  END IF;

  -- Create some demo messages if none exist
  IF NOT EXISTS (
    SELECT 1 FROM messages WHERE booking_id = demo_booking_id
  ) THEN
    -- Insert demo conversation
    INSERT INTO messages (
      booking_id,
      sender_id,
      receiver_id,
      message_text,
      created_at,
      read_at
    ) VALUES 
    (
      demo_booking_id,
      'demo-pete-user-id',
      'kutable-demo-user',
      'Hi! Looking forward to my appointment next week. Any special prep needed?',
      now() - INTERVAL '2 hours',
      NULL
    ),
    (
      demo_booking_id,
      'kutable-demo-user',
      'demo-pete-user-id',
      'Thanks for booking with Kutable! No special prep needed - just come ready for an amazing cut. See you next week!',
      now() - INTERVAL '1 hour 45 minutes',
      now() - INTERVAL '1 hour 30 minutes'
    ),
    (
      demo_booking_id,
      'demo-pete-user-id',
      'kutable-demo-user',
      'Perfect! Should I park anywhere specific?',
      now() - INTERVAL '1 hour 30 minutes',
      NULL
    ),
    (
      demo_booking_id,
      'kutable-demo-user',
      'demo-pete-user-id',
      'Street parking is fine, or there''s a lot behind the building. Looking forward to it!',
      now() - INTERVAL '1 hour 15 minutes',
      now() - INTERVAL '1 hour'
    );
    
    RAISE NOTICE 'Created demo messages for booking: %', demo_booking_id;
  ELSE
    RAISE NOTICE 'Demo messages already exist for booking: %', demo_booking_id;
  END IF;

  -- Final verification
  RAISE NOTICE 'Demo setup complete:';
  RAISE NOTICE 'Pete client ID: %', pete_client_id;
  RAISE NOTICE 'Kutable barber ID: %', kutable_barber_id;
  RAISE NOTICE 'Demo booking ID: %', demo_booking_id;
  RAISE NOTICE 'Demo service ID: %', demo_service_id;

END $$;