import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMessaging } from '../hooks/useMessaging';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import { useStripeConnect } from '../hooks/useStripeConnect';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import BarberDashboardHeader from '../components/Dashboard/BarberDashboardHeader';
import DashboardNavigation from '../components/Dashboard/DashboardNavigation';
import BarberDashboardContent from '../components/Dashboard/BarberDashboardContent';
import LoadingDashboard from '../components/Dashboard/LoadingDashboard';
import { Database } from '../lib/supabase';
import { NotificationManager } from '../utils/notifications';
import { useAdminGuard } from '../hooks/useAdminGuard';
import AdminDebugPanel from '../components/Debug/AdminDebugPanel';
import Surface from '../components/Layout/Surface';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

const ALLOWED = ['profile','bookings','messages','services','gallery','hours','privacy','analytics'] as const;
type Tab = typeof ALLOWED[number];

const BarberDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { unreadCount } = useMessaging();
  const { isConnected } = useSupabaseConnection();
  const { resumeOnReturn } = useStripeConnect(null, user?.id);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive active tab from URL
  const activeTab: Tab = useMemo(() => {
    const seg = pathname.replace(/\/+$/, '').split('/').pop() || 'profile';
    return (ALLOWED as readonly string[]).includes(seg) ? (seg as Tab) : 'profile';
  }, [pathname]);

  // Derive triggerEdit from URL search params
  const triggerEdit = searchParams.get('edit') === '1';
  const onTriggerEditChange = (flag: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (flag) next.set('edit', '1');
    else next.delete('edit');
    setSearchParams(next, { replace: true });
  };

  const handleTriggerEditChange = (flag: boolean) => {
    onTriggerEditChange(flag);
  };

  const handleUserTypeCheck = useCallback(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else {
        determineUserType();
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    handleUserTypeCheck();
    
    // Handle Stripe onboarding return
    resumeOnReturn();
  }, [handleUserTypeCheck]);

  const refreshBarberData = useCallback(async () => {
    if (!user) return;

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
  }, [user]);

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
              navigate('/dashboard/barber/profile'); // Navigate to profile tab
            } else if (statusData.detailsSubmitted && statusData.requiresVerification) {
              NotificationManager.info('Payment setup submitted for verification. You may need to provide additional information.');
            } else {
              NotificationManager.info('Payment setup in progress. Please complete all required steps in Stripe.');
            }
            
            // Refresh barber data to show updated Stripe status
            await refreshBarberData();
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
        
        // Refresh barber data to show new booking
        window.location.reload();
      }
    };

    if (user && isConnected) {
      handleStripeReturn();
    }
  }, [searchParams, user, isConnected, setSearchParams, refreshBarberData, navigate]);

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
        setBarber(barberData);
        setLoading(false);
        return;
      }

      // Not a barber, redirect to main dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('BarberDashboard load error:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, isConnected, navigate]);

  const handleTabChange = (tab: string) => {
    navigate(`/dashboard/barber/${tab}`);
  };

  const handleEditProfile = () => {
    handleTriggerEditChange(true);
  };

  // Loading state
  if (loading || authLoading) {
    return <LoadingDashboard />;
  }

  // Barber Dashboard
  if (barber) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full min-w-0">
          <div className="w-full px-4 sm:px-6 lg:px-8 app-stack py-8 pt-28">
            <SupabaseConnectionBanner isConnected={isConnected} />
            
            {import.meta.env.DEV && <AdminDebugPanel />}
            
            <Surface mdClassName="border bg-white shadow-sm p-6 w-full min-w-0">
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

            <Surface mdClassName="border bg-white shadow-sm p-6 w-full min-w-0">
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

  // If no barber profile found, redirect to main dashboard
  return <LoadingDashboard />;
};

export default BarberDashboard;