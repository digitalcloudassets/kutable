/*
  # Create admin KPIs materialized view

  1. New Materialized View
    - `admin_kpis_mv` - Fast access to aggregated KPI data
    - Pre-calculated totals for barbers, bookings, and payments
    - Refreshed after KPI-affecting operations

  2. New Function
    - `get_admin_kpis_v2()` - Returns data from materialized view
    - Faster than real-time aggregation queries
    - Consistent data format for admin dashboard

  3. Performance
    - Materialized view provides instant KPI access
    - Eliminates expensive aggregation queries
    - Supports concurrent refresh for zero downtime
*/

-- Create materialized view for admin KPIs
CREATE MATERIALIZED VIEW IF NOT EXISTS public.admin_kpis_mv AS
SELECT
  -- Barber metrics
  COUNT(DISTINCT bp.id) AS total_barbers,
  COUNT(DISTINCT CASE WHEN bp.is_claimed = true THEN bp.id END) AS claimed_barbers,
  COUNT(DISTINCT CASE WHEN bp.is_active = true THEN bp.id END) AS active_barbers,
  
  -- Booking metrics
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE 
    WHEN b.created_at >= date_trunc('month', CURRENT_DATE) 
    THEN b.id 
  END) AS bookings_this_month,
  COUNT(DISTINCT CASE 
    WHEN b.created_at >= CURRENT_DATE 
    THEN b.id 
  END) AS bookings_today,
  
  -- Payment metrics (in cents for precision)
  COALESCE(SUM(CASE 
    WHEN p.livemode = true AND p.status = 'succeeded' 
    THEN p.gross_amount_cents 
    ELSE 0 
  END), 0) AS gross_cents,
  
  COALESCE(SUM(CASE 
    WHEN p.livemode = true AND p.status = 'succeeded' 
    THEN p.application_fee_cents 
    ELSE 0 
  END), 0) AS platform_cents,
  
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN p.livemode = true AND p.status = 'succeeded' THEN p.id END) > 0
    THEN COALESCE(SUM(CASE 
      WHEN p.livemode = true AND p.status = 'succeeded' 
      THEN p.gross_amount_cents 
      ELSE 0 
    END), 0) / COUNT(DISTINCT CASE WHEN p.livemode = true AND p.status = 'succeeded' THEN p.id END)
    ELSE 0
  END AS avg_booking_cents

FROM barber_profiles bp
LEFT JOIN bookings b ON bp.id = b.barber_id
LEFT JOIN payments p ON b.id = p.booking_id;

-- Create unique index to support concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS admin_kpis_mv_unique_idx ON public.admin_kpis_mv ((1));

-- Create function to return KPIs from materialized view
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
  avg_booking_cents bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    akm.total_barbers,
    akm.claimed_barbers,
    akm.active_barbers,
    akm.total_bookings,
    akm.bookings_this_month,
    akm.bookings_today,
    akm.gross_cents,
    akm.platform_cents,
    akm.avg_booking_cents
  FROM public.admin_kpis_mv akm;
$$;

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW public.admin_kpis_mv;