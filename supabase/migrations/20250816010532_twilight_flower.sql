/*
  # Fix demo booking to use different users

  1. Problem Fixed
    - Previous seed created bookings where barber_user_id = client_user_id
    - This violates the validate_booking_participants() function
    - Caused 400 errors when trying to create demo messaging data

  2. Solution
    - Find Kutable barber profile
    - Find a different client user (not the same as barber)
    - Only create demo booking if both exist and are different
    - Skip gracefully if no different client available

  3. Data Created
    - Demo booking between Kutable barber and Pete Drake (if different users)
    - Demo message thread for testing messaging functionality
    - All data respects existing validation constraints
*/

-- Clean up any existing invalid demo data first
DELETE FROM public.messages 
WHERE booking_id IN (
  SELECT id FROM public.bookings 
  WHERE barber_id IN (
    SELECT id FROM public.barber_profiles 
    WHERE business_name = 'Kutable'
  )
  AND client_id IN (
    SELECT id FROM public.client_profiles 
    WHERE user_id IN (
      SELECT user_id FROM public.barber_profiles 
      WHERE business_name = 'Kutable'
    )
  )
);

DELETE FROM public.bookings 
WHERE barber_id IN (
  SELECT id FROM public.barber_profiles 
  WHERE business_name = 'Kutable'
)
AND client_id IN (
  SELECT id FROM public.client_profiles 
  WHERE user_id IN (
    SELECT user_id FROM public.barber_profiles 
    WHERE business_name = 'Kutable'
  )
);

-- Create demo booking with proper user separation
DO $$
DECLARE
  demo_barber_profile_id uuid;
  demo_barber_user_id uuid;
  demo_service_id uuid;
  demo_client_profile_id uuid;
  demo_client_user_id uuid;
  demo_booking_id uuid;
BEGIN
  /* 1) Resolve the Kutable barber profile */
  SELECT bp.id, bp.user_id
  INTO demo_barber_profile_id, demo_barber_user_id
  FROM public.barber_profiles bp
  WHERE bp.business_name = 'Kutable'
  LIMIT 1;

  IF demo_barber_profile_id IS NULL THEN
    RAISE NOTICE 'No Kutable barber profile found. Skipping demo booking.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Kutable barber: profile_id=%, user_id=%', demo_barber_profile_id, demo_barber_user_id;

  /* 2) Resolve a service owned by this barber */
  SELECT s.id
  INTO demo_service_id
  FROM public.services s
  WHERE s.barber_id = demo_barber_profile_id
  AND s.is_active = true
  ORDER BY s.created_at ASC
  LIMIT 1;

  IF demo_service_id IS NULL THEN
    RAISE NOTICE 'No active service found for Kutable barber. Skipping demo booking.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found service for demo: service_id=%', demo_service_id;

  /* 3) Find ANY client profile with a DIFFERENT user_id than the barber */
  SELECT cp.id, cp.user_id
  INTO demo_client_profile_id, demo_client_user_id
  FROM public.client_profiles cp
  WHERE cp.user_id != demo_barber_user_id
  AND cp.user_id IS NOT NULL
  ORDER BY cp.created_at ASC
  LIMIT 1;

  IF demo_client_profile_id IS NULL THEN
    RAISE NOTICE 'No distinct client user found (all clients have same user_id as barber). Skipping demo booking.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found different client: profile_id=%, user_id=%', demo_client_profile_id, demo_client_user_id;

  /* 4) Double-check that users are actually different */
  IF demo_barber_user_id = demo_client_user_id THEN
    RAISE NOTICE 'Barber and client have same user_id (%). Skipping demo booking.', demo_barber_user_id;
    RETURN;
  END IF;

  /* 5) Insert demo booking only if it doesn't already exist */
  INSERT INTO public.bookings (
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
    notes
  )
  SELECT
    gen_random_uuid(),
    demo_barber_profile_id,
    demo_client_profile_id,
    demo_service_id,
    (CURRENT_DATE + INTERVAL '1 day')::date,
    '14:00',
    'confirmed',
    35.00,
    0.00,
    0.35,  -- 1% platform fee
    'Demo booking for testing messaging functionality'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.barber_id = demo_barber_profile_id
      AND b.client_id = demo_client_profile_id
      AND b.appointment_date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND b.appointment_time = '14:00'
  )
  RETURNING id INTO demo_booking_id;

  IF demo_booking_id IS NULL THEN
    RAISE NOTICE 'Demo booking already exists between Kutable and client.';
    
    -- Get existing booking ID for message creation
    SELECT b.id
    INTO demo_booking_id
    FROM public.bookings b
    WHERE b.barber_id = demo_barber_profile_id
      AND b.client_id = demo_client_profile_id
      AND b.appointment_date = (CURRENT_DATE + INTERVAL '1 day')::date
      AND b.appointment_time = '14:00'
    LIMIT 1;
  ELSE
    RAISE NOTICE 'Demo booking created successfully: booking_id=%', demo_booking_id;
  END IF;

  /* 6) Create demo messages if booking exists */
  IF demo_booking_id IS NOT NULL THEN
    -- Insert demo messages (idempotent)
    INSERT INTO public.messages (
      booking_id,
      sender_id,
      receiver_id,
      message_text,
      created_at
    )
    SELECT
      demo_booking_id,
      demo_client_user_id,
      demo_barber_user_id,
      'Hi! Looking forward to my appointment tomorrow at 2pm. Should I bring anything specific?',
      NOW() - INTERVAL '2 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.messages 
      WHERE booking_id = demo_booking_id 
      AND sender_id = demo_client_user_id
      AND message_text LIKE '%Looking forward to my appointment%'
    );

    INSERT INTO public.messages (
      booking_id,
      sender_id,
      receiver_id,
      message_text,
      created_at
    )
    SELECT
      demo_booking_id,
      demo_barber_user_id,
      demo_client_user_id,
      'Thanks for booking! Just bring yourself - I have everything else covered. See you at 2pm!',
      NOW() - INTERVAL '1 hour'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.messages 
      WHERE booking_id = demo_booking_id 
      AND sender_id = demo_barber_user_id
      AND message_text LIKE '%Thanks for booking%'
    );

    RAISE NOTICE 'Demo messages created for booking: %', demo_booking_id;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Demo booking creation failed: %', SQLERRM;
    -- Don't fail the migration, just log the error
END $$;