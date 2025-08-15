/*
  # Fix Barber Profile Slugs

  1. Updates
    - Updates barber profiles that have UUID-based slugs or null slugs
    - Generates clean, SEO-friendly slugs from business names
    - Handles duplicate business names with numeric suffixes
    - Preserves existing good slugs

  2. Security
    - Uses service role permissions for bulk updates
    - No RLS policies affected
*/

-- Create a function to generate clean slugs from business names
CREATE OR REPLACE FUNCTION generate_barber_slug(business_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  slug_exists BOOLEAN;
BEGIN
  -- Generate base slug from business name
  base_slug := LOWER(business_name);
  base_slug := REPLACE(base_slug, '&', 'and');
  base_slug := REPLACE(base_slug, '''', '');
  base_slug := REGEXP_REPLACE(base_slug, '[^\w\s-]', '', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);
  base_slug := SUBSTRING(base_slug FROM 1 FOR 50);
  
  -- Ensure slug is not empty
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'barber';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for conflicts and make unique
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM barber_profiles 
      WHERE slug = final_slug
    ) INTO slug_exists;
    
    IF NOT slug_exists THEN
      EXIT;
    END IF;
    
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update profiles that need slug fixes
UPDATE barber_profiles 
SET 
  slug = generate_barber_slug(business_name),
  updated_at = NOW()
WHERE 
  business_name IS NOT NULL 
  AND business_name != ''
  AND (
    slug IS NULL 
    OR slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    OR slug = id::text
  );

-- Clean up the function
DROP FUNCTION IF EXISTS generate_barber_slug(TEXT);