import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMessaging } from '../hooks/useMessaging';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import ClientDashboardHeader from '../components/Dashboard/ClientDashboardHeader';
import BarberDashboardHeader from '../components/Dashboard/BarberDashboardHeader';
import DashboardNavigation from '../components/Dashboard/DashboardNavigation';
import ClientDashboardContent from '../components/Dashboard/ClientDashboardContent';
import BarberDashboardContent from '../components/Dashboard/BarberDashboardContent';
import LoadingDashboard from '../components/Dashboard/LoadingDashboard';
import FallbackDashboard from '../components/Dashboard/FallbackDashboard';
import { getOrCreateClientProfile } from '../utils/profileHelpers';
import { Database } from '../lib/supabase';
import { NotificationManager } from '../utils/notifications';
import { useAdminGuard } from '../hooks/useAdminGuard';
import AdminDebugPanel from '../components/Debug/AdminDebugPanel';
import Surface from '../components/Layout/Surface';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];
type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { unreadCount } = useMessaging();
  const { isConnected } = useSupabaseConnection();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [userType, setUserType] = useState<'client' | 'barber' | null>(null);
  const [barber, setBarber] = useState<Barber | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('info');
  const [triggerEdit, setTriggerEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleUserTypeCheck = useCallback(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else {
        // Clear any inappropriate claim URLs for existing users
        const claimReturnUrl = localStorage.getItem('claim_return_url');
        if (claimReturnUrl) {
          const userType = user.user_metadata?.user_type;
          // Only barbers should have claim URLs
          if (userType !== 'barber') {
            localStorage.removeItem('claim_return_url');
          }
        }
        determineUserType();
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    handleUserTypeCheck();
  }, [handleUserTypeCheck]);

  const refreshBarberData = useCallback(async () => {
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
  }, [user, userType]);

  // Handle Stripe onboarding return
  useEffect(() => {
    const handleStripeReturn = async () => {
      const stripeSetup = searchParams.get('stripe_setup');
      const stripeRefresh = searchParams.get('stripe_refresh');
      const accountId = searchParams.get('account_id');
      const paymentSuccess = searchParams.get('payment');
      
      if ((stripeSetup === 'complete' || stripeRefresh === 'true') && accountId && user && isConnected) {
        try {
          // Check Stripe account status
          const { data: statusData, error: statusError } = await supabase.functions.invoke('check-stripe-status', {
            body: { accountId }
          });

          if (statusError) {
            console.error('Error checking Stripe status:', statusError);
            NotificationManager.error('Unable to verify payment setup status. Please check your dashboard.');
          } else if (statusData?.success) {
            if (statusData.onboardingComplete) {
              NotificationManager.success('Payment setup complete! You can now accept online bookings.');
              setActiveTab('profile'); // Show profile tab to see updated status
            } else if (statusData.detailsSubmitted && statusData.requiresVerification) {
              NotificationManager.info('Payment setup submitted for verification. You may need to provide additional information.');
            } else {
              NotificationManager.info('Payment setup in progress. Please complete all required steps in Stripe.');
            }
            
            // Refresh barber data to show updated Stripe status
            if (userType === 'barber') {
              await refreshBarberData();
            }
          }
        } catch (error) {
          console.error('Error handling Stripe return:', error);
          NotificationManager.error('Error checking payment setup status.');
        }
        
        // Clean up URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('stripe_setup');
        newSearchParams.delete('stripe_refresh');
        newSearchParams.delete('account_id');
        setSearchParams(newSearchParams, { replace: true });
      }
      
      // Handle payment success redirect
      if (paymentSuccess === 'success') {
        NotificationManager.success('Payment successful! Your booking has been confirmed.');
        
        // Clean up URL parameter
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('payment');
        setSearchParams(newSearchParams, { replace: true });
        
        // Refresh user data to show new booking
        if (userType === 'client') {
          window.location.reload(); // Force refresh to show new booking
        }
      }
    };

    if (user && isConnected && userType === 'barber') {
      handleStripeReturn();
    } else if (user && userType === 'client') {
      // Also handle payment success for clients
      const paymentSuccess = searchParams.get('payment');
      if (paymentSuccess === 'success') {
        NotificationManager.success('Payment successful! Your booking has been confirmed.');
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('payment');
        setSearchParams(newSearchParams, { replace: true });
        window.location.reload();
      }
    }
  }, [searchParams, user, isConnected, userType, setSearchParams, refreshBarberData]);

  const determineUserType = useCallback(async () => {
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

      // Check user metadata to determine intended user type
      const intendedUserType = user.user_metadata?.user_type;
      
      // If user is supposed to be a barber but no profile exists yet, don't auto-create client profile
      if (intendedUserType === 'barber') {
        setUserType('barber');
        setActiveTab('profile');
        setLoading(false);
        return;
      }
      
      // For other users, create client profile
      const clientProfile = await getOrCreateClientProfile(user);
      
      if (clientProfile) {
        setUserType('client');
        setClientProfile(clientProfile);
        setActiveTab('bookings');
      } else {
        setUserType('client');
        setActiveTab('bookings');
      }
    } catch (error) {
      console.error('DashboardPage load error:', error);
      setUserType('client');
      setActiveTab('bookings');
    } finally {
      setLoading(false);
    }
  }, [user, isConnected]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleEditProfile = () => {
    setTriggerEdit(true);
  };

  const handleTriggerEditChange = (value: boolean) => {
    setTriggerEdit(value);
  };

  // Loading state
  if (loading || authLoading) {
    return <LoadingDashboard />;
  }

  // Client Dashboard
  if (userType === 'client') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 app-stack py-8 pt-28">
            <SupabaseConnectionBanner isConnected={isConnected} />
            
            {import.meta.env.DEV && <AdminDebugPanel />}
            
            <Surface mdClassName="rounded-3xl border bg-white shadow-sm p-6 w-full min-w-0">
              <ClientDashboardHeader user={user} clientProfile={clientProfile} />
            </Surface>

            <DashboardNavigation 
              userType="client"
              activeTab={activeTab}
              onTabChange={handleTabChange}
              unreadCount={unreadCount}
            />

            <Surface mdClassName="rounded-3xl border bg-white shadow-sm p-6 w-full min-w-0">
              <div className="px-4 md:px-0">
                <ClientDashboardContent activeTab={activeTab} />
              </div>
            </Surface>
          </div>
        </div>
      </div>
    );
  }

  // Barber Dashboard
  if (userType === 'barber' && barber) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 app-stack py-8 pt-28">
            <SupabaseConnectionBanner isConnected={isConnected} />
            
            {import.meta.env.DEV && <AdminDebugPanel />}
            
            <Surface mdClassName="rounded-3xl border bg-white shadow-sm p-6 w-full min-w-0">
              <BarberDashboardHeader 
                barber={barber}
                onEditProfile={handleEditProfile}
              />
            </Surface>

            <DashboardNavigation 
              userType="barber"
              activeTab={activeTab}
              onTabChange={handleTabChange}
              unreadCount={unreadCount}
            />

            <Surface mdClassName="rounded-3xl border bg-white shadow-sm p-6 w-full min-w-0">
              <div className="px-4 md:px-0">
                <BarberDashboardContent 
                  activeTab={activeTab}
                  barber={barber}
                  user={user}
                  onBarberUpdate={refreshBarberData}
                  triggerEdit={triggerEdit}
                  onTriggerEditChange={handleTriggerEditChange}
                />
              </div>
            </Surface>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: User type not determined yet
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full min-w-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 app-stack py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          <Surface mdClassName="rounded-3xl border bg-white shadow-sm p-6 w-full min-w-0">
            <div className="px-4 md:px-0">
              <FallbackDashboard />
            </div>
          </Surface>
          {import.meta.env.DEV && <AdminDebugPanel />}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;