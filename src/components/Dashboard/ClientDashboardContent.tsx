import React from 'react';
import { MessageSquare } from 'lucide-react';
import ClientBookings from '../Client/ClientBookings';
import ClientProfileSettings from '../Client/ClientProfileSettings';
import MessagingDashboard from '../Messaging/MessagingDashboard';

interface ClientDashboardContentProps {
  activeTab: string;
}

const ClientDashboardContent = React.memo<ClientDashboardContentProps>(({ activeTab }) => {
  return (
    <div className="animate-fade-in-up">
      {activeTab === 'bookings' && <ClientBookings />}
      {activeTab === 'messages' && (
        <div className="card-premium p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-100 p-2 rounded-xl">
              <MessageSquare className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Messages</h3>
          </div>
          <MessagingDashboard />
        </div>
      )}
      {activeTab === 'profile' && <ClientProfileSettings />}
    </div>
  );
});

ClientDashboardContent.displayName = 'ClientDashboardContent';

export default ClientDashboardContent;