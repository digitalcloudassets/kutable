import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Star, 
  Edit, 
  Eye, 
  Users, 
  Phone,
  Scissors
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
    <div className="space-y-8 mb-8">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
          Welcome back, {barber.owner_name}!
        </h1>
        <p className="text-gray-600 text-lg">Manage your business and track your growth</p>
      </div>

      {/* Main Profile Card */}
      <div className="card-premium p-8 text-center">
        <div className="space-y-6">
          {/* Profile Image */}
          <div className="relative inline-block">
          <img 
            src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=100'} 
            alt={barber.business_name}
            className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-premium" 
          />
            <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white p-2 rounded-xl shadow-lg">
              <Scissors className="h-4 w-4" />
            </div>
          </div>

          {/* Business Info */}
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">{barber.business_name}</h2>
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                barber.is_active 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {barber.is_active ? 'Active' : 'Inactive'}
              </span>
              {barber.stripe_onboarding_completed && (
                <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  Stripe Connected
                </span>
              )}
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center space-x-1">
                <div className="bg-yellow-100 p-1.5 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="font-medium text-gray-900">{barber.average_rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({barber.total_reviews} reviews)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary justify-center"
            >
              <Eye className="h-4 w-4" />
              <span>View Public Profile</span>
            </Link>
            <button 
              onClick={handleEditClick}
              className="btn-primary justify-center"
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