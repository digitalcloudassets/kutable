/*
  # Create Official Kutable Profile

  1. New Profile
    - Insert the official Kutable Barbershop profile
    - Set proper claimed status and details
    - Ensure it uses the reserved "kutable" slug

  2. Services
    - Add default services for the Kutable profile
    - Professional pricing and descriptions

  3. Availability
    - Set business hours for the profile
    - Standard barbershop availability

  4. Security
    - Profile is marked as claimed and active
    - Uses reserved slug protection
*/

-- Insert the official Kutable Barbershop profile
INSERT INTO barber_profiles (
  id,
  slug,
  user_id,
  business_name,
  owner_name,
  phone,
  email,
  address,
  city,
  state,
  zip_code,
  bio,
  profile_image_url,
  is_claimed,
  is_active,
  average_rating,
  total_reviews,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'kutable',
  NULL, -- Will be linked when owner signs up
  'Kutable Barbershop',
  'Alex Johnson',
  '(555) 123-4567',
  'alex@kutable.com',
  '123 Demo Street',
  'San Francisco',
  'CA',
  '94102',
  'Professional barber with over 8 years of experience specializing in modern cuts, classic styles, and beard grooming. Known for precision cuts and excellent customer service.',
  'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  true,
  4.8,
  127,
  now(),
  now()
) ON CONFLICT (slug) DO NOTHING;

-- Get the profile ID for adding services and availability
DO $$
DECLARE
  profile_id uuid;
BEGIN
  -- Get the profile ID
  SELECT id INTO profile_id FROM barber_profiles WHERE slug = 'kutable';
  
  IF profile_id IS NOT NULL THEN
    -- Insert services for Kutable Barbershop
    INSERT INTO services (
      barber_id,
      name,
      description,
      price,
      duration_minutes,
      deposit_required,
      deposit_amount,
      is_active
    ) VALUES 
    (profile_id, 'Classic Haircut', 'Traditional men''s haircut with styling', 35.00, 45, false, 0, true),
    (profile_id, 'Beard Trim', 'Professional beard shaping and trimming', 25.00, 30, false, 0, true),
    (profile_id, 'Cut & Beard Combo', 'Complete haircut and beard service', 55.00, 75, true, 15.00, true),
    (profile_id, 'Hot Towel Shave', 'Luxury straight razor shave with hot towel', 45.00, 60, true, 15.00, true)
    ON CONFLICT DO NOTHING;
    
    -- Insert availability for Kutable Barbershop (Monday-Saturday)
    INSERT INTO availability (
      barber_id,
      day_of_week,
      start_time,
      end_time,
      is_available
    ) VALUES 
    (profile_id, 1, '09:00'::time, '18:00'::time, true), -- Monday
    (profile_id, 2, '09:00'::time, '18:00'::time, true), -- Tuesday  
    (profile_id, 3, '09:00'::time, '18:00'::time, true), -- Wednesday
    (profile_id, 4, '09:00'::time, '18:00'::time, true), -- Thursday
    (profile_id, 5, '09:00'::time, '19:00'::time, true), -- Friday
    (profile_id, 6, '08:00'::time, '17:00'::time, true)  -- Saturday
    ON CONFLICT DO NOTHING;
  END IF;
END $$;