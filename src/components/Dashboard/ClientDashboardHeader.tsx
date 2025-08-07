import React from 'react';
import { Link } from 'react-router-dom';
import { User, Edit, Eye } from 'lucide-react';
import { Database } from '../../lib/supabase';

type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

interface ClientDashboardHeaderProps {
  user: any;
  clientProfile: ClientProfile | null;
}

const ClientDashboardHeader = React.memo<ClientDashboardHeaderProps>(({ user, clientProfile }) => {
  return (
    <div className="card-premium p-8 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-full blur-2xl"></div>
      <div className="relative z-10 flex items-center space-x-6">
        <div className="relative">
          {clientProfile?.profile_image_url ? (
            <img
              src={clientProfile.profile_image_url}
              alt="Profile"
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-premium"
            />
          ) : (
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-2xl flex items-center justify-center shadow-premium">
              <User className="h-10 w-10 text-white" />
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-accent-500 text-white p-1.5 rounded-lg shadow-lg">
            <User className="h-3 w-3" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-display font-bold text-gray-900">
              Welcome back, {clientProfile?.first_name || user.user_metadata?.first_name || 'Friend'}!
            </h1>
            <div className="bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-medium">
              Client
            </div>
          </div>
          <p className="text-gray-600 text-lg">Manage your appointments and discover amazing barbers</p>
        </div>
      </div>
    </div>
  );
});

ClientDashboardHeader.displayName = 'ClientDashboardHeader';

export default ClientDashboardHeader;