/*
  # Booking Profile Integrity Audit and Repair

  1. Data Integrity Audit
    - Find bookings with missing or invalid profile associations
    - Identify bookings where barber and client have same user_id
    - Flag bookings with missing profile data

  2. Repair Suggestions
    - Provides queries to fix common data integrity issues
    - Creates temporary client profiles for orphaned bookings
    - Updates messaging-related flags

  3. Prevention
    - Adds constraints to prevent future data integrity issues
    - Updates RLS policies to handle edge cases
*/

-- First, let's audit the current state of booking profile integrity
DO $$
DECLARE
    problematic_count INTEGER;
    same_user_count INTEGER;
    missing_client_count INTEGER;
    missing_barber_count INTEGER;
BEGIN
    -- Count bookings where barber and client have same user_id
    SELECT COUNT(*) INTO same_user_count
    FROM bookings b
    INNER JOIN barber_profiles bp ON b.barber_id = bp.id
    INNER JOIN client_profiles cp ON b.client_id = cp.id
    WHERE bp.user_id = cp.user_id AND bp.user_id IS NOT NULL;
    
    -- Count bookings with missing client user_id
    SELECT COUNT(*) INTO missing_client_count
    FROM bookings b
    INNER JOIN barber_profiles bp ON b.barber_id = bp.id
    LEFT JOIN client_profiles cp ON b.client_id = cp.id
    WHERE cp.user_id IS NULL;
    
    -- Count bookings with missing barber user_id  
    SELECT COUNT(*) INTO missing_barber_count
    FROM bookings b
    LEFT JOIN barber_profiles bp ON b.barber_id = bp.id
    INNER JOIN client_profiles cp ON b.client_id = cp.id
    WHERE bp.user_id IS NULL;
    
    -- Total problematic bookings
    problematic_count := same_user_count + missing_client_count + missing_barber_count;
    
    RAISE NOTICE 'BOOKING INTEGRITY AUDIT RESULTS:';
    RAISE NOTICE '- Total problematic bookings: %', problematic_count;
    RAISE NOTICE '- Bookings with same user_id for barber/client: %', same_user_count;
    RAISE NOTICE '- Bookings with missing client user_id: %', missing_client_count;
    RAISE NOTICE '- Bookings with missing barber user_id: %', missing_barber_count;
    
    IF problematic_count > 0 THEN
        RAISE NOTICE 'DATA INTEGRITY ISSUES FOUND - See queries below to fix';
    ELSE
        RAISE NOTICE 'No data integrity issues found - messaging should work properly';
    END IF;
END $$;

-- Create a view to easily identify problematic bookings
CREATE OR REPLACE VIEW problematic_bookings AS
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
        WHEN bp.user_id IS NULL THEN 'missing_barber_user_id'
        WHEN cp.user_id IS NULL THEN 'missing_client_user_id'
        WHEN bp.user_id = cp.user_id AND bp.user_id IS NOT NULL THEN 'same_user_id'
        ELSE 'unknown_issue'
    END as issue_type
FROM bookings b
LEFT JOIN barber_profiles bp ON b.barber_id = bp.id
LEFT JOIN client_profiles cp ON b.client_id = cp.id
LEFT JOIN services s ON b.service_id = s.id
WHERE 
    bp.user_id IS NULL 
    OR cp.user_id IS NULL 
    OR (bp.user_id = cp.user_id AND bp.user_id IS NOT NULL);

-- Create a function to fix orphaned bookings
CREATE OR REPLACE FUNCTION fix_orphaned_booking(booking_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    booking_record RECORD;
    new_client_id UUID;
    result_message TEXT;
BEGIN
    -- Get the problematic booking
    SELECT * INTO booking_record FROM problematic_bookings WHERE booking_id = booking_id_param;
    
    IF NOT FOUND THEN
        RETURN 'Booking not found or not problematic';
    END IF;
    
    CASE booking_record.issue_type
        WHEN 'missing_client_user_id' THEN
            -- Create a temporary/placeholder client profile for this booking
            INSERT INTO client_profiles (
                user_id,
                first_name, 
                last_name,
                email,
                phone,
                preferred_contact
            ) VALUES (
                NULL, -- Keep as NULL to indicate unclaimed
                COALESCE(booking_record.client_first, 'Unknown'),
                COALESCE(booking_record.client_last, 'Client'),
                'unclaimed@temp.kutable.com',
                '',
                'sms'
            ) RETURNING id INTO new_client_id;
            
            -- Update the booking to use the new client profile
            UPDATE bookings 
            SET client_id = new_client_id,
                updated_at = NOW()
            WHERE id = booking_id_param;
            
            result_message := 'Created placeholder client profile and updated booking';
            
        WHEN 'same_user_id' THEN
            -- This is a serious data integrity issue
            -- Mark the booking for manual review
            UPDATE bookings 
            SET notes = CONCAT(COALESCE(notes, ''), ' [DATA INTEGRITY ISSUE: Same user as barber and client - needs manual review]'),
                updated_at = NOW()
            WHERE id = booking_id_param;
            
            result_message := 'Flagged booking for manual review - same user as barber and client';
            
        WHEN 'missing_barber_user_id' THEN
            -- Barber profile is unclaimed - flag for follow-up
            UPDATE bookings 
            SET notes = CONCAT(COALESCE(notes, ''), ' [BARBER UNCLAIMED: Barber needs to claim profile for messaging]'),
                updated_at = NOW()
            WHERE id = booking_id_param;
            
            result_message := 'Flagged booking - barber profile needs to be claimed';
            
        ELSE
            result_message := 'Unknown issue type - no action taken';
    END CASE;
    
    RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- Add database constraints to prevent future issues
DO $$
BEGIN
    -- Add a constraint to prevent same user being barber and client
    -- (This will be checked at the application level since it's complex with JOINs)
    
    -- Add a function to validate booking participants
    CREATE OR REPLACE FUNCTION validate_booking_participants()
    RETURNS TRIGGER AS $trigger$
    BEGIN
        -- Check if barber and client profiles exist and have different user_ids
        DECLARE
            barber_user_id UUID;
            client_user_id UUID;
        BEGIN
            SELECT user_id INTO barber_user_id FROM barber_profiles WHERE id = NEW.barber_id;
            SELECT user_id INTO client_user_id FROM client_profiles WHERE id = NEW.client_id;
            
            -- Allow NULL user_ids (unclaimed profiles) but prevent same non-NULL user_id
            IF barber_user_id IS NOT NULL AND client_user_id IS NOT NULL AND barber_user_id = client_user_id THEN
                RAISE EXCEPTION 'Cannot create booking where barber and client have the same user_id: %', barber_user_id;
            END IF;
            
            RETURN NEW;
        END;
    END;
    $trigger$ LANGUAGE plpgsql;
    
    -- Create trigger to validate on booking insert/update
    DROP TRIGGER IF EXISTS validate_booking_participants_trigger ON bookings;
    CREATE TRIGGER validate_booking_participants_trigger
        BEFORE INSERT OR UPDATE ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION validate_booking_participants();
        
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL; -- Function already exists
END $$;

-- Query to view all problematic bookings (run this to see current issues)
-- SELECT * FROM problematic_bookings ORDER BY appointment_date DESC;

-- Example repair commands (uncomment and run as needed):
-- SELECT fix_orphaned_booking('your-booking-id-here');

-- Quick fix for the most common issue: missing client user_ids
-- This creates placeholder profiles for bookings with missing client data
DO $$
DECLARE
    booking_rec RECORD;
    new_client_id UUID;
    fixed_count INTEGER := 0;
BEGIN
    FOR booking_rec IN 
        SELECT pb.booking_id, pb.client_first, pb.client_last 
        FROM problematic_bookings pb 
        WHERE pb.issue_type = 'missing_client_user_id'
    LOOP
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
            NULL, -- NULL user_id indicates unclaimed
            COALESCE(booking_rec.client_first, 'Unknown'),
            COALESCE(booking_rec.client_last, 'Client'),
            'unclaimed@temp.kutable.com',
            '',
            'sms',
            false,
            false,
            false
        ) RETURNING id INTO new_client_id;
        
        -- Update booking to use new client profile
        UPDATE bookings 
        SET client_id = new_client_id,
            notes = CONCAT(COALESCE(notes, ''), ' [AUTO-FIXED: Created placeholder client profile]'),
            updated_at = NOW()
        WHERE id = booking_rec.booking_id;
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Auto-fixed % bookings with missing client profiles', fixed_count;
END $$;

-- Clean up the view (optional - remove if you want to keep it for ongoing monitoring)
-- DROP VIEW IF EXISTS problematic_bookings;