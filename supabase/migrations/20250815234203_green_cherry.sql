/*
  # Create branded slug for Kutable barber profile

  1. Updates
    - Update the Kutable barber profile to use 'kutable' as slug
    - Only updates if the profile exists and doesn't already have 'kutable' slug

  2. Safety
    - Uses conditional update to avoid conflicts
    - Only updates the specific Kutable profile by business name
*/

-- Update the Kutable barber profile to use 'kutable' as slug
UPDATE barber_profiles 
SET 
  slug = 'kutable',
  updated_at = now()
WHERE 
  business_name = 'Kutable' 
  AND (slug IS NULL OR slug != 'kutable')
  AND id IS NOT NULL;