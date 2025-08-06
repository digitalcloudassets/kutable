import React, { useCallback } from 'react';
import BarberProfile from './BarberProfile';
import BookingsManagement from './BookingsManagement';
import Analytics from './Analytics';
import ConsentManagement from '../Client/ConsentManagement';
import { Settings } from 'lucide-react';
import { Database } from '../../lib/supabase';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

interface BarberDashboardContentProps {
  activeTab: string;
  activeSubTab: string;
  barber: Barber;
  user: any;
  onBarberUpdate: () => void;
  onSubTabChange: (tab: string) => void;
  triggerEdit: boolean;
  onTriggerEditChange: (trigger: boolean) => void;
}

const BarberDashboardContent = React.memo<BarberDashboardContentProps>(({ 
  activeTab,
  activeSubTab,
  barber,
  user,
  onBarberUpdate,
  onSubTabChange,
  triggerEdit,
  onTriggerEditChange
}) => {
  const handleConsentUpdate = useCallback(() => {
    onBarberUpdate();
  }, [onBarberUpdate]);

  return (
    <div className="animate-fade-in-up">
      {activeTab === 'profile' && (
        <BarberProfile 
          barber={barber} 
          onUpdate={onBarberUpdate}
          activeSubTab={activeSubTab}
          setActiveSubTab={onSubTabChange}
          triggerEdit={triggerEdit}
          setTriggerEdit={onTriggerEditChange}
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
            onConsentUpdate={handleConsentUpdate}
          />
        </div>
      )}
    </div>
  );
});

BarberDashboardContent.displayName = 'BarberDashboardContent';

export default BarberDashboardContent;