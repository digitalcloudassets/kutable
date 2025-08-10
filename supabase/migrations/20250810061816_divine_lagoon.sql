/*
  # Admin KPIs View and RPC Function

  1. Views
    - `admin_kpis` view for unified KPI calculation from multiple tables
    
  2. Functions  
    - `get_admin_kpis()` RPC function for frontend access
    
  3. Security
    - Grant execute permission on RPC to authenticated users
    - Uses security definer for admin access to all tables
*/

-- Create admin KPIs view for single source of truth
create or replace view admin_kpis as
with succeeded as (
  select * from payments
  where livemode = true and status = 'succeeded'
),
bookings_agg as (
  select
    count(*) as total_bookings,
    count(*) filter (where date_trunc('month', created_at) = date_trunc('month', now())) as bookings_this_month,
    count(*) filter (where created_at::date = current_date) as bookings_today
  from bookings
),
revenue_agg as (
  select
    coalesce(sum(gross_amount_cents), 0)         as gross_cents,
    coalesce(sum(application_fee_cents), 0)      as platform_cents,
    coalesce(avg(gross_amount_cents), 0)::bigint as avg_booking_cents
  from succeeded
),
barbers_agg as (
  select
    count(*)                                   as total_barbers,
    count(*) filter (where is_claimed = true) as claimed_barbers,
    count(*) filter (where status = 'active') as active_barbers
  from barber_profiles
)
select
  b.total_barbers, b.claimed_barbers, b.active_barbers,
  bk.total_bookings, bk.bookings_this_month, bk.bookings_today,
  r.gross_cents, r.platform_cents, r.avg_booking_cents
from barbers_agg b, bookings_agg bk, revenue_agg r;

-- Create RPC function for frontend access
create or replace function get_admin_kpis()
returns admin_kpis
language sql
stable
security definer
as $$
  select * from admin_kpis;
$$;

-- Grant execute permission to authenticated users (admins will use this)
grant execute on function get_admin_kpis() to authenticated;