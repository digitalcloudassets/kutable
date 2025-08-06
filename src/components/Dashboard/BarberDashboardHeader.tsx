import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Star, 
  Edit, 
  Eye, 
  TrendingUp, 
  Users, 
  Phone 
} from 'lucide-react';
import { Database } from '../../lib/supabase';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

interface BarberDashboardHeaderProps {
  barber: Barber;
  onEditProfile: () => void;
}

const BarberDashboardHeader = React.memo<BarberDashboardHeaderProps>(({ 
  barber, 
  onEditProfile 
}) => {
  const handleEditClick = useCallback(() => {
    onEditProfile();
  }, [onEditProfile]);

  const profileUrl = `/barber/${barber.slug || barber.id}`;

  return (
    <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 mb-8">
      <div className="flex flex-col space-y-6">
        {/* Profile Info - Full Width on Mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <img 
            src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=100'} 
            alt={barber.business_name}
            className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-gray-200 mx-auto sm:mx-0" 
          />
          <div className="text-center sm:text-left">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{barber.business_name}</div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
              <span className="mobile-body text-gray-600">{barber.owner_name}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                barber.is_active 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {barber.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-gray-900">{barber.average_rating.toFixed(1)}</span>
                <span className="text-gray-500 mobile-small">({barber.total_reviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Revenue and Actions - Stacked on Mobile */}
        <div className="text-center space-y-4">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            $2,340 <span className="text-lg sm:text-xl text-gray-500 font-normal">This Month</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end">
            <Link
              to={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full sm:w-auto justify-center min-h-[48px]"
            >
              <Eye className="h-4 w-4" />
              <span>View Public Profile</span>
            </Link>
            <button 
              onClick={handleEditClick}
              className="btn-primary w-full sm:w-auto justify-center min-h-[48px]"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

BarberDashboardHeader.displayName = 'BarberDashboardHeader';

export default BarberDashboardHeader;