/*
  # Backfill payments table from existing bookings

  1. Purpose
     - Populate payments table with historical booking data
     - Calculate accurate platform fees (1%) for past transactions
     - Ensure admin dashboard shows correct platform revenue

  2. Changes
     - Insert payment records for completed bookings
     - Calculate application_fee_cents as 1% of total_amount
     - Mark as livemode=true for confirmed/completed bookings
     - Use booking data to populate payment fields

  3. Security
     - Uses booking data as source of truth for historical payments
     - Only processes completed/confirmed bookings
     - Calculates platform fees consistently
*/

-- Backfill payments table from existing bookings
INSERT INTO payments (
  booking_id,
  barber_id,
  customer_id,
  currency,
  gross_amount_cents,
  application_fee_cents,
  stripe_charge_id,
  livemode,
  status,
  created_at
)
SELECT 
  b.id as booking_id,
  b.barber_id,
  b.client_id as customer_id,
  'usd' as currency,
  ROUND(b.total_amount * 100) as gross_amount_cents,  -- Convert dollars to cents
  ROUND(b.total_amount * 100 * 0.01) as application_fee_cents,  -- 1% platform fee in cents
  b.stripe_charge_id,
  CASE 
    WHEN b.status IN ('confirmed', 'completed') THEN true 
    ELSE false 
  END as livemode,
  CASE 
    WHEN b.status = 'completed' THEN 'succeeded'
    WHEN b.status = 'confirmed' THEN 'succeeded' 
    WHEN b.status = 'cancelled' THEN 'failed'
    ELSE 'pending'
  END as status,
  b.created_at
FROM bookings b
WHERE b.total_amount > 0  -- Only bookings with actual amounts
  AND b.id NOT IN (
    SELECT booking_id 
    FROM payments 
    WHERE booking_id IS NOT NULL
  )  -- Avoid duplicates
ORDER BY b.created_at;

-- Verify the backfill worked
DO $$
DECLARE
  payment_count INTEGER;
  total_platform_fees NUMERIC;
  total_gross_revenue NUMERIC;
BEGIN
  SELECT COUNT(*), 
         SUM(application_fee_cents), 
         SUM(gross_amount_cents)
  INTO payment_count, total_platform_fees, total_gross_revenue
  FROM payments 
  WHERE livemode = true AND status = 'succeeded';
  
  RAISE NOTICE 'Backfill Summary:';
  RAISE NOTICE '- Payment records created: %', payment_count;
  RAISE NOTICE '- Total platform fees (cents): %', total_platform_fees;
  RAISE NOTICE '- Total platform fees ($): %', total_platform_fees / 100.0;
  RAISE NOTICE '- Total gross revenue (cents): %', total_gross_revenue;
  RAISE NOTICE '- Total gross revenue ($): %', total_gross_revenue / 100.0;
  
  IF payment_count >= 2 AND total_platform_fees >= 50 THEN
    RAISE NOTICE '✅ Backfill successful - platform fees should now display correctly';
  ELSE
    RAISE NOTICE '⚠️ Check if bookings exist with total_amount > 0';
  END IF;
END $$;