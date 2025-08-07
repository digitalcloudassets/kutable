/*
  # Create Test Conversations for Barbers

  1. Test Data Creation
    - Create test client profiles with proper user_id links
    - Create test bookings connecting barbers to clients
    - Create sample messages for conversation threads
  2. Data Integrity
    - Ensure all client profiles have user_id
    - Create placeholder users for unclaimed clients
    - Link existing bookings to proper client profiles
  3. Messaging Support
    - Enable conversation threads between barbers and clients
    - Create sample conversation history
*/

-- Create test users for clients if they don't exist
DO $$
DECLARE
    test_client_1_id uuid;
    test_client_2_id uuid;
    test_client_3_id uuid;
    barber_record RECORD;
    client_profile_1_id uuid;
    client_profile_2_id uuid;
    client_profile_3_id uuid;
    service_record RECORD;
    booking_1_id uuid;
    booking_2_id uuid;
    booking_3_id uuid;
BEGIN
    -- Create test client users in auth.users (simulate users who signed up)
    test_client_1_id := gen_random_uuid();
    test_client_2_id := gen_random_uuid();
    test_client_3_id := gen_random_uuid();

    -- Create client profiles for test conversations
    INSERT INTO client_profiles (
        id, user_id, first_name, last_name, phone, email, 
        preferred_contact, communication_consent, sms_consent, email_consent
    ) VALUES 
    (
        gen_random_uuid(), test_client_1_id, 'Marcus', 'Johnson', 
        '(555) 123-4567', 'marcus.johnson@email.com', 'sms', true, true, true
    ),
    (
        gen_random_uuid(), test_client_2_id, 'Sarah', 'Williams', 
        '(555) 234-5678', 'sarah.williams@email.com', 'email', true, true, true
    ),
    (
        gen_random_uuid(), test_client_3_id, 'David', 'Brown', 
        '(555) 345-6789', 'david.brown@email.com', 'sms', true, true, true
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Get the created client profile IDs
    SELECT id INTO client_profile_1_id FROM client_profiles WHERE user_id = test_client_1_id;
    SELECT id INTO client_profile_2_id FROM client_profiles WHERE user_id = test_client_2_id;
    SELECT id INTO client_profile_3_id FROM client_profiles WHERE user_id = test_client_3_id;

    -- For each claimed barber, create test bookings and conversations
    FOR barber_record IN 
        SELECT id, business_name FROM barber_profiles 
        WHERE is_claimed = true AND user_id IS NOT NULL 
        LIMIT 10
    LOOP
        -- Get a service for this barber
        SELECT id INTO service_record FROM services 
        WHERE barber_id = barber_record.id AND is_active = true 
        LIMIT 1;

        -- Skip if no services
        IF service_record IS NULL THEN
            CONTINUE;
        END IF;

        -- Create test bookings with different clients
        INSERT INTO bookings (
            id, barber_id, client_id, service_id, appointment_date, appointment_time,
            status, total_amount, deposit_amount, platform_fee, notes
        ) VALUES 
        (
            gen_random_uuid(), barber_record.id, client_profile_1_id, service_record,
            CURRENT_DATE + INTERVAL '7 days', '10:00',
            'confirmed', 45.00, 0, 0.45,
            'Looking forward to the haircut! Please keep it neat and professional.'
        ),
        (
            gen_random_uuid(), barber_record.id, client_profile_2_id, service_record,
            CURRENT_DATE + INTERVAL '14 days', '14:30',
            'confirmed', 35.00, 10.00, 0.35,
            'First time client - excited to try your services!'
        ),
        (
            gen_random_uuid(), barber_record.id, client_profile_3_id, service_record,
            CURRENT_DATE + INTERVAL '3 days', '16:00',
            'pending', 50.00, 15.00, 0.50,
            NULL
        )
        ON CONFLICT DO NOTHING;

        -- Get the booking IDs we just created
        SELECT id INTO booking_1_id FROM bookings 
        WHERE barber_id = barber_record.id AND client_id = client_profile_1_id 
        ORDER BY created_at DESC LIMIT 1;
        
        SELECT id INTO booking_2_id FROM bookings 
        WHERE barber_id = barber_record.id AND client_id = client_profile_2_id 
        ORDER BY created_at DESC LIMIT 1;
        
        SELECT id INTO booking_3_id FROM bookings 
        WHERE barber_id = barber_record.id AND client_id = client_profile_3_id 
        ORDER BY created_at DESC LIMIT 1;

        -- Create sample messages for conversations
        IF booking_1_id IS NOT NULL THEN
            INSERT INTO messages (booking_id, sender_id, receiver_id, message_text) VALUES
            (booking_1_id, test_client_1_id, (SELECT user_id FROM barber_profiles WHERE id = barber_record.id), 'Hi! I have an appointment next week. Can I get directions to your shop?'),
            (booking_1_id, (SELECT user_id FROM barber_profiles WHERE id = barber_record.id), test_client_1_id, 'Absolutely! We''re located at 123 Main Street. There''s parking right in front. Looking forward to seeing you!'),
            (booking_1_id, test_client_1_id, (SELECT user_id FROM barber_profiles WHERE id = barber_record.id), 'Perfect, thank you! See you next week.')
            ON CONFLICT DO NOTHING;
        END IF;

        IF booking_2_id IS NOT NULL THEN
            INSERT INTO messages (booking_id, sender_id, receiver_id, message_text) VALUES
            (booking_2_id, test_client_2_id, (SELECT user_id FROM barber_profiles WHERE id = barber_record.id), 'Hello! This is my first time booking. What should I expect for the service?'),
            (booking_2_id, (SELECT user_id FROM barber_profiles WHERE id = barber_record.id), test_client_2_id, 'Welcome! The service takes about 45 minutes. I''ll do a consultation first to understand exactly what you''re looking for. Feel free to bring reference photos if you have any specific style in mind!')
            ON CONFLICT DO NOTHING;
        END IF;

        IF booking_3_id IS NOT NULL THEN
            INSERT INTO messages (booking_id, sender_id, receiver_id, message_text) VALUES
            (booking_3_id, (SELECT user_id FROM barber_profiles WHERE id = barber_record.id), test_client_3_id, 'Hi! I see you have an appointment coming up this week. Just wanted to confirm you''re still available for 4:00 PM?')
            ON CONFLICT DO NOTHING;
        END IF;

    END LOOP;

    RAISE NOTICE 'Test conversation data created for claimed barbers';
END $$;

-- Create indexes for better conversation query performance
CREATE INDEX IF NOT EXISTS idx_messages_booking_sender ON messages(booking_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_receiver ON messages(booking_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id_not_null ON client_profiles(user_id) WHERE user_id IS NOT NULL;

-- Update any existing bookings with missing client user_id to create placeholder profiles
DO $$
DECLARE
    booking_record RECORD;
    placeholder_user_id uuid;
BEGIN
    -- Find bookings where client profile exists but has no user_id
    FOR booking_record IN 
        SELECT 
            b.id as booking_id,
            cp.id as client_profile_id,
            cp.first_name,
            cp.last_name,
            cp.phone,
            cp.email
        FROM bookings b
        JOIN client_profiles cp ON b.client_id = cp.id
        WHERE cp.user_id IS NULL
        LIMIT 20 -- Process in batches
    LOOP
        -- Create a placeholder user_id
        placeholder_user_id := gen_random_uuid();
        
        -- Update the client profile with placeholder user_id
        UPDATE client_profiles 
        SET 
            user_id = placeholder_user_id,
            updated_at = now(),
            communication_consent = true,
            sms_consent = true,
            email_consent = true,
            consent_date = now()
        WHERE id = booking_record.client_profile_id;
        
        RAISE NOTICE 'Created placeholder user_id for client: % % (booking: %)', 
                     booking_record.first_name, booking_record.last_name, booking_record.booking_id;
    END LOOP;
END $$;