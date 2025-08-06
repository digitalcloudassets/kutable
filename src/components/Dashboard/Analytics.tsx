import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Star, 
  Users,
  BarChart3,
  PieChart,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { 
  getLastNMonthsRange, 
  getStartOfToday, 
  getEndOfToday,
  getStartOfThisMonth,
  getEndOfThisMonth,
  isThisMonth,
  formatShortDate
} from '../../shared/utils/dateHelpers';

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  averageRating: number;
  totalReviews: number;
  monthlyRevenue: Array<{ month: string; revenue: number; bookings: number }>;
  servicePerformance: Array<{ name: string; bookings: number; revenue: number }>;
  recentReviews: Array<{
    rating: number;
    comment: string | null;
    created_at: string;
    client_name: string;
  }>;
}

interface AnalyticsProps {
  barberId: string;
}

const Analytics: React.FC<AnalyticsProps> = ({ barberId }) => {
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    monthlyRevenue: [],
    servicePerformance: [],
    recentReviews: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('3months');

  useEffect(() => {
    fetchAnalytics();
  }, [barberId, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const monthsBack = dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
      const { start: startDate, end: endDate } = getLastNMonthsRange(monthsBack);

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          total_amount,
          status,
          created_at,
          services (
            name
          ),
          client_profiles (
            first_name,
            last_name
          )
        `)
        .eq('barber_id', barberId)
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'));

      if (bookingsError) throw bookingsError;

      // Fetch reviews data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          rating,
          comment,
          created_at,
          client_profiles (
            first_name,
            last_name
          )
        `)
        .eq('barber_id', barberId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (reviewsError) throw reviewsError;

      // Process data
      const totalBookings = bookingsData?.length || 0;
      const totalRevenue = bookingsData?.reduce((sum, booking) => 
        booking.status === 'completed' ? sum + Number(booking.total_amount) : sum, 0) || 0;

      const platformFees = bookingsData?.reduce((sum, booking) => 
        sum + Number(booking.platform_fee), 0) || 0;

      // Calculate today's bookings
      const todayStr = format(getStartOfToday(), 'yyyy-MM-dd');
      const bookingsToday = bookingsData?.filter(booking => 
        booking.created_at.split('T')[0] === todayStr).length || 0;

      // Calculate this month's bookings
      const bookingsThisMonth = bookingsData?.filter(booking => 
        isThisMonth(booking.created_at)).length || 0;

      // Calculate monthly revenue
      const monthlyRevenue = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const { start: monthStart, end: monthEnd } = getLastNMonthsRange(i + 1);
        const monthBookings = bookingsData?.filter(booking => {
          const bookingDate = new Date(booking.appointment_date);
          return bookingDate >= monthStart && bookingDate <= monthEnd && booking.status === 'completed';
        }) || [];
        
        monthlyRevenue.push({
          month: format(monthStart, 'MMM yyyy'),
          revenue: monthBookings.reduce((sum, booking) => sum + Number(booking.total_amount), 0),
          bookings: monthBookings.length
        });
      }

      // Calculate service performance
      const serviceStats: { [key: string]: { bookings: number; revenue: number } } = {};
      bookingsData?.forEach(booking => {
        if (booking.services && booking.status === 'completed') {
          const serviceName = booking.services.name;
          if (!serviceStats[serviceName]) {
            serviceStats[serviceName] = { bookings: 0, revenue: 0 };
          }
          serviceStats[serviceName].bookings++;
          serviceStats[serviceName].revenue += Number(booking.total_amount);
        }
      });

      const servicePerformance = Object.entries(serviceStats).map(([name, stats]) => ({
        name,
        ...stats
      }));

      // Process reviews
      const recentReviews = reviewsData?.map(review => ({
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        client_name: review.client_profiles 
          ? `${review.client_profiles.first_name} ${review.client_profiles.last_name}`
          : 'Anonymous'
      })) || [];

      const averageRating = reviewsData?.length 
        ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length 
        : 0;

      setData({
        totalRevenue,
        totalBookings,
        averageRating,
        totalReviews: reviewsData?.length || 0,
        monthlyRevenue,
        servicePerformance,
        recentReviews
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Month', 'Revenue', 'Bookings'],
      ...data.monthlyRevenue.map(month => [month.month, month.revenue, month.bookings])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
          </select>
          
          <button
            onClick={exportData}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${data.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalBookings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{data.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalReviews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-6 w-6 text-orange-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
          </div>
          
          <div className="space-y-4">
            {data.monthlyRevenue.map((month, index) => {
              const maxRevenue = Math.max(...data.monthlyRevenue.map(m => m.revenue));
              const percentage = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{month.month}</span>
                    <span className="text-sm font-bold text-gray-900">${month.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{month.bookings} bookings</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Performance */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-6">
            <PieChart className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Service Performance</h3>
          </div>
          
          <div className="space-y-4">
            {data.servicePerformance.map((service, index) => {
              const maxRevenue = Math.max(...data.servicePerformance.map(s => s.revenue));
              const percentage = maxRevenue > 0 ? (service.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{service.name}</span>
                    <span className="text-sm font-bold text-gray-900">${service.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{service.bookings} bookings</p>
                </div>
              );
            })}
          </div>

          {data.servicePerformance.length === 0 && (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No service data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center mb-6">
          <Star className="h-6 w-6 text-yellow-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Reviews</h3>
        </div>

        {data.recentReviews.length > 0 ? (
          <div className="space-y-4">
            {data.recentReviews.map((review, index) => (
              <div key={index} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{review.client_name}</span>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      {format(new Date(review.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No reviews yet</p>
            <p className="text-sm text-gray-500">Reviews from customers will appear here</p>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex items-center mb-6">
          <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${data.totalBookings > 0 ? (data.totalRevenue / data.totalBookings).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-gray-600">Average Booking Value</p>
          </div>

          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.monthlyRevenue.length > 0 
                ? (data.totalBookings / data.monthlyRevenue.length).toFixed(1)
                : '0'
              }
            </p>
            <p className="text-sm text-gray-600">Bookings per Month</p>
          </div>

          <div className="text-center">
            <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.totalReviews > 0 ? ((data.totalReviews / data.totalBookings) * 100).toFixed(0) : '0'}%
            </p>
            <p className="text-sm text-gray-600">Review Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;