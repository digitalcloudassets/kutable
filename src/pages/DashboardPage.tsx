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
        // Remember barber dashboard preference
        try { localStorage.setItem('lastDashboard', 'barber'); } catch {}
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
        // Use centralized profile creation to prevent duplicates
        const clientProfile = await getOrCreateClientProfile(user);
        if (clientProfile) {
          // Fetch the full profile data
          const { data: fullProfile, error: fetchError } = await supabase
            .from('client_profiles')
            .select('*')
            .eq('id', clientProfile.id)
            .single();

          if (!fetchError && fullProfile) {
            setClientProfile(fullProfile);
          }
        }
        setUserType('client');
        setActiveTab('bookings');
        // Remember client dashboard preference
        try { localStorage.setItem('lastDashboard', 'client'); } catch {}
      }
    } catch (error) {
      console.warn('Database query failed, defaulting to client mode:', error);
      setUserType('client');
      setActiveTab('bookings');
      // Remember client dashboard preference
      try { localStorage.setItem('lastDashboard', 'client'); } catch {}
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleEditProfile = useCallback(() => {
    setActiveTab('profile');
    setActiveSubTab('info');
    setTriggerEdit(true);
    // Also trigger a slug update check when editing
    checkAndUpdateSlug();
  }, []);

  const checkAndUpdateSlug = useCallback(async () => {
    if (!user || userType !== 'barber' || !barber || !isConnected) return;

    // Check if barber has UUID slug and update it
    const isUuidSlug = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barber.slug || '');
    
    if (isUuidSlug && barber.business_name) {
      try {
        const { updateSingleBarberSlug } = await import('../utils/updateBarberSlugs');
        const result = await updateSingleBarberSlug(barber.id);
        
        if (result.success && result.newSlug) {
          // Update the current URL if the slug changed
          if (window.location.pathname.includes(barber.slug)) {
            window.history.replaceState({}, '', `/barber/${result.newSlug}`);
          }
          
          // Refresh barber data to get the new slug
          await refreshBarberData();
          NotificationManager.success(`Profile URL updated to: /barber/${result.newSlug}`);
        }
      } catch (error) {
        console.error('Error updating slug:', error);
      }
    }
  }, [user, userType, barber, isConnected, refreshBarberData]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleSubTabChange = useCallback((tab: string) => {
    setActiveSubTab(tab);
  }, []);

  const handleTriggerEditChange = useCallback((trigger: boolean) => {
    setTriggerEdit(trigger);
  }, []);

  if (authLoading || loading) {
    return <LoadingDashboard />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Client Dashboard
  if (userType === 'client') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          
          {import.meta.env.DEV && <AdminDebugPanel />}
          
          <section className="rounded-3xl border bg-white app-full">
            <div className="section-inner">
            <ClientDashboardHeader user={user} clientProfile={clientProfile} />
            </div>
          </section>

          <DashboardNavigation 
            userType="client"
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCount={unreadCount}
          />

          <section className="rounded-3xl border bg-white app-full">
            <div className="section-inner">
            <ClientDashboardContent activeTab={activeTab} />
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Barber Dashboard
  if (userType === 'barber' && barber) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          
          {import.meta.env.DEV && <AdminDebugPanel />}
          
          <section className="rounded-3xl border bg-white app-full">
            <div className="section-inner">
            <BarberDashboardHeader 
              barber={barber}
              onEditProfile={handleEditProfile}
            />
            </div>
          </section>

          <DashboardNavigation 
            userType="barber"
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCount={unreadCount}
          />

          <section className="rounded-3xl border bg-white app-full">
            <div className="section-inner">
            <BarberDashboardContent 
              activeTab={activeTab}
              barber={barber}
              user={user}
              onBarberUpdate={refreshBarberData}
              triggerEdit={triggerEdit}
              onTriggerEditChange={handleTriggerEditChange}
            />
            </div>
          </section>
        </div>
      </div>
    );
  }

  // Fallback: User type not determined yet
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8 pt-28">
        <SupabaseConnectionBanner isConnected={isConnected} />
        <section className="rounded-3xl border bg-white app-full">
          <div className="section-inner">
          <FallbackDashboard />
          </div>
        </section>
        {import.meta.env.DEV && <AdminDebugPanel />}
      </div>
    </div>
  );
};

export default DashboardPage;