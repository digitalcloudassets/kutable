import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Shield, 
  LogOut,
  Activity,
  CreditCard,
  UserCheck,
  AlertCircle,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Building,
  Star,
  Clock
} from 'lucide-react';
import { supabase, getRealBarberCount } from '../lib/supabase';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import AdminDataExport from '../components/Admin/AdminDataExport';
import { NotificationManager, AdminNotifications } from '../utils/notifications';

interface PlatformMetrics {
  totalBarbers: number;
  activeBarbers: number;
  claimedBarbers: number;
  totalBookings: number;
  totalRevenue: number;
  platformFees: number;
  bookingsToday: number;
  bookingsThisMonth: number;
  avgBookingValue: number;
  topPerformingBarbers: Array<{
    business_name: string;
    owner_name: string;
    booking_count: number;
    total_revenue: number;
    average_rating: number;
  }>;
}

interface AdminUser {
  username: string;
  role: string;
  loginTime: string;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useSupabaseConnection();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalBarbers: 0,
    activeBarbers: 0,
    claimedBarbers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    platformFees: 0,
    bookingsToday: 0,
    bookingsThisMonth: 0,
    avgBookingValue: 0,
    topPerformingBarbers: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'barbers' | 'bookings' | 'payments' | 'export'>('overview');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (adminUser) {
      loadPlatformMetrics();
    }
  }, [adminUser, isConnected]);

  const checkAuth = () => {
    const isAuthenticated = localStorage.getItem('admin_authenticated');
    const sessionData = localStorage.getItem('admin_session');
    
    if (!isAuthenticated || !sessionData) {
      navigate('/admin-login');
      return;
    }
    
    try {
      const session = JSON.parse(atob(sessionData));
      
      // Check if session has expired
      if (new Date() > new Date(session.expires)) {
        localStorage.removeItem('admin_authenticated');
        localStorage.removeItem('admin_session');
        navigate('/admin-login');
        return;
      }
      
      setAdminUser(session);
    } catch (error) {
      localStorage.removeItem('admin_authenticated');
      localStorage.removeItem('admin_session');
      navigate('/admin-login');
    }
  };

  const loadPlatformMetrics = async () => {
    try {
      setLoading(true);
      
      // Get total barber count from CSV
      const csvBarberCount = await getRealBarberCount();
      
      if (!isConnected) {
        // When Supabase not connected, show CSV directory stats
        setMetrics({
          totalBarbers: csvBarberCount,
          activeBarbers: csvBarberCount, // All CSV barbers are considered active
          claimedBarbers: 0, // No claimed barbers without database
          totalBookings: 0,
          totalRevenue: 0,
          platformFees: 0,
          bookingsToday: 0,
          bookingsThisMonth: 0,
          avgBookingValue: 0,
          topPerformingBarbers: []
        });
        setLoading(false);
        return;
      }

      // Get barber metrics
      const { data: barbersData } = await supabase
        .from('barber_profiles')
        .select('id, business_name, owner_name, is_claimed, is_active, average_rating');

      const totalBarbers = csvBarberCount + (barbersData?.length || 0);
      const claimedBarbers = barbersData?.filter(b => b.is_claimed).length || 0;
      const activeBarbers = csvBarberCount + (barbersData?.filter(b => b.is_active).length || 0);

      // Get booking metrics
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('total_amount, platform_fee, appointment_date, created_at, status');

      const totalBookings = bookingsData?.length || 0;
      const totalRevenue = bookingsData?.reduce((sum, booking) => 
        sum + Number(booking.total_amount), 0) || 0;
      const platformFees = bookingsData?.reduce((sum, booking) => 
        sum + Number(booking.platform_fee), 0) || 0;

      // Calculate today's bookings
      const today = new Date().toISOString().split('T')[0];
      const bookingsToday = bookingsData?.filter(booking => 
        booking.created_at.split('T')[0] === today).length || 0;

      // Calculate this month's bookings
      const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM format
      const bookingsThisMonth = bookingsData?.filter(booking => 
        booking.created_at.substring(0, 7) === thisMonth).length || 0;

      const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Get top performing barbers
      const { data: topBarbers } = await supabase
        .from('barber_profiles')
        .select(`
          business_name,
          owner_name,
          average_rating,
          bookings!inner(total_amount)
        `)
        .eq('is_claimed', true)
        .eq('is_active', true)
        .limit(5);

      const topPerformingBarbers = topBarbers?.map(barber => {
        const bookingCount = Array.isArray(barber.bookings) ? barber.bookings.length : 0;
        const totalRevenue = Array.isArray(barber.bookings) 
          ? barber.bookings.reduce((sum: number, booking: any) => sum + Number(booking.total_amount), 0)
          : 0;
        
        return {
          business_name: barber.business_name,
          owner_name: barber.owner_name,
          booking_count: bookingCount,
          total_revenue: totalRevenue,
          average_rating: barber.average_rating
        };
      }).sort((a, b) => b.total_revenue - a.total_revenue) || [];

      setMetrics({
        totalBarbers,
        activeBarbers,
        claimedBarbers,
        totalBookings,
        totalRevenue,
        platformFees,
        bookingsToday,
        bookingsThisMonth,
        avgBookingValue,
        topPerformingBarbers
      });

    } catch (error) {
      console.error('Error loading platform metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_session');
    navigate('/admin-login');
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const exportData = (type: string) => {
    try {
      AdminNotifications.dataExported(type);
    } catch (error) {
      NotificationManager.error(`Failed to export ${type} data`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
          <p className="text-gray-600">Loading platform metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/Kutable Logo.png" 
                alt="Kutable Logo" 
                className="h-8 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kutable Admin</h1>
                <p className="text-xs text-gray-600">Platform Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-900">{adminUser?.username}</p>
                <p className="text-xs text-gray-600">{adminUser?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SupabaseConnectionBanner isConnected={isConnected} />
        
        <div className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Barbers</h3>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalBarbers.toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                {metrics.claimedBarbers.toLocaleString()} claimed • {metrics.activeBarbers.toLocaleString()} active
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalRevenue)}
              </div>
              <p className="text-xs text-gray-500">
                Platform fees: {formatCurrency(metrics.platformFees)}
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Bookings</h3>
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{metrics.totalBookings.toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                {metrics.bookingsThisMonth.toLocaleString()} this month • {metrics.bookingsToday.toLocaleString()} today
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg Booking Value</h3>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.avgBookingValue)}
              </div>
              <p className="text-xs text-gray-500">
                Per booking average
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'barbers', label: 'Barbers', icon: Users },
                  { id: 'bookings', label: 'Bookings', icon: Calendar },
                  { id: 'payments', label: 'Payments', icon: CreditCard },
                  { id: 'export', label: 'Export', icon: Download }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                    Platform Performance Overview
                  </h3>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Platform Health</span>
                        <Activity className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {metrics.claimedBarbers > 0 ? 'Active' : 'Growing'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {((metrics.claimedBarbers / metrics.totalBarbers) * 100).toFixed(1)}% profiles claimed
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Revenue Share</span>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {metrics.totalRevenue > 0 ? ((metrics.platformFees / metrics.totalRevenue) * 100).toFixed(1) + '%' : '0%'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Platform fee percentage
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Growth Rate</span>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {metrics.bookingsThisMonth > 0 ? '+' : ''}{metrics.bookingsThisMonth}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Bookings this month
                      </p>
                    </div>
                  </div>

                  {/* Top Performing Barbers */}
                  <div className="bg-gray-50 border border-gray-100 p-6 rounded-lg">
                    <h4 className="text-gray-900 font-medium mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-orange-500" />
                      Top Performing Barbers
                    </h4>
                    {metrics.topPerformingBarbers.length > 0 ? (
                      <div className="space-y-4">
                        {metrics.topPerformingBarbers.map((barber, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded">
                            <div>
                              <p className="font-medium text-gray-900">{barber.business_name}</p>
                              <p className="text-sm text-gray-600">{barber.owner_name} • {barber.booking_count} bookings</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-emerald-400">
                                {formatCurrency(barber.total_revenue)}
                              </p>
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-500">{barber.average_rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-600">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No performance data yet</p>
                        <p className="text-sm text-gray-600">Data will appear here once barbers start receiving bookings.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Barbers Tab */}
              {activeTab === 'barbers' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    Barber Analytics
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <Building className="h-6 w-6 text-blue-600" />
                        <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">DIRECTORY</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {metrics.totalBarbers.toLocaleString()}
                      </div>
                      <p className="text-blue-800 text-sm">Total Barber Profiles</p>
                      <p className="text-xs text-blue-600 mt-2">Includes CSV directory + claimed profiles</p>
                    </div>

                    <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <UserCheck className="h-6 w-6 text-green-600" />
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">CLAIMED</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {metrics.claimedBarbers.toLocaleString()}
                      </div>
                      <p className="text-green-800 text-sm">Claimed Profiles</p>
                      <p className="text-xs text-green-600 mt-2">
                        {((metrics.claimedBarbers / metrics.totalBarbers) * 100).toFixed(1)}% of total directory
                      </p>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <Activity className="h-6 w-6 text-orange-600" />
                        <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">AVAILABLE</span>
                      </div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {(metrics.totalBarbers - metrics.claimedBarbers).toLocaleString()}
                      </div>
                      <p className="text-orange-800 text-sm">Unclaimed Profiles</p>
                      <p className="text-xs text-orange-600 mt-2">Available for claiming</p>
                    </div>
                  </div>

                  {!isConnected && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <p className="text-yellow-800 text-sm">
                          Connect Supabase to see detailed barber analytics and claimed profile data
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    Booking Analytics
                  </h3>

                  {isConnected ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Total Bookings</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.totalBookings.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-blue-400">{metrics.bookingsThisMonth.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Today</p>
                        <p className="text-2xl font-bold text-green-400">{metrics.bookingsToday.toLocaleString()}</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Average Value</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.avgBookingValue)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Connect Supabase to view booking analytics</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-orange-500" />
                    Payment Analytics
                  </h3>

                  {isConnected ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <DollarSign className="h-6 w-6 text-emerald-600" />
                          <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded">EARNED</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-400 mb-1">
                          {formatCurrency(metrics.platformFees)}
                        </div>
                        <p className="text-emerald-800 text-sm">Platform Fees Collected</p>
                        <p className="text-xs text-emerald-600 mt-2">1% of gross volume</p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <TrendingUp className="h-6 w-6 text-blue-600" />
                          <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">VOLUME</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {formatCurrency(metrics.totalRevenue)}
                        </div>
                        <p className="text-blue-800 text-sm">Total Volume Processed</p>
                        <p className="text-xs text-blue-600 mt-2">Gross booking revenue</p>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <Shield className="h-6 w-6 text-orange-600" />
                          <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded">ACTIVE</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {metrics.claimedBarbers.toLocaleString()}
                        </div>
                        <p className="text-orange-800 text-sm">Connected Accounts</p>
                        <p className="text-xs text-orange-600 mt-2">Barbers with Stripe accounts</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Connect Supabase to view payment analytics</p>
                    </div>
                  )}
                </div>
              )}

              {/* Export Tab */}
              {activeTab === 'export' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Download className="h-5 w-5 text-orange-500" />
                    Data Export Center
                  </h3>
                  <AdminDataExport />
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminPage;