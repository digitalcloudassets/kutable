import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Database } from '../lib/supabase';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];
type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

const DashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { unreadCount } = useMessaging();
  const { isConnected } = useSupabaseConnection();
  const navigate = useNavigate();
  
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
        determineUserType();
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    handleUserTypeCheck();
  }, [handleUserTypeCheck]);

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
        try {
          console.log('Creating client profile for existing user:', user.id);
          
          const { data: newClientProfile, error: createError } = await supabase
            .from('client_profiles')
            .insert({
              user_id: user.id,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              email: user.email || '',
              phone: '',
              preferred_contact: 'sms',
              communication_consent: true,
              sms_consent: true,
              email_consent: true,
              consent_date: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating client profile in dashboard:', createError);
            setUserType('client');
            setClientProfile(null);
          } else {
            console.log('Client profile created successfully in dashboard:', newClientProfile.id);
            setUserType('client');
            setClientProfile(newClientProfile);
          }
        } catch (profileCreationError) {
          console.error('Exception creating client profile:', profileCreationError);
          setUserType('client');
          setClientProfile(null);
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
  }, [user]);

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

  const handleEditProfile = useCallback(() => {
    setActiveTab('profile');
    setActiveSubTab('info');
    setTriggerEdit(true);
  }, []);

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
          
          <ClientDashboardHeader user={user} />

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
      </div>
    </div>
  );
};

export default DashboardPage;