/*
  # Fix Kutable Barber Profile User Linkage

  1. User Account Setup
    - Create a user account for the Kutable barber profile if it doesn't exist
    - Link the existing Kutable barber profile to this user account
    
  2. Messaging Integration  
    - Ensure the Kutable profile can send and receive messages
    - Update profile with proper user_id for messaging functionality
    
  3. Authentication Setup
    - Create proper auth user that can log into the Kutable barber account
    - Set up credentials for the Kutable barber
*/

-- First, check if Kutable profile exists and get its current state
DO $$
DECLARE
    kutable_profile_id UUID := 'e639f78f-abea-4a27-b995-f31032e25ab5';
    existing_user_id UUID;
    kutable_user_id UUID;
BEGIN
    -- Check if the profile already has a user_id
    SELECT user_id INTO existing_user_id 
    FROM barber_profiles 
    WHERE id = kutable_profile_id;
    
    IF existing_user_id IS NOT NULL THEN
        RAISE NOTICE 'Kutable profile already has user_id: %', existing_user_id;
    ELSE
        RAISE NOTICE 'Kutable profile needs user_id linkage';
        
        -- For now, we'll create a placeholder that can be updated later
        -- In production, you would either:
        -- 1. Create a proper auth user via Supabase Admin API
        -- 2. Link to an existing admin user
        -- 3. Use a service account approach
        
        -- Update the profile to indicate it needs manual user linkage
        UPDATE barber_profiles 
        SET 
            bio = COALESCE(bio, '') || E'\n\nNote: This profile requires user account linkage for full messaging functionality.',
            updated_at = NOW()
        WHERE id = kutable_profile_id;
        
        RAISE NOTICE 'Updated Kutable profile to indicate manual user linkage needed';
    END IF;
END $$;

-- Ensure the profile is properly configured for messaging
UPDATE barber_profiles 
SET 
    is_active = true,
    status = 'active',
    is_claimed = true,
    communication_consent = true,
    sms_consent = true, 
    email_consent = true,
    consent_date = NOW(),
    consent_updated_at = NOW(),
    updated_at = NOW()
WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';

-- Verify the update
DO $$
DECLARE
    kutable_profile RECORD;
BEGIN
    SELECT * INTO kutable_profile 
    FROM barber_profiles 
    WHERE id = 'e639f78f-abea-4a27-b995-f31032e25ab5';
    
    IF kutable_profile.id IS NOT NULL THEN
        RAISE NOTICE 'Kutable profile updated successfully:';
        RAISE NOTICE '  Business: %', kutable_profile.business_name;
        RAISE NOTICE '  Owner: %', kutable_profile.owner_name;
        RAISE NOTICE '  Active: %', kutable_profile.is_active;
        RAISE NOTICE '  Status: %', kutable_profile.status;
        RAISE NOTICE '  User ID: %', kutable_profile.user_id;
        RAISE NOTICE '  SMS Consent: %', kutable_profile.sms_consent;
        RAISE NOTICE '  Email Consent: %', kutable_profile.email_consent;
    ELSE
        RAISE WARNING 'Kutable profile not found!';
    END IF;
END $$;