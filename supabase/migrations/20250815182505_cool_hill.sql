/*
  # New Platform Fee Policy Implementation

  1. Database Changes
    - Add `platform_fee_cents` column to mirror `application_fee_cents`
    - Create `compute_platform_fee_cents()` function for 1% with $0.25 minimum
    - Add trigger to auto-populate both fee columns on INSERT/UPDATE
    - Backfill existing payment records with new fee structure

  2. Fee Calculation
    - 1% of gross amount with minimum $0.25 (25 cents)
    - Maintains backward compatibility with existing `application_fee_cents` usage
    - New `platform_fee_cents` column provides consistent fee tracking going forward

  3. Data Migration
    - Backfills all existing payments with computed platform fees
    - Preserves historical data while enabling new fee structure
*/

-- Add platform_fee_cents column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS platform_fee_cents integer DEFAULT 0;

-- Create function to compute platform fee with minimum
CREATE OR REPLACE FUNCTION compute_platform_fee_cents(amount_cents integer, currency text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- 1% of gross amount with $0.25 minimum (25 cents)
  -- Only applies to USD currency, other currencies use 1% without minimum
  IF currency = 'usd' THEN
    RETURN greatest(round(amount_cents * 0.01), 25)::integer;
  ELSE
    -- For non-USD currencies, use 1% without minimum
    RETURN round(amount_cents * 0.01)::integer;
  END IF;
END;
$$;

-- Create trigger function to auto-populate fee columns
CREATE OR REPLACE FUNCTION auto_populate_platform_fees()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Compute the platform fee using our function
  NEW.platform_fee_cents := compute_platform_fee_cents(
    COALESCE(NEW.gross_amount_cents, 0), 
    COALESCE(NEW.currency, 'usd')
  );
  
  -- Also update application_fee_cents for backward compatibility
  NEW.application_fee_cents := NEW.platform_fee_cents;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on payments table
DROP TRIGGER IF EXISTS tr_auto_populate_platform_fees ON public.payments;
CREATE TRIGGER tr_auto_populate_platform_fees
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_platform_fees();

-- Backfill existing payment records with computed platform fees
UPDATE public.payments 
SET 
  platform_fee_cents = compute_platform_fee_cents(
    COALESCE(gross_amount_cents, 0), 
    COALESCE(currency, 'usd')
  ),
  application_fee_cents = compute_platform_fee_cents(
    COALESCE(gross_amount_cents, 0), 
    COALESCE(currency, 'usd')
  )
WHERE platform_fee_cents IS NULL OR platform_fee_cents = 0;

-- Add index for efficient fee queries
CREATE INDEX IF NOT EXISTS idx_payments_platform_fee_cents ON public.payments(platform_fee_cents);

-- Create helper view for consistent fee reporting
CREATE OR REPLACE VIEW payment_fees_unified AS
SELECT 
  id,
  booking_id,
  barber_id,
  customer_id,
  gross_amount_cents,
  COALESCE(platform_fee_cents, application_fee_cents, 0) as unified_fee_cents,
  platform_fee_cents,
  application_fee_cents,
  currency,
  status,
  livemode,
  created_at
FROM public.payments;

-- Grant access to the view
GRANT SELECT ON payment_fees_unified TO authenticated;
GRANT SELECT ON payment_fees_unified TO service_role;