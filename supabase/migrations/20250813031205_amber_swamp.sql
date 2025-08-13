/*
  # Fix Admin KPIs Materialized View Calculations

  1. Database Changes
    - Fix barber count to only include verified (claimed + active) barbers
    - Adjust payment filtering to include test payments for development
    - Fix platform fee calculation logic
    - Add proper debugging columns

  2. KPI Corrections
    - Total barbers = only claimed AND active barbers
    - Platform revenue = sum of application_fee_cents from succeeded payments
    - Include both live and test payments for proper calculation
*/

-- Drop and recreate the materialized view with corrected calculations
DROP MATERIALIZED VIEW IF EXISTS public.admin_kpis_mv;

CREATE MATERIALIZED VIEW public.admin_kpis_mv AS
SELECT 
  -- Barber counts (only verified barbers)
  (SELECT COUNT(*) FROM barber_profiles WHERE is_claimed = true AND is_active = true) as total_barbers,
  (SELECT COUNT(*) FROM barber_profiles WHERE is_claimed = true) as claimed_barbers,
  (SELECT COUNT(*) FROM barber_profiles WHERE is_active = true) as active_barbers,
  
  -- Booking counts
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM bookings 
   WHERE appointment_date >= date_trunc('month', CURRENT_DATE)::date) as bookings_this_month,
  (SELECT COUNT(*) FROM bookings 
   WHERE appointment_date = CURRENT_DATE::date) as bookings_today,
  
  -- Payment metrics (include both live and test for development)
  (SELECT COALESCE(SUM(gross_amount_cents), 0) 
   FROM payments 
   WHERE status = 'succeeded') as gross_cents,
   
  (SELECT COALESCE(SUM(application_fee_cents), 0) 
   FROM payments 
   WHERE status = 'succeeded') as platform_cents,
  
  -- Average booking value (from succeeded payments)
  (SELECT COALESCE(AVG(gross_amount_cents), 0) 
   FROM payments 
   WHERE status = 'succeeded') as avg_booking_cents,

  -- Debug info to help troubleshoot
  (SELECT COUNT(*) FROM barber_profiles) as debug_total_barber_profiles,
  (SELECT COUNT(*) FROM payments) as debug_total_payments,
  (SELECT COUNT(*) FROM payments WHERE status = 'succeeded') as debug_succeeded_payments,
  (SELECT COUNT(*) FROM payments WHERE livemode = true) as debug_live_payments,
  (SELECT COUNT(*) FROM payments WHERE livemode = false) as debug_test_payments;

-- Create unique index for concurrent refreshes
CREATE UNIQUE INDEX IF NOT EXISTS admin_kpis_mv_unique_idx ON public.admin_kpis_mv ((1));

-- Update the function to use the corrected view
CREATE OR REPLACE FUNCTION public.get_admin_kpis_v2()
RETURNS TABLE (
  total_barbers bigint,
  claimed_barbers bigint,
  active_barbers bigint,
  total_bookings bigint,
  bookings_this_month bigint,
  bookings_today bigint,
  gross_cents bigint,
  platform_cents bigint,
  avg_booking_cents numeric,
  debug_total_barber_profiles bigint,
  debug_total_payments bigint,
  debug_succeeded_payments bigint,
  debug_live_payments bigint,
  debug_test_payments bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.admin_kpis_mv;
END;
$$;

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW public.admin_kpis_mv;