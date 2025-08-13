/*
  # Add refresh function for admin KPIs materialized view

  1. Refresh Function
    - `refresh_admin_kpis_mv()` - Safely refreshes materialized view
    - Uses CONCURRENTLY when possible for zero downtime
    - Handles errors gracefully for edge cases

  2. Security
    - Function is SECURITY DEFINER to allow execution
    - Can be called by authenticated users to refresh KPIs
*/

-- Create function to refresh admin KPIs materialized view
CREATE OR REPLACE FUNCTION public.refresh_admin_kpis_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try concurrent refresh first (requires unique index)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.admin_kpis_mv;
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to regular refresh if concurrent fails
    BEGIN
      REFRESH MATERIALIZED VIEW public.admin_kpis_mv;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE WARNING 'Failed to refresh admin_kpis_mv: %', SQLERRM;
    END;
  END;
END;
$$;