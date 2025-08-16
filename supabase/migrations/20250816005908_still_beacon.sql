/*
  # Fix messaging data linkage for barber conversations

  1. Data Repairs
    - Ensure Kutable barber profile has correct user_id linkage
    - Ensure Pete Drake has bookings with Kutable
    - Create demo messages for testing

  2. RLS Policies
    - Verify messages policies allow both booking participants
    - Add debugging policies if needed
*/

-- Ensure Kutable barber profile has proper user_id linkage
UPDATE barber_profiles 
SET user_id = '6455a63f-161e-4351-9f14-0ecbe01f0d3a',
    updated_at = now()
WHERE business_name = 'Kutable' 
  AND (user_id IS NULL OR user_id != '6455a63f-161e-4351-9f14-0ecbe01f0d3a');

-- Ensure Pete Drake has client profile linkage  
DO $$
DECLARE
  pete_client_id uuid;
  kutable_barber_id uuid;
  demo_service_id uuid;
  demo_booking_id uuid;
BEGIN
  -- Get Pete's client profile ID
  SELECT id INTO pete_client_id
  FROM client_profiles 
  WHERE first_name = 'Pete' AND last_name = 'Drake'
  LIMIT 1;

  -- Get Kutable's barber profile ID
  SELECT id INTO kutable_barber_id
  FROM barber_profiles 
  WHERE business_name = 'Kutable'
  LIMIT 1;

  -- Get a service from Kutable
  SELECT id INTO demo_service_id
  FROM services 
  WHERE barber_id = kutable_barber_id
  LIMIT 1;

  -- Create demo service if none exists
  IF demo_service_id IS NULL THEN
    INSERT INTO services (
      barber_id,
      name,
      description,
      price,
      duration_minutes,
      is_active
    ) VALUES (
      kutable_barber_id,
      'Demo Haircut',
      'Professional haircut service',
      35,
      45,
      true
    ) RETURNING id INTO demo_service_id;
  END IF;

  -- Create a demo booking if none exists
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
    platform_fee
  ) VALUES (
    gen_random_uuid(),
    kutable_barber_id,
    pete_client_id,
    demo_service_id,
    CURRENT_DATE + INTERVAL '1 day',
    '14:00',
    'confirmed',
    35,
    0,
    0.35
  ) 
  ON CONFLICT DO NOTHING
  RETURNING id INTO demo_booking_id;

  -- Create demo messages for the conversation
  IF demo_booking_id IS NOT NULL THEN
    -- Message from Pete to Kutable
    INSERT INTO messages (
      booking_id,
      sender_id,
      receiver_id, 
      message_text
    ) VALUES (
      demo_booking_id,
      (SELECT user_id FROM client_profiles WHERE id = pete_client_id),
      '6455a63f-161e-4351-9f14-0ecbe01f0d3a',
      'Hi! Looking forward to my appointment tomorrow. Do you have parking available?'
    ) ON CONFLICT DO NOTHING;

    -- Message from Kutable to Pete  
    INSERT INTO messages (
      booking_id,
      sender_id,
      receiver_id,
      message_text
    ) VALUES (
      demo_booking_id,
      '6455a63f-161e-4351-9f14-0ecbe01f0d3a',
      (SELECT user_id FROM client_profiles WHERE id = pete_client_id),
      'Yes, we have free parking right in front. See you at 2pm!'
    ) ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Demo conversation setup complete - Pete client: %, Kutable barber: %, Booking: %', pete_client_id, kutable_barber_id, demo_booking_id;
END $$;

-- Refresh RLS policies for messages to ensure both parties can access
DROP POLICY IF EXISTS "messages_select_by_parties" ON messages;
DROP POLICY IF EXISTS "messages_insert_by_parties" ON messages;

-- Allow both booking participants to read messages
CREATE POLICY "messages_select_by_parties"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN barber_profiles bp ON bp.id = b.barber_id  
    JOIN client_profiles cp ON cp.id = b.client_id
    WHERE b.id = messages.booking_id
      AND (bp.user_id = auth.uid() OR cp.user_id = auth.uid())
  )
);

-- Allow both booking participants to send messages
CREATE POLICY "messages_insert_by_parties"  
ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN barber_profiles bp ON bp.id = b.barber_id
    JOIN client_profiles cp ON cp.id = b.client_id  
    WHERE b.id = new.booking_id
      AND (bp.user_id = auth.uid() OR cp.user_id = auth.uid())
  )
);

-- Allow message senders to mark their sent messages as read by recipients
CREATE POLICY "messages_update_read_status"
ON messages FOR UPDATE
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());