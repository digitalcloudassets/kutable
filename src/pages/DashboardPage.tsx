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

type Barber = Database['public']['Tables']['barber_profiles']['Row'];
type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

// Temporary debug component for admin testing
const AdminDebugPanel: React.FC = () => {
  const { allowed: isAdmin, loading: adminLoading, errorMsg: adminError } = useAdminGuard();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pingResult, setPingResult] = useState<any>(null);

  const testPing = async () => {
    setTesting(true);
    setPingResult(null);
    
    try {
      console.log('🏓 Testing ping function...');
      const { data, error } = await supabase.functions.invoke('ping', { body: {} });
      
      const testResult = {
        success: !error,
        data: data,
        error: error?.message || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('🏓 Ping test result:', testResult);
      setPingResult(testResult);
      
      if (data?.ok) {
        NotificationManager.success('✅ Edge Functions reachable!');
      } else {
        NotificationManager.error('❌ Edge Functions unreachable');
      }
    } catch (error: any) {
      console.error('🏓 Ping test error:', error);
      setPingResult({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      NotificationManager.error('Network test failed');
    } finally {
      setTesting(false);
    }
  };

  const testAdminGuard = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('🔍 Testing admin-guard function...');
      const { data, error } = await supabase.functions.invoke('admin-guard', { body: {} });
      
      const testResult = {
        success: !error,
        data: data,
        error: error?.message || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 Admin guard test result:', testResult);
      setResult(testResult);
      
      if (data?.ok) {
        NotificationManager.success('✅ Admin access confirmed!');
      } else {
        NotificationManager.error('❌ Admin access denied');
      }
    } catch (error: any) {
      console.error('🔍 Admin guard test error:', error);
      setResult({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      NotificationManager.error('Function test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-blue-900">Admin Access Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={testPing}
            disabled={testing}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>🏓</span>
            )}
            <span>{testing ? 'Testing...' : 'Test Network'}</span>
          </button>
          <button
            onClick={testAdminGuard}
            disabled={testing}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>🔍</span>
            )}
            <span>{testing ? 'Testing...' : 'Test Admin'}</span>
          </button>
        </div>
      </div>
      
      {/* Admin Hook Status */}
      <div className="mb-4 bg-white/50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-2">Admin Hook Status:</h4>
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Admin Access:</span>
            <span className={`font-medium ${
              adminLoading ? 'text-blue-600' : 
              isAdmin ? 'text-green-600' : 'text-red-600'
            }`}>
              {adminLoading ? 'Checking...' : isAdmin ? 'Granted' : 'Denied'}
            </span>
          </div>
          {adminError && (
            <div className="mt-2 text-red-700 font-medium text-xs bg-red-100 p-2 rounded">
              Error: {adminError}
            </div>
          )}
        </div>
      </div>
      
      {/* Ping Test Result */}
      {pingResult && (
        <div className={`rounded-lg p-3 text-sm mb-4 ${
          pingResult.success && pingResult.data?.ok 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium mb-2">
            {pingResult.success && pingResult.data?.ok ? '✅ Network Test Passed' : '❌ Network Test Failed'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(pingResult, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Admin Test Result */}
      {result && (
        <div className={`rounded-lg p-3 text-sm ${
          result.success && result.data?.ok 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium mb-2">
            {result.success && result.data?.ok ? '✅ Admin Access Granted' : '❌ Admin Access Denied'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <p className="text-blue-700 text-sm mt-3">
        <strong>Debug Info:</strong> Use the Network test to check Edge Function connectivity and CORS, then Admin test to verify permissions.
      </p>
    </div>
  );
};

// Temporary debug component for admin testing
const AdminDebugPanel: React.FC = () => {
  const { allowed: isAdmin, loading: adminLoading, errorMsg: adminError } = useAdminGuard();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [pingResult, setPingResult] = useState<any>(null);

  const testPing = async () => {
    setTesting(true);
    setPingResult(null);
    
    try {
      console.log('🏓 Testing ping function...');
      const { data, error } = await supabase.functions.invoke('ping', { body: {} });
      
      const testResult = {
        success: !error,
        data: data,
        error: error?.message || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('🏓 Ping test result:', testResult);
      setPingResult(testResult);
      
      if (data?.ok) {
        NotificationManager.success('✅ Edge Functions reachable!');
      } else {
        NotificationManager.error('❌ Edge Functions unreachable');
      }
    } catch (error: any) {
      console.error('🏓 Ping test error:', error);
      setPingResult({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      NotificationManager.error('Network test failed');
    } finally {
      setTesting(false);
    }
  };

  const testAdminGuard = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log('🔍 Testing admin-guard function...');
      const { data, error } = await supabase.functions.invoke('admin-guard', { body: {} });
      
      const testResult = {
        success: !error,
        data: data,
        error: error?.message || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 Admin guard test result:', testResult);
      setResult(testResult);
      
      if (data?.ok) {
        NotificationManager.success('✅ Admin access confirmed!');
      } else {
        NotificationManager.error('❌ Admin access denied');
      }
    } catch (error: any) {
      console.error('🔍 Admin guard test error:', error);
      setResult({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      });
      NotificationManager.error('Function test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-blue-900">Admin Access Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={testPing}
            disabled={testing}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>🏓</span>
            )}
            <span>{testing ? 'Testing...' : 'Test Network'}</span>
          </button>
          <button
            onClick={testAdminGuard}
            disabled={testing}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2 text-sm"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <span>🔍</span>
            )}
            <span>{testing ? 'Testing...' : 'Test Admin'}</span>
          </button>
        </div>
      </div>
      
      {/* Admin Hook Status */}
      <div className="mb-4 bg-white/50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-2">Admin Hook Status:</h4>
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Admin Access:</span>
            <span className={`font-medium ${
              adminLoading ? 'text-blue-600' : 
              isAdmin ? 'text-green-600' : 'text-red-600'
            }`}>
              {adminLoading ? 'Checking...' : isAdmin ? 'Granted' : 'Denied'}
            </span>
          </div>
          {adminError && (
            <div className="mt-2 text-red-700 font-medium text-xs bg-red-100 p-2 rounded">
              Error: {adminError}
            </div>
          )}
        </div>
      </div>
      
      {/* Ping Test Result */}
      {pingResult && (
        <div className={`rounded-lg p-3 text-sm mb-4 ${
          pingResult.success && pingResult.data?.ok 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium mb-2">
            {pingResult.success && pingResult.data?.ok ? '✅ Network Test Passed' : '❌ Network Test Failed'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(pingResult, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Admin Test Result */}
      {result && (
        <div className={`rounded-lg p-3 text-sm ${
          result.success && result.data?.ok 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="font-medium mb-2">
            {result.success && result.data?.ok ? '✅ Admin Access Granted' : '❌ Admin Access Denied'}
          </p>
          <pre className="text-xs bg-white/50 p-2 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <p className="text-blue-700 text-sm mt-3">
        <strong>Debug Info:</strong> Use the Network test to check Edge Function connectivity and CORS, then Admin test to verify permissions.
      </p>
    </div>
  );
};

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
      }
    } catch (error) {
      console.warn('Database query failed, defaulting to client mode:', error);
      setUserType('client');
      setActiveTab('bookings');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          
          <AdminDebugPanel />
          
          <ClientDashboardHeader user={user} clientProfile={clientProfile} />

          <DashboardNavigation 
            userType="client"
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCount={unreadCount}
          />

          <ClientDashboardContent activeTab={activeTab} />
        </div>
      </div>
    );
  }

  // Barber Dashboard
  if (userType === 'barber' && barber) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
          <SupabaseConnectionBanner isConnected={isConnected} />
          
          <AdminDebugPanel />
          
          <BarberDashboardHeader 
            barber={barber}
            onEditProfile={handleEditProfile}
          />

          <DashboardNavigation 
            userType="barber"
            activeTab={activeTab}
            onTabChange={handleTabChange}
            unreadCount={unreadCount}
          />

          <BarberDashboardContent 
            activeTab={activeTab}
            barber={barber}
            user={user}
            onBarberUpdate={refreshBarberData}
            triggerEdit={triggerEdit}
            onTriggerEditChange={handleTriggerEditChange}
          />
        </div>
      </div>
    );
  }

  // Fallback: User type not determined yet
  return (
    <div className="min-h-screen bg-gray-50 page-container">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <SupabaseConnectionBanner isConnected={isConnected} />
        <FallbackDashboard />
        <AdminDebugPanel />
        
        <AdminDebugPanel />
        
      </div>
    </div>
  );
};

export default DashboardPage;