import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Star, 
  Edit, 
  Eye, 
  Users, 
  Phone,
  Scissors,
  Link as LinkIcon
} from 'lucide-react';
import { Database } from '../../lib/supabase';
import EditProfileLinkButton from '../Profile/EditProfileLinkButton';
import ShareProfileLink from '../Profile/ShareProfileLink';

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

  const profileUrl = `/barber/${barber.slug && barber.slug !== barber.id ? barber.slug : barber.id}`;

  return (
    <div className="space-y-8 mb-8">
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

          {/* Edit Profile Button - Centered under rating */}
          <div className="flex justify-center">
            <EditProfileLinkButton />
          </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <Link
              to={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary justify-center"
            >
              <Eye className="h-4 w-4" />
              <span>View Public Profile</span>
            </Link>
          </div>
          
          <ShareProfileLink 
            slug={barber.slug} 
            id={barber.id} 
            className="mt-6"
          />
          
          {/* Show note when slug isn't branded */}
          {(!barber.slug || /^barber-[0-9a-f]{8}$/i.test(barber.slug) || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barber.slug)) && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="text-center">
                <div className="bg-blue-500 p-2 rounded-xl inline-block mb-3">
                  <LinkIcon className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-semibold text-blue-800 mb-2">Get Your Branded Link</h4>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Update your business name to get a clean, shareable profile link like <code>kutable.com/barber/kutable</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

BarberDashboardHeader.displayName = 'BarberDashboardHeader';

export default BarberDashboardHeader;