import { supabase } from '../lib/supabase';

export interface AdminKPIs {
  totalBarbers: number;
  claimedBarbers: number;
  activeBarbers: number;
  totalBookings: number;
  bookingsThisMonth: number;
  bookingsToday: number;
  totalRevenue: number; // Platform revenue in dollars
  avgBookingValue: number;
  topPerformingBarbers: Array<{
    business_name: string;
    owner_name: string;
    booking_count: number;
    total_revenue: number;
    average_rating: number;
  }>;
}

export async function fetchAdminKpis(): Promise<AdminKPIs> {
  const { data, error } = await supabase.rpc('get_admin_kpis');
  
  if (error) throw error;
  
  return {
    totalBarbers: data.total_barbers,
    claimedBarbers: data.claimed_barbers,
    activeBarbers: data.active_barbers,
    totalBookings: data.total_bookings,
    bookingsThisMonth: data.bookings_this_month,
    bookingsToday: data.bookings_today,
    totalRevenue: (data.platform_cents ?? 0) / 100,   // platform revenue ($)
    avgBookingValue: (data.avg_booking_cents ?? 0) / 100
  };
}