/*
  # Audit Client Conversation Issues

  1. Create Views and Functions
    - `client_conversation_audit` view to identify problematic bookings
    - Helper functions to repair client profiles
    - Admin dashboard integration

  2. Repair Functions
    - Auto-create placeholder client profiles for orphaned bookings
    - Prevent self-messaging scenarios
    - Allow admin manual fixes

  3. Monitoring
    - Track unclaimed client profiles
    - Monitor conversation availability
*/

-- Create a view to audit problematic client conversations
CREATE OR REPLACE VIEW client_conversation_audit AS
SELECT 
    b.id as booking_id,
    b.appointment_date,
    b.appointment_time,
    b.status,
    b.barber_id,
    b.client_id,
    bp.business_name as barber_business,
    bp.owner_name as barber_owner,
    bp.user_id as barber_user_id,
    cp.first_name as client_first,
    cp.last_name as client_last,
    cp.user_id as client_user_id,
    s.name as service_name,
    CASE 
        WHEN cp.user_id IS NULL THEN 'CLIENT_PROFILE_MISSING_USER_ID'
        WHEN cp.user_id = bp.user_id THEN 'SELF_MESSAGING_DETECTED'
        WHEN cp.id IS NULL THEN 'CLIENT_PROFILE_MISSING'
        ELSE 'VALID'
    END as issue_type,
    CASE 
        WHEN cp.user_id IS NULL THEN 'Client profile exists but has no user_id (unclaimed)'
        WHEN cp.user_id = bp.user_id THEN 'Same user is both barber and client (data error)'
        WHEN cp.id IS NULL THEN 'No client profile exists for this booking'
        ELSE 'No issues detected'
    END as issue_description,
    CASE 
        WHEN cp.user_id IS NULL THEN 'Prompt client to claim account or admin can manually link user_id'
        WHEN cp.user_id = bp.user_id THEN 'Admin needs to create separate client profile or reassign user_id'
        WHEN cp.id IS NULL THEN 'System should auto-create placeholder client profile'
        ELSE 'No action needed'
    END as suggested_fix
FROM bookings b
INNER JOIN barber_profiles bp ON b.barber_id = bp.id
LEFT JOIN client_profiles cp ON b.client_id = cp.id
LEFT JOIN services s ON b.service_id = s.id
WHERE 
    b.status IN ('pending', 'confirmed', 'completed')
    AND (
        cp.user_id IS NULL 
        OR cp.user_id = bp.user_id 
        OR cp.id IS NULL
    )
ORDER BY b.appointment_date DESC;

-- Function to create placeholder client profile for orphaned bookings
CREATE OR REPLACE FUNCTION create_placeholder_client_profile(
    booking_id_param UUID
) RETURNS UUID AS $$
DECLARE
    booking_record RECORD;
    new_client_id UUID;
BEGIN
    -- Get booking details
    SELECT b.*, s.name as service_name 
    INTO booking_record
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.id = booking_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', booking_id_param;
    END IF;
    
    -- Check if client profile already exists
    IF booking_record.client_id IS NOT NULL THEN
        RAISE EXCEPTION 'Booking already has client profile: %', booking_record.client_id;
    END IF;
    
    -- Create placeholder client profile
    INSERT INTO client_profiles (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        preferred_contact,
        communication_consent,
        sms_consent,
        email_consent
    ) VALUES (
        NULL, -- Will be linked when client claims account
        'Unclaimed',
        'Client',
        'unclaimed+' || booking_id_param::text || '@kutable.com',
        '',
        'email',
        false,
        false,
        false
    ) RETURNING id INTO new_client_id;
    
    -- Update booking with new client profile
    UPDATE bookings 
    SET client_id = new_client_id, updated_at = NOW()
    WHERE id = booking_id_param;
    
    RETURN new_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to link unclaimed client profile to user account
CREATE OR REPLACE FUNCTION link_client_profile_to_user(
    client_profile_id_param UUID,
    user_id_param UUID,
    first_name_param TEXT,
    last_name_param TEXT,
    email_param TEXT,
    phone_param TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    existing_profile_id UUID;
BEGIN
    -- Check if user already has a client profile
    SELECT id INTO existing_profile_id
    FROM client_profiles
    WHERE user_id = user_id_param;
    
    IF existing_profile_id IS NOT NULL AND existing_profile_id != client_profile_id_param THEN
        RAISE EXCEPTION 'User already has a client profile: %', existing_profile_id;
    END IF;
    
    -- Update the placeholder profile with real user data
    UPDATE client_profiles
    SET 
        user_id = user_id_param,
        first_name = first_name_param,
        last_name = last_name_param,
        email = email_param,
        phone = COALESCE(phone_param, phone),
        communication_consent = true,
        sms_consent = true,
        email_consent = true,
        consent_date = NOW(),
        updated_at = NOW()
    WHERE id = client_profile_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Client profile not found: %', client_profile_id_param;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fix self-messaging issues
CREATE OR REPLACE FUNCTION fix_self_messaging_booking(
    booking_id_param UUID
) RETURNS BOOLEAN AS $$
DECLARE
    booking_record RECORD;
    new_client_id UUID;
BEGIN
    -- Get booking details
    SELECT 
        b.*,
        bp.user_id as barber_user_id,
        cp.user_id as client_user_id
    INTO booking_record
    FROM bookings b
    INNER JOIN barber_profiles bp ON b.barber_id = bp.id
    LEFT JOIN client_profiles cp ON b.client_id = cp.id
    WHERE b.id = booking_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', booking_id_param;
    END IF;
    
    -- Check if this is actually a self-messaging issue
    IF booking_record.barber_user_id != booking_record.client_user_id THEN
        RAISE EXCEPTION 'This booking does not have a self-messaging issue';
    END IF;
    
    -- Create new placeholder client profile
    INSERT INTO client_profiles (
        user_id,
        first_name,
        last_name,
        email,
        phone,
        preferred_contact,
        communication_consent,
        sms_consent,
        email_consent
    ) VALUES (
        NULL, -- Will be linked when real client claims account
        'Separate',
        'Client',
        'separate-client+' || booking_id_param::text || '@kutable.com',
        '',
        'email',
        false,
        false,
        false
    ) RETURNING id INTO new_client_id;
    
    -- Update booking with new separate client profile
    UPDATE bookings 
    SET client_id = new_client_id, updated_at = NOW()
    WHERE id = booking_id_param;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add constraint to prevent future self-messaging at database level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'prevent_self_messaging_check'
    ) THEN
        ALTER TABLE bookings
        ADD CONSTRAINT prevent_self_messaging_check
        CHECK (
            barber_id != client_id AND
            (
                SELECT bp.user_id FROM barber_profiles bp WHERE bp.id = barber_id
            ) != (
                SELECT cp.user_id FROM client_profiles cp WHERE cp.id = client_id
            )
        );
    END IF;
END $$;

-- Create indexes for better audit performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_user_id_null 
ON client_profiles (id) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_conversation_audit 
ON bookings (client_id, barber_id, status) 
WHERE status IN ('pending', 'confirmed', 'completed');

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION create_placeholder_client_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION link_client_profile_to_user(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_self_messaging_booking(UUID) TO authenticated;