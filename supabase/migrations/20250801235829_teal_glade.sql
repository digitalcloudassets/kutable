/*
  # Add slug column to barber_profiles table

  1. Changes
    - Add `slug` column to `barber_profiles` table
    - Column is TEXT type, unique, and nullable initially
    - Add unique index for efficient lookups
    - Populate existing records with generated slugs based on business_name

  2. Notes
    - Existing profiles will get auto-generated slugs
    - New profiles can have slugs set during creation
    - Unique constraint prevents duplicate slugs
*/

-- Add slug column to barber_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'barber_profiles' AND column_name = 'slug'
  ) THEN
    ALTER TABLE barber_profiles ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Create unique index for slug column
CREATE UNIQUE INDEX IF NOT EXISTS idx_barber_profiles_slug 
ON barber_profiles (slug);

-- Generate slugs for existing records that don't have them
UPDATE barber_profiles 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(business_name, '[^\w\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Handle duplicate slugs by appending numbers
DO $$
DECLARE
  rec RECORD;
  new_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN 
    SELECT id, business_name, slug
    FROM barber_profiles 
    WHERE slug IN (
      SELECT slug 
      FROM barber_profiles 
      WHERE slug IS NOT NULL 
      GROUP BY slug 
      HAVING COUNT(*) > 1
    )
    ORDER BY created_at
  LOOP
    counter := 1;
    new_slug := rec.slug;
    
    WHILE EXISTS (SELECT 1 FROM barber_profiles WHERE slug = new_slug AND id != rec.id) LOOP
      counter := counter + 1;
      new_slug := rec.slug || '-' || counter;
    END LOOP;
    
    IF new_slug != rec.slug THEN
      UPDATE barber_profiles SET slug = new_slug WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;