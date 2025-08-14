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
  Clock,
  Mail,
  Database,
  CheckCircle,
  Edit,
  Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import AdminDataExport from '../components/Admin/AdminDataExport';
import { fetchAdminKpis, AdminKPIs } from '../api/adminKpis';
import { NotificationManager, AdminNotifications } from '../utils/notifications';
import ProductionSecurityCheck from '../components/Security/ProductionSecurityCheck';
import MonitoringDashboard from '../components/Admin/MonitoringDashboard';
import { updateAllBarberSlugs } from '../utils/updateBarberSlugs';
import EnvironmentValidator from '../components/Admin/EnvironmentValidator';
import ProductionReadinessPanel from '../components/Admin/ProductionReadinessPanel';
import ProductionMetricsDashboard from '../components/Admin/ProductionMetricsDashboard';

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
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'barbers' | 'bookings' | 'payments' | 'export'>('overview');
  const [updatingSlugs, setUpdatingSlugs] = useState(false);

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
      
      if (!isConnected) {
        setKpis({
          totalBarbers: 0,
          claimedBarbers: 0,
          activeBarbers: 0,
          totalBookings: 0,
          bookingsThisMonth: 0,
          bookingsToday: 0,
          totalRevenue: 0,
          platformRevenue: 0,
          avgBookingValue: 0
        });
        setLoading(false);
        return;
      }

      // Use materialized view for fast KPI retrieval with debug info
      const kpiData = await fetchAdminKpis();
      console.log('Admin dashboard KPIs loaded:', {
        totalBarbers: kpiData.totalBarbers,
        platformRevenue: kpiData.platformRevenue,
        debugInfo: kpiData.debugInfo
      });
      setKpis(kpiData);

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
  const handleUpdateSlugs = async () => {
    if (!confirm('This will update all barber profiles that have UUID-based slugs to use their business names. Continue?')) {
      return;
    }

    setUpdatingSlugs(true);
    try {
      const result = await updateAllBarberSlugs();
      
      if (result.success) {
        NotificationManager.success(`Successfully updated ${result.updated} barber profile slugs!`);
      } else {
        NotificationManager.error(`Updated ${result.updated} profiles, but ${result.errors.length} had errors. Check console for details.`);
        console.error('Slug update errors:', result.errors);
      }
      
      // Refresh metrics after update
      await loadPlatformMetrics();
    } catch (error) {
      console.error('Error updating slugs:', error);
      NotificationManager.error('Failed to update barber slugs. Please try again.');
    } finally {
      setUpdatingSlugs(false);
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
      <header className="bg-gradient-to-r from-white via-gray-50 to-white border-b border-gray-100 shadow-premium page-header-bg -mt-24 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src="/Kutable Logo.png" 
                  alt="Kutable Logo" 
                  className="h-10 w-auto"
                />
                <div className="absolute -inset-2 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur-md"></div>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-gray-900">Kutable Admin</h1>
                <p className="text-sm text-gray-600 font-medium">Platform Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{adminUser?.username}</p>
                <p className="text-xs text-gray-600 font-medium">{adminUser?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card-premium p-8">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Barbers</h3>
                <div className="bg-primary-100 p-2 rounded-xl">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-2">{kpis?.totalBarbers.toLocaleString() || '0'}</div>
              <p className="text-sm text-gray-500 font-medium">
                {kpis?.claimedBarbers.toLocaleString() || '0'} claimed • {kpis?.activeBarbers.toLocaleString() || '0'} active
              </p>
            </div>

            <div className="card-premium p-8">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Platform Revenue</h3>
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                {formatCurrency(kpis?.totalRevenue || 0)}
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Total gross revenue (all payments)
              </p>
            </div>

            <div className="card-premium p-8">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Platform Revenue</h3>
                <div className="bg-purple-100 p-2 rounded-xl">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                {formatCurrency(kpis?.platformRevenue || 0)}
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Platform fees earned (1%)
              </p>
            </div>

            <div className="card-premium p-8">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Bookings</h3>
                <div className="bg-accent-100 p-2 rounded-xl">
                  <Calendar className="h-5 w-5 text-accent-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-2">{kpis?.totalBookings.toLocaleString() || '0'}</div>
              <p className="text-sm text-gray-500 font-medium">
                {kpis?.bookingsThisMonth.toLocaleString() || '0'} this month • {kpis?.bookingsToday.toLocaleString() || '0'} today
              </p>
            </div>

            <div className="card-premium p-8">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Avg Booking Value</h3>
                <div className="bg-yellow-100 p-2 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                {formatCurrency(kpis?.avgBookingValue || 0)}
              </div>
              <p className="text-sm text-gray-500 font-medium">
                Per booking average
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="card-premium">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-8 py-2">
                {[
                  { id: 'security', label: 'Security', icon: Shield, color: 'red' },
                  { id: 'overview', label: 'Overview', icon: BarChart3, color: 'primary' },
                  { id: 'barbers', label: 'Barbers', icon: Users, color: 'accent' },
                  { id: 'bookings', label: 'Bookings', icon: Calendar, color: 'yellow' },
                  { id: 'payments', label: 'Payments', icon: CreditCard, color: 'emerald' },
                  { id: 'export', label: 'Export', icon: Download, color: 'purple' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-4 border-b-3 font-semibold text-sm flex items-center space-x-3 transition-all duration-200 rounded-t-xl ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 bg-primary-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-8">
              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-8 min-w-0">
                    <div className="bg-red-100 p-3 rounded-2xl flex-none">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900 wrap-anywhere">
                      Security & Production Readiness
                    </h3>
                  </div>
                  <div className="space-y-8">
                    <ProductionSecurityCheck />
                    
                    {/* Import and add new components */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="card-premium p-8 overflow-hidden">
                        <div className="flex items-center space-x-3 mb-6 min-w-0">
                          <div className="bg-blue-100 p-3 rounded-2xl flex-none">
                            <Database className="h-6 w-6 text-blue-600" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 nowrap-ellipsis">Environment Status</h4>
                        </div>
                        <div className="scroll-x">
                          <div className="min-w-[640px] sm:min-w-0">
                            <EnvironmentValidator />
                          </div>
                        </div>
                      </div>
                      
                      <div className="card-premium p-8 overflow-hidden">
                        <div className="flex items-center space-x-3 mb-6 min-w-0">
                          <div className="bg-green-100 p-3 rounded-2xl flex-none">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 nowrap-ellipsis">Production Readiness</h4>
                        </div>
                        <div className="scroll-x">
                          <div className="min-w-[640px] sm:min-w-0">
                            <ProductionReadinessPanel />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <ProductionMetricsDashboard />
                  </div>
                </div>
              )}

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-primary-100 p-3 rounded-2xl">
                      <BarChart3 className="h-6 w-6 text-primary-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">
                    Platform Performance Overview
                    </h3>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-emerald-700 uppercase tracking-wide">Platform Health</span>
                        <div className="bg-emerald-500 p-2 rounded-xl">
                          <Activity className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.claimedBarbers ?? 0) > 0 ? 'Active' : 'Growing'}
                      </div>
                      <p className="text-sm text-emerald-700 font-medium">
                        {(((kpis?.claimedBarbers ?? 0) / (kpis?.totalBarbers ?? 1)) * 100).toFixed(1)}% profiles claimed
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-primary-700 uppercase tracking-wide">Revenue Share</span>
                        <div className="bg-primary-500 p-2 rounded-xl">
                          <DollarSign className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.totalRevenue ?? 0) > 0 ? '1%' : '0%'}
                      </div>
                      <p className="text-sm text-primary-700 font-medium">
                        Platform fee percentage
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-accent-700 uppercase tracking-wide">Growth Rate</span>
                        <div className="bg-accent-500 p-2 rounded-xl">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.bookingsThisMonth ?? 0) > 0 ? '+' : ''}{kpis?.bookingsThisMonth ?? 0}
                      </div>
                      <p className="text-sm text-accent-700 font-medium">
                        Bookings this month
                      </p>
                    </div>
                  </div>

                  {/* Top Performing Barbers */}
                  <div className="card-premium p-8">
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="bg-yellow-100 p-3 rounded-2xl">
                        <Star className="h-6 w-6 text-yellow-600" />
                      </div>
                      <h4 className="text-2xl font-display font-bold text-gray-900">
                      Top Performing Barbers
                      </h4>
                    </div>
                    {(kpis?.topPerformingBarbers ?? []).length > 0 ? (
                      <div className="space-y-6">
                        {(kpis?.topPerformingBarbers ?? []).map((barber, index) => (
                          <div key={index} className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-2xl hover:shadow-md transition-all duration-200">
                            <div>
                              <p className="font-display font-bold text-gray-900 text-lg">{barber.business_name}</p>
                              <p className="text-gray-600 font-medium">{barber.owner_name} • {barber.booking_count} bookings</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display font-bold text-emerald-600 text-xl">
                                {formatCurrency(barber.total_revenue)}
                              </p>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-500 font-medium">{barber.average_rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <BarChart3 className="h-10 w-10 text-gray-400" />
                        </div>
                        <h5 className="text-xl font-display font-bold text-gray-900 mb-3">No performance data yet</h5>
                        <p className="text-gray-600 font-medium">Data will appear here once barbers start receiving bookings.</p>
                      </div>
                    )}
                  </div>

                  {/* Notification System Status */}
                  <div className="card-premium p-8">
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="bg-blue-100 p-3 rounded-2xl">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="text-2xl font-display font-bold text-gray-900">
                        Notification System
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                        <h5 className="font-semibold text-green-800 mb-3">SMS Notifications</h5>
                        <ul className="space-y-2 text-sm text-green-700">
                          <li>• Booking confirmations and updates</li>
                          <li>• 24-hour appointment reminders</li>
                          <li>• Real-time status changes</li>
                          <li>• Rate limited for security</li>
                        </ul>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <h5 className="font-semibold text-blue-800 mb-3">Email Notifications</h5>
                        <ul className="space-y-2 text-sm text-blue-700">
                          <li>• Detailed booking confirmations</li>
                          <li>• Professional email templates</li>
                          <li>• Payment receipts and summaries</li>
                          <li>• Respects user preferences</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-yellow-800 text-sm">
                        <strong>Setup Required:</strong> Configure SendGrid or similar email service in production. 
                        Current setup uses simulation mode for emails.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Barbers Tab */}
              {activeTab === 'barbers' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-accent-100 p-3 rounded-2xl">
                      <Users className="h-6 w-6 text-accent-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">
                    Barber Analytics
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-primary-500 p-3 rounded-2xl">
                          <Building className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-primary-700 bg-primary-200 px-3 py-1.5 rounded-full">DIRECTORY</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.totalBarbers ?? 0).toLocaleString()}
                      </div>
                      <p className="text-primary-800 font-semibold mb-2">Active Barber Profiles</p>
                      <p className="text-sm text-primary-600 font-medium">Verified and active barbers</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-emerald-500 p-3 rounded-2xl">
                          <UserCheck className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-3 py-1.5 rounded-full">CLAIMED</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.claimedBarbers ?? 0).toLocaleString()}
                      </div>
                      <p className="text-emerald-800 font-semibold mb-2">Claimed Profiles</p>
                      <p className="text-sm text-emerald-600 font-medium">
                        {(((kpis?.claimedBarbers ?? 0) / (kpis?.totalBarbers ?? 1)) * 100).toFixed(1)}% of total
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-orange-100 border border-orange-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-orange-500 p-3 rounded-2xl">
                          <Activity className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-200 px-3 py-1.5 rounded-full">AVAILABLE</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {((kpis?.totalBarbers ?? 0) - (kpis?.claimedBarbers ?? 0)).toLocaleString()}
                      </div>
                      <p className="text-orange-800 font-semibold mb-2">Pending Invitations</p>
                      <p className="text-sm text-orange-600 font-medium">Barbers to be invited</p>
                    </div>
                  </div>

                  {!isConnected && (
                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 p-6 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <div className="bg-yellow-500 p-2 rounded-xl">
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-yellow-800 font-medium">
                          Connect Supabase to see detailed barber analytics and profile data
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Slug Update Tool */}
                  {isConnected && (
                    <div className="card-premium p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">Profile URL Management</h4>
                          <p className="text-gray-600 text-sm">Update barber profile URLs to use business names instead of UUIDs</p>
                        </div>
                        <button
                          onClick={handleUpdateSlugs}
                          disabled={updatingSlugs}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {updatingSlugs ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <Edit className="h-4 w-4" />
                              <span>Update All Slugs</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm">
                        This will convert URLs like <code>/barber/uuid</code> to <code>/barber/business-name</code> for better SEO and usability.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-accent-100 p-3 rounded-2xl">
                      <Calendar className="h-6 w-6 text-accent-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">
                    Booking Analytics
                    </h3>
                  </div>

                  {isConnected ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="card-premium p-6">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Total Bookings</p>
                        <p className="text-3xl font-display font-bold text-gray-900">{(kpis?.totalBookings ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="card-premium p-6">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">This Month</p>
                        <p className="text-3xl font-display font-bold text-primary-600">{(kpis?.bookingsThisMonth ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="card-premium p-6">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Today</p>
                        <p className="text-3xl font-display font-bold text-emerald-600">{(kpis?.bookingsToday ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="card-premium p-6">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Average Value</p>
                        <p className="text-3xl font-display font-bold text-accent-600">{formatCurrency(kpis?.avgBookingValue ?? 0)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <PieChartIcon className="h-10 w-10 text-gray-400" />
                      </div>
                      <h5 className="text-xl font-display font-bold text-gray-900 mb-3">Connect Supabase</h5>
                      <p className="text-gray-600 font-medium">Connect to view booking analytics</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-emerald-100 p-3 rounded-2xl">
                      <CreditCard className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">
                    Payment Analytics
                    </h3>
                  </div>

                  {isConnected ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="bg-emerald-500 p-3 rounded-2xl">
                            <DollarSign className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-3 py-1.5 rounded-full">EARNED</span>
                        </div>
                        <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                          {formatCurrency(kpis?.platformRevenue || 0)}
                        </div>
                        <p className="text-emerald-800 font-semibold mb-2">Platform Fees Collected</p>
                        <p className="text-sm text-emerald-600 font-medium">1% of gross volume</p>
                      </div>

                      <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-8 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="bg-primary-500 p-3 rounded-2xl">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-primary-700 bg-primary-200 px-3 py-1.5 rounded-full">VOLUME</span>
                        </div>
                        <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                          {formatCurrency(kpis?.totalRevenue || 0)}
                        </div>
                        <p className="text-primary-800 font-semibold mb-2">Total Volume Processed</p>
                        <p className="text-sm text-primary-600 font-medium">Gross booking revenue</p>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-8 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div className="bg-orange-500 p-3 rounded-2xl">
                            <Shield className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-orange-700 bg-orange-200 px-3 py-1.5 rounded-full">ACTIVE</span>
                        </div>
                        <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                          {kpis?.claimedBarbers.toLocaleString() || '0'}
                        </div>
                        <p className="text-orange-800 font-semibold mb-2">Connected Accounts</p>
                        <p className="text-sm text-orange-600 font-medium">Barbers with Stripe accounts</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <CreditCard className="h-10 w-10 text-gray-400" />
                      </div>
                      <h5 className="text-xl font-display font-bold text-gray-900 mb-3">Connect Supabase</h5>
                      <p className="text-gray-600 font-medium">Connect to view payment analytics</p>
                    </div>
                  )}
                </div>
              )}

              {/* Export Tab */}
              {activeTab === 'export' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-purple-100 p-3 rounded-2xl">
                      <Download className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">
                    Data Export Center
                    </h3>
                  </div>
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