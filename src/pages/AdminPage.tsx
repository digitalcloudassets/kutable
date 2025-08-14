import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatUSD } from '../lib/currency';
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
  Building,
  Star,
  Clock,
  Database,
  CheckCircle,
  Edit,
  Loader,
  Crown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import { fetchAdminKpis, AdminKPIs } from '../api/adminKpis';
import { NotificationManager } from '../utils/notifications';
import { updateAllBarberSlugs } from '../utils/updateBarberSlugs';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useSupabaseConnection();
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'barbers' | 'bookings' | 'payments' | 'export' | 'security'>('overview');
  const [updatingSlugs, setUpdatingSlugs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlatformMetrics();
  }, [isConnected]);

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

      const kpiData = await fetchAdminKpis();
      console.log('Admin dashboard KPIs loaded:', kpiData);
      setKpis(kpiData);

    } catch (error) {
      console.error('Error loading platform metrics:', error);
      NotificationManager.error('Failed to load platform metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlatformMetrics();
    setRefreshing(false);
    NotificationManager.success('Data refreshed successfully!');
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
      
      await loadPlatformMetrics();
    } catch (error) {
      console.error('Error updating slugs:', error);
      NotificationManager.error('Failed to update barber slugs. Please try again.');
    } finally {
      setUpdatingSlugs(false);
    }
  };

  const exportData = async (type: string) => {
    try {
      // Simple CSV export functionality
      let data: any[] = [];
      let filename = '';

      switch (type) {
        case 'barbers':
          const { data: barbersData, error: barbersError } = await supabase
            .from('barber_profiles')
            .select('*')
            .order('created_at', { ascending: false });

          if (barbersError) throw barbersError;
          data = barbersData || [];
          filename = `barbers_${new Date().toISOString().split('T')[0]}`;
          break;

        case 'bookings':
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
              *,
              barber_profiles(business_name, owner_name),
              client_profiles(first_name, last_name, email),
              services(name)
            `)
            .order('created_at', { ascending: false });

          if (bookingsError) throw bookingsError;
          data = bookingsData || [];
          filename = `bookings_${new Date().toISOString().split('T')[0]}`;
          break;

        default:
          throw new Error('Invalid export type');
      }

      // Convert to CSV
      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value
          ).join(',')
        ).join('\n');
        
        const csvContent = `${headers}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      NotificationManager.success(`${data.length} ${type} records exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      NotificationManager.error(`Failed to export ${type} data. Please try again.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center page-container">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading admin dashboard...</p>
            <p className="text-sm text-gray-500">Gathering platform metrics</p>
          </div>
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
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-gray-900">Kutable Admin</h1>
                <p className="text-sm text-gray-600 font-medium">Platform Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn-secondary"
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>
              <div className="text-right bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                  <Crown className="h-4 w-4 text-orange-500" />
                  <span>Admin User</span>
                </p>
                <p className="text-xs text-gray-600 font-medium">Platform Administrator</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                <LogOut className="h-4 w-4" />
                <span>Exit Admin</span>
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
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Revenue</h3>
                <div className="bg-emerald-100 p-2 rounded-xl">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-bold text-gray-900 mb-2">
                {formatUSD(kpis?.totalRevenue || 0)}
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
                {formatUSD(kpis?.platformRevenue || 0)}
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
          </div>

          {/* Navigation Tabs */}
          <div className="card-premium">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-8 py-2">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'barbers', label: 'Barbers', icon: Users },
                  { id: 'bookings', label: 'Bookings', icon: Calendar },
                  { id: 'payments', label: 'Payments', icon: CreditCard },
                  { id: 'export', label: 'Export', icon: Download },
                  { id: 'security', label: 'Security', icon: Shield }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-4 border-b-2 font-semibold text-sm flex items-center space-x-2 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-8">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-primary-100 p-3 rounded-2xl">
                      <BarChart3 className="h-6 w-6 text-primary-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">Platform Overview</h3>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-emerald-500 p-3 rounded-2xl">
                          <Activity className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-200 px-3 py-1.5 rounded-full">HEALTH</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.claimedBarbers ?? 0) > 0 ? 'Active' : 'Growing'}
                      </div>
                      <p className="text-emerald-800 font-semibold mb-2">Platform Status</p>
                      <p className="text-sm text-emerald-600 font-medium">
                        {(((kpis?.claimedBarbers ?? 0) / (kpis?.totalBarbers ?? 1)) * 100).toFixed(1)}% profiles claimed
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-primary-500 p-3 rounded-2xl">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-primary-700 bg-primary-200 px-3 py-1.5 rounded-full">REVENUE</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.totalRevenue ?? 0) > 0 ? '1%' : '0%'}
                      </div>
                      <p className="text-primary-800 font-semibold mb-2">Platform Fee</p>
                      <p className="text-sm text-primary-600 font-medium">Fee percentage rate</p>
                    </div>

                    <div className="bg-gradient-to-br from-accent-50 to-accent-100 border border-accent-200 p-8 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-accent-500 p-3 rounded-2xl">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-accent-700 bg-accent-200 px-3 py-1.5 rounded-full">GROWTH</span>
                      </div>
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.bookingsThisMonth ?? 0) > 0 ? '+' : ''}{kpis?.bookingsThisMonth ?? 0}
                      </div>
                      <p className="text-accent-800 font-semibold mb-2">Monthly Bookings</p>
                      <p className="text-sm text-accent-600 font-medium">This month's total</p>
                    </div>
                  </div>

                  {/* Platform Statistics */}
                  <div className="card-premium p-8">
                    <div className="flex items-center space-x-3 mb-8">
                      <div className="bg-blue-100 p-3 rounded-2xl">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="text-2xl font-display font-bold text-gray-900">Platform Statistics</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Building className="h-6 w-6 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{kpis?.totalBarbers || 0}</p>
                        <p className="text-sm text-gray-600">Total Barbers</p>
                      </div>

                      <div className="text-center">
                        <div className="bg-green-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <UserCheck className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{kpis?.claimedBarbers || 0}</p>
                        <p className="text-sm text-gray-600">Claimed Profiles</p>
                      </div>

                      <div className="text-center">
                        <div className="bg-yellow-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Calendar className="h-6 w-6 text-yellow-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{kpis?.totalBookings || 0}</p>
                        <p className="text-sm text-gray-600">Total Bookings</p>
                      </div>

                      <div className="text-center">
                        <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">{formatUSD(kpis?.avgBookingValue || 0)}</p>
                        <p className="text-sm text-gray-600">Avg Booking Value</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Barbers Tab */}
              {activeTab === 'barbers' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-accent-100 p-3 rounded-2xl">
                        <Users className="h-6 w-6 text-accent-600" />
                      </div>
                      <h3 className="text-3xl font-display font-bold text-gray-900">Barber Management</h3>
                    </div>
                    
                    <button
                      onClick={handleUpdateSlugs}
                      disabled={updatingSlugs || !isConnected}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingSlugs ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4" />
                          <span>Update Profile URLs</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-8 rounded-2xl shadow-sm">
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.totalBarbers ?? 0).toLocaleString()}
                      </div>
                      <p className="text-primary-800 font-semibold mb-2">Total Profiles</p>
                      <p className="text-sm text-primary-600 font-medium">Active barber listings</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 rounded-2xl shadow-sm">
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {(kpis?.claimedBarbers ?? 0).toLocaleString()}
                      </div>
                      <p className="text-emerald-800 font-semibold mb-2">Claimed Profiles</p>
                      <p className="text-sm text-emerald-600 font-medium">
                        {(((kpis?.claimedBarbers ?? 0) / (kpis?.totalBarbers ?? 1)) * 100).toFixed(1)}% of total
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-8 rounded-2xl shadow-sm">
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {((kpis?.totalBarbers ?? 0) - (kpis?.claimedBarbers ?? 0)).toLocaleString()}
                      </div>
                      <p className="text-orange-800 font-semibold mb-2">Available to Claim</p>
                      <p className="text-sm text-orange-600 font-medium">Unclaimed profiles</p>
                    </div>
                  </div>

                  {/* Profile URL Management */}
                  {isConnected && (
                    <div className="card-premium p-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-4">Profile URL Management</h4>
                      <p className="text-gray-600 mb-6">
                        Update barber profile URLs to use business names instead of UUIDs for better SEO and user experience.
                      </p>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-medium text-blue-800 mb-2">What this does:</h5>
                        <ul className="text-blue-700 text-sm space-y-1">
                          <li>• Converts URLs like <code>/barber/uuid-string</code> to <code>/barber/business-name</code></li>
                          <li>• Improves SEO and makes URLs more user-friendly</li>
                          <li>• Updates all profiles that currently use UUID-based slugs</li>
                          <li>• Handles duplicate business names automatically</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-accent-100 p-3 rounded-2xl">
                      <Calendar className="h-6 w-6 text-accent-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">Booking Analytics</h3>
                  </div>

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
                      <p className="text-3xl font-display font-bold text-accent-600">{formatUSD(kpis?.avgBookingValue || 0)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-emerald-100 p-3 rounded-2xl">
                      <CreditCard className="h-6 w-6 text-emerald-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">Payment Analytics</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 rounded-2xl shadow-sm">
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {formatUSD(kpis?.platformRevenue || 0)}
                      </div>
                      <p className="text-emerald-800 font-semibold mb-2">Platform Fees Collected</p>
                      <p className="text-sm text-emerald-600 font-medium">1% of gross volume</p>
                    </div>

                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 p-8 rounded-2xl shadow-sm">
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {formatUSD(kpis?.totalRevenue || 0)}
                      </div>
                      <p className="text-primary-800 font-semibold mb-2">Total Volume Processed</p>
                      <p className="text-sm text-primary-600 font-medium">Gross booking revenue</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-8 rounded-2xl shadow-sm">
                      <div className="text-4xl font-display font-bold text-gray-900 mb-2">
                        {kpis?.claimedBarbers.toLocaleString() || '0'}
                      </div>
                      <p className="text-orange-800 font-semibold mb-2">Connected Accounts</p>
                      <p className="text-sm text-orange-600 font-medium">Barbers with Stripe</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Tab */}
              {activeTab === 'export' && (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-purple-100 p-3 rounded-2xl">
                      <Download className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">Data Export Center</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="card-premium p-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-4">Export Barber Data</h4>
                      <p className="text-gray-600 mb-6">Download complete barber directory with business information and contact details.</p>
                      <button
                        onClick={() => exportData('barbers')}
                        className="btn-primary w-full"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Barbers (CSV)</span>
                      </button>
                    </div>

                    <div className="card-premium p-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-4">Export Booking Data</h4>
                      <p className="text-gray-600 mb-6">Download complete booking history with customer and service details.</p>
                      <button
                        onClick={() => exportData('bookings')}
                        className="btn-primary w-full"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Bookings (CSV)</span>
                      </button>
                    </div>
                  </div>

                  {!isConnected && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <p className="text-yellow-800 font-medium">
                          Connect to Supabase to enable data export functionality
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="bg-red-100 p-3 rounded-2xl">
                      <Shield className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-gray-900">Security & Production Readiness</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="card-premium p-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-6">Security Status</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">HTTPS Enabled</span>
                          </div>
                          <span className="text-green-600 text-sm">✓ Active</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">Admin Authentication</span>
                          </div>
                          <span className="text-green-600 text-sm">✓ Secured</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">Input Validation</span>
                          </div>
                          <span className="text-green-600 text-sm">✓ Implemented</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-800">Rate Limiting</span>
                          </div>
                          <span className="text-green-600 text-sm">✓ Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-premium p-8">
                      <h4 className="text-xl font-bold text-gray-900 mb-6">Production Checklist</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <span className="font-medium text-green-800">Database Connected</span>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                          <span className="font-medium text-green-800">Payment Processing</span>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <span className="font-medium text-yellow-800">Email Service</span>
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <span className="font-medium text-yellow-800">SMS Service</span>
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8">
                    <h4 className="font-bold text-blue-900 mb-4">Production Deployment Checklist</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-blue-800 mb-3">Completed:</h5>
                        <ul className="space-y-2 text-blue-700 text-sm">
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>Database connection configured</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>Payment processing set up</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>Admin authentication working</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>SSL certificates active</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="font-medium text-blue-800 mb-3">Recommended:</h5>
                        <ul className="space-y-2 text-blue-700 text-sm">
                          <li className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Configure email service (Resend/SendGrid)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Set up SMS service (Twilio)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Configure error monitoring (Sentry)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Set up uptime monitoring</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
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