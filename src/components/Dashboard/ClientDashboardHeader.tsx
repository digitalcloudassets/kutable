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
    <div className="card-premium p-5 md:p-6 mb-8">
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Avatar */}
          <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full ring-8 ring-white shadow">
            {clientProfile?.profile_image_url ? (
              <img
                src={clientProfile.profile_image_url}
                alt="Profile"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="bg-gradient-to-br from-primary-500 to-accent-500 h-full w-full flex items-center justify-center">
                <User className="h-12 w-12 md:h-14 md:w-14 text-white" />
              </div>
            )}
          </div>

          {/* Badge */}
          <span className="absolute -bottom-1 -right-1 rounded-full bg-accent-600 text-white px-2 py-0.5 text-xs font-semibold shadow">
            Client
          </span>
        </div>
      </div>
    </div>
  );
});

ClientDashboardHeader.displayName = 'ClientDashboardHeader';

export default ClientDashboardHeader;