import React from 'react';
import { Link } from 'react-router-dom';
import { User, Edit, Eye } from 'lucide-react';
import { Database } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

interface ClientDashboardHeaderProps {
  user: any;
  clientProfile: ClientProfile | null;
}

const ClientDashboardHeader = React.memo<ClientDashboardHeaderProps>(({ user, clientProfile }) => {
  // Get avatar URL without default fallback
  const avatarUrl = clientProfile?.profile_image_url || user?.user_metadata?.avatar_url || null;
  
  // Generate initials for placeholder
  const initials = (() => {
    const f = clientProfile?.first_name?.[0] ?? user?.user_metadata?.first_name?.[0];
    const l = clientProfile?.last_name?.[0] ?? user?.user_metadata?.last_name?.[0];
    const e = user?.email?.[0];
    return ((f ?? '') + (l ?? '') || (e ?? '?')).toUpperCase();
  })();

  return (
    <div className="card-premium p-5 md:p-6 mb-8">
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Avatar */}
          <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full ring-8 ring-white shadow">
            {avatarUrl ? (
              <img
                src={`${avatarUrl}${avatarUrl.includes('avatars/') ? (avatarUrl.includes('?') ? '&' : '?') + '_=' + Date.now() : ''}`}
                alt="Profile avatar"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="bg-gradient-to-br from-primary-500 to-accent-500 h-full w-full flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                {initials}
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