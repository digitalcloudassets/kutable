import { supabase } from '../lib/supabase';

export interface AdminKPIs {
  totalBarbers: number;
  claimedBarbers: number;
  activeBarbers: number;
  totalBookings: number;
  bookingsThisMonth: number;
  bookingsToday: number;
  totalRevenue: number; // Gross revenue in dollars
  platformRevenue: number; // Platform fee revenue in dollars
  avgBookingValue: number;
}

export async function fetchAdminKpis(): Promise<AdminKPIs> {
  // First try to refresh the materialized view
  try {
    const { error: refreshError } = await supabase.rpc('refresh_admin_kpis_mv');
    if (refreshError) {
      console.warn('Failed to refresh materialized view:', refreshError);
    } else {
      console.log('✅ Admin KPIs materialized view refreshed successfully');
    }
  } catch (refreshError) {
    console.warn('Failed to refresh materialized view, using cached data:', refreshError);
  }

  // Use materialized view function for faster KPI retrieval
  const { data, error } = await supabase.rpc('get_admin_kpis_v2');
  
  if (error) throw error;
  
  // Convert from array to single object (materialized view returns single row)
  const kpiData = Array.isArray(data) ? data[0] : data;

  return {
    totalBarbers: Number(kpiData?.total_barbers || 0),
    claimedBarbers: Number(kpiData?.claimed_barbers || 0),
    activeBarbers: Number(kpiData?.active_barbers || 0),
    totalBookings: Number(kpiData?.total_bookings || 0),
    bookingsThisMonth: Number(kpiData?.bookings_this_month || 0),
    bookingsToday: Number(kpiData?.bookings_today || 0),
    totalRevenue: (Number(kpiData?.gross_cents || 0)) / 100,        // Gross revenue in dollars
    platformRevenue: (Number(kpiData?.platform_cents || 0)) / 100, // Platform revenue in dollars
    avgBookingValue: (Number(kpiData?.avg_booking_cents || 0)) / 100
  };
}

// Helper function to refresh KPIs after data changes
export async function refreshAdminKpis(): Promise<void> {
  try {
    // Refresh materialized view to update KPIs
    const { error } = await supabase.rpc('refresh_admin_kpis_mv');
    if (error) {
      console.warn('Failed to refresh admin KPIs materialized view:', error);
    }
  } catch (error) {
    console.warn('Error refreshing admin KPIs:', error);
  }
}