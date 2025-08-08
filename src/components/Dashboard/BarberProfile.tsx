import React, { useState, useEffect } from 'react';
import { 
  Building, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Camera,
  Save,
  Edit,
  X,
  Star,
  Calendar,
  Clock,
  Upload,
  Loader,
  Eye,
  Image as ImageIcon,
  Settings,
  Users,
  Crown,
  Play,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  Scissors,
  ExternalLink,
  Unlink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/supabase';
import MediaUpload from '../Gallery/MediaUpload';
import MediaGallery from '../Gallery/MediaGallery';
import ServicesManagement from './ServicesManagement';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { NotificationManager } from '../../utils/notifications';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

interface BarberProfileProps {
  barber: Barber;
  onUpdate: () => void;
  triggerEdit?: boolean;
  setTriggerEdit?: (trigger: boolean) => void;
}

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

const generateUniqueSlug = async (businessName: string): Promise<string> => {
  let baseSlug = businessName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  
  if (!baseSlug) {
    baseSlug = 'barber';
  }
  
  let slug = baseSlug;
  let counter = 1;
  
  // Check for conflicts and make unique
  while (true) {
    const { data: existingProfile } = await supabase
      .from('barber_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (!existingProfile) {
      break;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

const BarberProfile: React.FC<BarberProfileProps> = ({ 
  barber, 
  onUpdate, 
  triggerEdit = false,
  setTriggerEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [settingUpStripe, setSettingUpStripe] = useState(false);
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  
  const [editData, setEditData] = useState({
    business_name: barber.business_name,
    owner_name: barber.owner_name,
    phone: barber.phone || '',
    email: barber.email || '',
    address: barber.address || '',
    city: barber.city || '',
    state: barber.state || '',
    zip_code: barber.zip_code || '',
    bio: barber.bio || ''
  });

  useEffect(() => {
    if (triggerEdit && setTriggerEdit) {
      setIsEditing(true);
      setTriggerEdit(false);
    }
  }, [triggerEdit, setTriggerEdit]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Generate a proper slug if the current one is a UUID
      const isUuidSlug = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(barber.slug || '');
      let updateData = { ...editData, updated_at: new Date().toISOString() };
      
      if (isUuidSlug && editData.business_name) {
        // Generate a proper slug from business name
        const newSlug = await generateUniqueSlug(editData.business_name);
        updateData = { ...updateData, slug: newSlug };
      }
      
      // Update barber profile
      const { error: profileError } = await supabase
        .from('barber_profiles')
        .update(updateData)
        .eq('id', barber.id);

      if (profileError) throw profileError;

      setIsEditing(false);
      onUpdate();
     NotificationManager.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
     NotificationManager.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileName = `${barber.id}/profile-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('barber-images')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          NotificationManager.error('Storage setup required: Please create the "barber-images" bucket in your Supabase Storage dashboard before uploading images.');
          setUploadingImage(false);
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('barber-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('barber_profiles')
        .update({ 
          profile_image_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', barber.id);

      if (updateError) throw updateError;

      onUpdate();
      NotificationManager.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      NotificationManager.error('Failed to upload image. Please check your Supabase storage configuration.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleBannerImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const fileName = `${barber.id}/banner-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('barber-images')
        .upload(fileName, file);

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
         NotificationManager.error('Storage setup required: Please create the "barber-images" bucket in your Supabase Storage dashboard before uploading images.');
          setUploadingBanner(false);
          return;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('barber-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('barber_profiles')
        .update({ 
          banner_image_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', barber.id);

      if (updateError) throw updateError;

      onUpdate();
     NotificationManager.success('Banner image updated successfully!');
    } catch (error) {
      console.error('Error uploading banner image:', error);
     NotificationManager.error('Failed to upload banner image. Please check your Supabase storage configuration.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleStripeDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Stripe account? This will disable online payments until you connect a new account.')) {
      return;
    }

    setDisconnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('disconnect-stripe-account', {
        body: { barberId: barber.id }
      });

      if (error) throw error;

      if (data?.success) {
        onUpdate();
        NotificationManager.success('Stripe account disconnected successfully. You can connect a new account anytime.');
      } else {
        throw new Error(data?.error || 'Failed to disconnect Stripe account');
      }
    } catch (error: any) {
      console.error('Error disconnecting Stripe:', error);
      NotificationManager.error(error.message || 'Failed to disconnect Stripe account. Please try again.');
    } finally {
      setDisconnectingStripe(false);
    }
  };


  const handleStripeConnect = async () => {
    if (!user || !isConnected) {
      NotificationManager.error('Please ensure you are signed in and connected to Supabase');
      return;
    }

    // Check if user already has a Stripe account that needs completion
    if (barber.stripe_account_id && !barber.stripe_onboarding_completed) {
      try {
        // Check current status of existing Stripe account
        const { data: statusData, error: statusError } = await supabase.functions.invoke('check-stripe-status', {
          body: { accountId: barber.stripe_account_id }
        });

        if (statusError) {
          console.error('Error checking existing Stripe status:', statusError);
          // Continue with new account creation as fallback
        } else if (statusData?.success) {
          if (statusData.onboardingComplete) {
            // Account is actually complete, update local state
            onUpdate();
            NotificationManager.success('Your payment setup is already complete!');
            return;
          } else if (statusData.detailsSubmitted) {
            NotificationManager.info('Your Stripe account is pending verification. Check your email for updates from Stripe.');
            return;
          }
          // If not complete, continue to create new onboarding link
        }
      } catch (error) {
        console.warn('Error checking existing Stripe account, proceeding with setup:', error);
      }
    }
    setSettingUpStripe(true);
    try {
      const payload = {
        barberId: barber.id,
        businessName: barber.business_name,
        ownerName: barber.owner_name,
        email: barber.email || user.email,
        phone: barber.phone || undefined,
        address: barber.address
          ? { line1: barber.address, city: barber.city || '', state: (barber.state || '').toUpperCase(), postal_code: barber.zip_code || '' }
          : undefined,
      };

      const { data, error } = await supabase.functions.invoke('create-stripe-account', { body: payload });

      if (error) {
        // Supabase wraps non-2xx here; include context if present
        console.warn('Edge error:', error?.context || error);
        const msg = error?.context?.error || error?.message || 'Payment setup failed';
        NotificationManager.error(msg);
        return;
      }

      if (!data?.success || !data?.onboardingUrl) {
        const msg = data?.error || 'Payment setup failed';
        NotificationManager.error(msg);
        return;
      }

      // Success path unchanged
      await supabase.from('barber_profiles').update({ stripe_account_id: data.accountId, updated_at: new Date().toISOString() }).eq('id', barber.id);
      NotificationManager.success('Redirecting to Stripe to complete payment setup…');
      window.open(data.onboardingUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => onUpdate(), 1000);
    } catch (e: any) {
      console.error('Stripe Connect unexpected error:', e);
      NotificationManager.error('Something went wrong. Please try again.');
    } finally {
      setSettingUpStripe(false);
    }
  };

  return (
    <div className="card-premium p-8 animate-fade-in-up">
      <div className="space-y-8">
        {/* Edit Toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary"
          >
            {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Profile Content */}
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-display font-bold text-gray-900">Edit Business Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={editData.business_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, business_name: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={editData.owner_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-12"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={editData.state}
                  onChange={(e) => setEditData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={editData.zip_code}
                  onChange={(e) => setEditData(prev => ({ ...prev, zip_code: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Description
              </label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                <textarea
                  value={editData.bio}
                  onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-12"
                  placeholder="Tell customers about your experience and specialties..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-start space-y-6 sm:space-y-0 sm:space-x-8 pb-8 border-b border-gray-100">
              <div className="relative mx-auto sm:mx-0">
                <img
                  src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=200'}
                  alt={barber.business_name}
                  className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-premium"
                />
                <label
                  htmlFor="profile-image-upload"
                  className="absolute -bottom-2 -right-2 bg-primary-500 text-white p-3 rounded-xl cursor-pointer hover:bg-primary-600 transition-all duration-200 shadow-lg hover:scale-110"
                >
                  {uploadingImage ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </label>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">{barber.business_name}</h3>
                <p className="text-gray-600 text-lg font-medium mb-4">{barber.owner_name}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-yellow-100 p-1.5 rounded-lg">
                      <Star className="h-4 w-4 text-yellow-600" />
                    </div>
                    <span className="font-bold text-gray-900">{barber.average_rating.toFixed(1)}</span>
                    <span className="text-gray-500">({barber.total_reviews} reviews)</span>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    barber.is_active 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    {barber.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner Image Section */}
            <div>
              <h4 className="text-xl font-display font-bold text-gray-900 mb-4">Banner Image</h4>
              <p className="text-gray-600 mb-6">
                This image appears as the large header on your profile page. Use a photo of your shop exterior, interior, or workspace.
              </p>
              <div className="relative">
                <img
                  src={barber.banner_image_url || barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=600'}
                  alt={`${barber.business_name} banner`}
                  className="w-full h-64 rounded-2xl object-cover border border-gray-200"
                />
                <label
                  htmlFor="banner-image-upload"
                  className="absolute top-4 right-4 bg-primary-500 text-white p-3 rounded-xl cursor-pointer hover:bg-primary-600 transition-all duration-200 shadow-premium hover:scale-110"
                >
                  {uploadingBanner ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </label>
                <input
                  id="banner-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
              <div>
                <h4 className="text-xl font-display font-bold text-gray-900 mb-6">Contact Information</h4>
                <div className="space-y-4">
                  {barber.phone && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="bg-primary-100 p-2 rounded-lg">
                        <Phone className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Phone</p>
                        <a 
                        href={`tel:${barber.phone}`}
                          className="text-primary-600 hover:text-primary-700 transition-colors font-medium"
                      >
                        {formatPhoneNumber(barber.phone)}
                      </a>
                      </div>
                    </div>
                  )}
                  {barber.email && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                      <div className="bg-accent-100 p-2 rounded-lg">
                        <Mail className="h-4 w-4 text-accent-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Email</p>
                        <p className="text-gray-600">{barber.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xl font-display font-bold text-gray-900 mb-6">Business Address</h4>
                {barber.address ? (
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="bg-gray-200 p-2 rounded-lg">
                      <MapPin className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Location</p>
                      <div className="text-gray-600">
                      <p>{barber.address}</p>
                      {barber.city && barber.state && (
                        <p>{barber.city}, {barber.state} {barber.zip_code}</p>
                      )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No address provided</p>
                  </div>
                )}
              </div>
            </div>

            {/* Business Description */}
            <div className="pt-8 border-t border-gray-100">
              <h4 className="text-xl font-display font-bold text-gray-900 mb-6">About</h4>
              <div className="bg-gray-50 rounded-2xl p-6">
                <p className="text-gray-700 leading-relaxed text-lg">
                {barber.bio || 'No description provided. Edit your profile to add information about your services and experience.'}
                </p>
              </div>
            </div>

            {/* Business Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100">
              <div className="text-center group">
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{barber.average_rating.toFixed(1)}</p>
                <p className="text-gray-600 font-medium">Average Rating</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{barber.total_reviews}</p>
                <p className="text-gray-600 font-medium">Total Reviews</p>
              </div>
              <div className="text-center group">
                <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{barber.is_claimed ? 'Claimed' : 'Unclaimed'}</p>
                <p className="text-gray-600 font-medium">Profile Status</p>
              </div>
            </div>
          </div>
        )}

        {/* Stripe Connection Status */}
        <div className="pt-8 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-500 p-2 rounded-xl">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Payment Setup</h3>
          </div>
          
          {barber.stripe_onboarding_completed ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                <div className="bg-emerald-500 p-2 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-emerald-800">Stripe Connected</span>
                </div>
                <button
                  onClick={handleStripeDisconnect}
                  disabled={disconnectingStripe}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
                >
                  {disconnectingStripe ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  <span>{disconnectingStripe ? 'Disconnecting...' : 'Change Account'}</span>
                </button>
              </div>
              <p className="text-emerald-700 leading-relaxed">
                Your payment processing is set up and ready. You can now accept bookings and receive payments directly to your bank account.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                <div className="bg-yellow-500 p-2 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-semibold text-yellow-800">Payment Setup Required</span>
                </div>
              </div>
              <p className="text-yellow-700 leading-relaxed mb-4">
                Complete your Stripe setup to start accepting online payments and bookings from customers.
              </p>
              
              {/* Video Tutorial */}
              <div className="bg-white border border-yellow-300 rounded-xl p-4 mb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Play className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">How to Set Up Stripe Connect</h4>
                    <p className="text-sm text-gray-600">Learn how to connect your bank account in 3 minutes</p>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg p-6 text-center">
                  <a
                    href="https://youtu.be/T35k_1IzzO8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full mb-4 transition-all duration-200 transform hover:scale-110 shadow-lg"
                  >
                    <Play className="h-8 w-8 ml-1" />
                  </a>
                  <h5 className="font-semibold text-gray-900 mb-2">How to Set Up Stripe Connect</h5>
                  <p className="text-gray-600 text-sm mb-4">
                    Watch this 3-minute tutorial to learn how to connect your bank account
                  </p>
                  <a
                    href="https://youtu.be/T35k_1IzzO8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium inline-flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Watch Tutorial</span>
                  </a>
                </div>
              </div>
              
              <button 
                onClick={handleStripeConnect}
                disabled={settingUpStripe || !isConnected || !user}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold flex items-center space-x-2 shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {settingUpStripe ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                <span>{settingUpStripe ? 'Setting up...' : 'Setup Payments'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarberProfile;