import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  DollarSign, 
  Eye,
  Edit,
  Settings, 
  BarChart3,
  Scissors,
  Building,
  Star,
  Clock,
  Crown,
  Sparkles,
  TrendingUp,
  Users,
  Phone
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import BarberProfile from '../components/Dashboard/BarberProfile';
import ServicesManagement from '../components/Dashboard/ServicesManagement';
import BookingsManagement from '../components/Dashboard/BookingsManagement';
import Analytics from '../components/Dashboard/Analytics';
import ClientBookings from '../components/Client/ClientBookings';
import ClientProfileSettings from '../components/Client/ClientProfileSettings';
import ConsentManagement from '../components/Client/ConsentManagement';
import { Database } from '../lib/supabase';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];
type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const navigate = useNavigate();
  
  const [userType, setUserType] = useState<'client' | 'barber' | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('info');
  const [triggerEdit, setTriggerEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else {
        determineUserType();
      }
    }
  }, [user, authLoading, navigate]);

  const determineUserType = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if user is a barber
      const { data: barberData } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (barberData) {
        setUserType('barber');
        setBarber(barberData);
        setActiveTab('profile');
        setLoading(false);
        return;
      }

      // Check if user is a client
      const { data: clientData } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (clientData) {
        setUserType('client');
        setClientProfile(clientData);
        setActiveTab('bookings');
      } else {
        // Create client profile if none exists
        const { data: newClientProfile, error: createError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            phone: '',
            preferred_contact: 'sms'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating client profile:', createError);
          setUserType('client');
          setClientProfile(null);
        } else {
          setUserType('client');
          setClientProfile(newClientProfile);
        }
        setActiveTab('bookings');
      }
    } catch (error) {
      console.warn('Database query failed, defaulting to client mode:', error);
      setUserType('client');
      setActiveTab('bookings');
    } finally {
      setLoading(false);
    }
  };

  const refreshBarberData = async () => {
    if (!user || userType !== 'barber') return;

    try {
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setBarber(data);
    } catch (error) {
      console.error('Error refreshing barber data:', error);
    }
  };

  const handleEditProfile = () => {
    setActiveTab('profile');
    setActiveSubTab('info');
    setTriggerEdit(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading your dashboard...</p>
            <p className="text-sm text-gray-500">Setting up your personalized experience</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Client Dashboard
  if (userType === 'client') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          
          {/* Client Header */}
          <div className="card-premium p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-center space-x-6">
              <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-2xl flex items-center justify-center shadow-premium">
                <User className="h-10 w-10 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-display font-bold text-gray-900">
                    Welcome back, {user.user_metadata?.first_name || 'Friend'}!
                  </h1>
                  <div className="bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-medium">
                    Client
                  </div>
                </div>
                <p className="text-gray-600 text-lg">Manage your appointments and discover amazing barbers</p>
              </div>
            </div>
          </div>

          {/* Client Navigation */}
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 mb-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`flex-1 py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'bookings'
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span>My Bookings</span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-4 px-6 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'profile'
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <User className="h-5 w-5" />
                <span>My Profile</span>
              </button>
              <button
                onClick={() => navigate('/barbers')}
                className="flex-1 py-4 px-6 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Scissors className="h-5 w-5" />
                <span>Find Barbers</span>
              </button>
            </div>
          </div>

          {/* Client Content */}
          <div className="animate-fade-in-up">
            {activeTab === 'bookings' && <ClientBookings />}
            {activeTab === 'profile' && <ClientProfileSettings />}
          </div>
        </div>
      </div>
    );
  }

  // Barber Dashboard
  if (userType === 'barber' && barber) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          
          {/* Mobile-Optimized Profile Header Card */}
          <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 mb-8">
            <div className="flex flex-col space-y-6">
              {/* Profile Info - Full Width on Mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <img 
                  src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=100'} 
                  alt={barber.business_name}
                  className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-gray-200 mx-auto sm:mx-0" 
                />
                <div className="text-center sm:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{barber.business_name}</div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="mobile-body text-gray-600">{barber.owner_name}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      barber.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {barber.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-gray-900">{barber.average_rating.toFixed(1)}</span>
                      <span className="text-gray-500 mobile-small">({barber.total_reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Revenue and Actions - Stacked on Mobile */}
              <div className="text-center space-y-4">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  $2,340 <span className="text-lg sm:text-xl text-gray-500 font-normal">This Month</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end">
                  <a
                    href={`/barber/${barber.slug || barber.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full sm:w-auto justify-center min-h-[48px]"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Public Profile</span>
                  </a>
                  <button 
                    onClick={handleEditProfile}
                    className="btn-primary w-full sm:w-auto justify-center min-h-[48px]"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-sm border border-gray-100 mb-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
                  activeTab === 'profile'
                    ? 'bg-primary-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Building className="h-5 w-5" />
                <span className="text-xs sm:text-sm">Profile</span>
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
                  activeTab === 'bookings'
                    ? 'bg-primary-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-5 w-5" />
                <span className="text-xs sm:text-sm">Bookings</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
                  activeTab === 'analytics'
                    ? 'bg-primary-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs sm:text-sm">Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
                  activeTab === 'privacy'
                    ? 'bg-primary-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs sm:text-sm">Privacy</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in-up">
            {activeTab === 'profile' && (
              <BarberProfile 
                barber={barber} 
                onUpdate={refreshBarberData}
                activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                triggerEdit={triggerEdit}
                setTriggerEdit={setTriggerEdit}
              />
            )}
            
            {activeTab === 'bookings' && (
              <BookingsManagement barberId={barber.id} />
            )}
            
            {activeTab === 'analytics' && (
              <Analytics barberId={barber.id} />
            )}
            
            {activeTab === 'privacy' && (
              <div className="card-premium p-8 animate-fade-in-up">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-primary-100 p-2 rounded-xl">
                    <Settings className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-gray-900">Privacy & Communication Preferences</h3>
                </div>
                <ConsentManagement 
                  userId={user?.id}
                  userType="barber"
                  currentConsent={{
                    communication: barber.communication_consent ?? false,
                    sms: barber.sms_consent ?? false,
                    email: barber.email_consent ?? false
                  }}
                  onConsentUpdate={refreshBarberData}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback: User type not determined yet
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <SupabaseConnectionBanner isConnected={isConnected} />
        
        <div className="card-premium p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5"></div>
          <div className="relative z-10">
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Welcome to Kutable!</h2>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              We're setting up your personalized dashboard. This will just take a moment...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-100 border-t-primary-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;