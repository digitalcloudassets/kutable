import React from 'react';
import { MessageSquare } from 'lucide-react';
import ClientBookings from '../Client/ClientBookings';
import ClientProfileSettings from '../Client/ClientProfileSettings';

interface ClientDashboardContentProps {
  activeTab: string;
}

const ClientDashboardContent = React.memo<ClientDashboardContentProps>(({ activeTab }) => {
  return (
    <div className="animate-fade-in-up">
      {activeTab === 'bookings' && <ClientBookings />}
      {activeTab === 'profile' && <ClientProfileSettings />}
    </div>
  );
});

ClientDashboardContent.displayName = 'ClientDashboardContent';

export default ClientDashboardContent;