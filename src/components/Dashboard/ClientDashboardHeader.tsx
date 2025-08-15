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
  const getAvatarUrl = () => {
    // Order of precedence: client_profiles.profile_image_url → user.user_metadata.avatar_url → placeholder
    return clientProfile?.profile_image_url ||
           (user?.user_metadata?.avatar_url as string | undefined) ||
           'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200';
  };

  const avatarUrl = getAvatarUrl();
  // Add cache busting parameter for new uploads
  const cacheBustedUrl = avatarUrl.includes('avatars/') 
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}_=${Date.now()}`
    : avatarUrl;

  return (
    <div className="card-premium p-5 md:p-6 mb-8">
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Avatar */}
          <div className="h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full ring-8 ring-white shadow">
            <img
              src={cacheBustedUrl}
              alt="Profile"
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Fallback to gradient if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 h-full w-full flex items-center justify-center hidden">
              <User className="h-12 w-12 md:h-14 md:w-14 text-white" />
            </div>
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