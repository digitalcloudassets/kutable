/*
  # Fix Platform Fee Calculation in Admin KPIs

  1. Updates
    - Fix platform_cents calculation to use application_fee_cents from payments table
    - Add proper debugging columns to track payment data
    - Ensure only succeeded payments are counted
    - Add validation for application_fee_cents values

  2. Debug Information
    - Track total payments vs succeeded payments
    - Show live vs test payment breakdown
    - Validate application_fee_cents data
*/

-- Drop and recreate the materialized view with better platform fee calculation
DROP MATERIALIZED VIEW IF EXISTS public.admin_kpis_mv;

-- Create the corrected materialized view
CREATE MATERIALIZED VIEW public.admin_kpis_mv AS
WITH barber_counts AS (
  SELECT 
    COUNT(*) as total_barbers,
    COUNT(*) FILTER (WHERE is_claimed = true) as claimed_barbers,
    COUNT(*) FILTER (WHERE is_claimed = true AND is_active = true) as active_barbers
  FROM barber_profiles
),
booking_counts AS (
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE DATE(appointment_date) >= DATE_TRUNC('month', CURRENT_DATE)) as bookings_this_month,
    COUNT(*) FILTER (WHERE DATE(appointment_date) = CURRENT_DATE) as bookings_today
  FROM bookings
),
payment_totals AS (
  SELECT 
    COALESCE(SUM(gross_amount_cents), 0) as gross_cents,
    COALESCE(SUM(application_fee_cents), 0) as platform_cents,
    COALESCE(AVG(gross_amount_cents), 0) as avg_booking_cents,
    -- Debug fields
    COUNT(*) as debug_total_payments,
    COUNT(*) FILTER (WHERE status = 'succeeded') as debug_succeeded_payments,
    COUNT(*) FILTER (WHERE livemode = true) as debug_live_payments,
    COUNT(*) FILTER (WHERE livemode = false) as debug_test_payments,
    SUM(application_fee_cents) FILTER (WHERE status = 'succeeded') as debug_platform_fees_succeeded,
    SUM(application_fee_cents) FILTER (WHERE status = 'succeeded' AND livemode = true) as debug_platform_fees_live,
    SUM(application_fee_cents) FILTER (WHERE status = 'succeeded' AND livemode = false) as debug_platform_fees_test
  FROM payments 
  WHERE status = 'succeeded'
),
debug_barber_data AS (
  SELECT COUNT(*) as debug_total_barber_profiles
  FROM barber_profiles
)
SELECT 
  bc.total_barbers,
  bc.claimed_barbers,
  bc.active_barbers,
  bk.total_bookings,
  bk.bookings_this_month,
  bk.bookings_today,
  pt.gross_cents,
  pt.platform_cents,
  pt.avg_booking_cents,
  -- Debug information
  db.debug_total_barber_profiles,
  pt.debug_total_payments,
  pt.debug_succeeded_payments,
  pt.debug_live_payments,
  pt.debug_test_payments,
  pt.debug_platform_fees_succeeded,
  pt.debug_platform_fees_live,
  pt.debug_platform_fees_test
FROM barber_counts bc
CROSS JOIN booking_counts bk
CROSS JOIN payment_totals pt
CROSS JOIN debug_barber_data db;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS admin_kpis_mv_unique_idx ON public.admin_kpis_mv ((true));

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW public.admin_kpis_mv;

-- Update the function to use the new materialized view
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
  avg_booking_cents bigint,
  debug_total_barber_profiles bigint,
  debug_total_payments bigint,
  debug_succeeded_payments bigint,
  debug_live_payments bigint,
  debug_test_payments bigint,
  debug_platform_fees_succeeded bigint,
  debug_platform_fees_live bigint,
  debug_platform_fees_test bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    mv.total_barbers,
    mv.claimed_barbers,
    mv.active_barbers,
    mv.total_bookings,
    mv.bookings_this_month,
    mv.bookings_today,
    mv.gross_cents,
    mv.platform_cents,
    mv.avg_booking_cents,
    mv.debug_total_barber_profiles,
    mv.debug_total_payments,
    mv.debug_succeeded_payments,
    mv.debug_live_payments,
    mv.debug_test_payments,
    mv.debug_platform_fees_succeeded,
    mv.debug_platform_fees_live,
    mv.debug_platform_fees_test
  FROM public.admin_kpis_mv mv;
$$;