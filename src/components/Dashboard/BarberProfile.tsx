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
  Scissors
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
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  triggerEdit?: boolean;
  setTriggerEdit?: (trigger: boolean) => void;
}

interface Availability {
  [key: number]: {
    id?: string;
    isOpen: boolean;
    startTime: string;
    endTime: string;
  };
}

const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

const BarberProfile: React.FC<BarberProfileProps> = ({ 
  barber, 
  onUpdate, 
  activeSubTab = 'info',
  setActiveSubTab,
  triggerEdit = false,
  setTriggerEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const [galleryRefreshTrigger, setGalleryRefreshTrigger] = useState(0);
  
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

  const [availability, setAvailability] = useState<Availability>({
    0: { isOpen: false, startTime: '09:00', endTime: '17:00' },
    1: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    2: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    3: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    4: { isOpen: true, startTime: '09:00', endTime: '17:00' },
    5: { isOpen: true, startTime: '09:00', endTime: '18:00' },
    6: { isOpen: true, startTime: '08:00', endTime: '17:00' }
  });

  useEffect(() => {
    fetchAvailability();
  }, [barber.id]);

  useEffect(() => {
    if (triggerEdit && setTriggerEdit) {
      setIsEditing(true);
      setTriggerEdit(false);
    }
  }, [triggerEdit, setTriggerEdit]);

  const fetchAvailability = async () => {
    // Skip fetching if Supabase is not connected
    if (!isConnected) {
      console.log('Supabase not connected, using default availability');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('barber_id', barber.id);

      if (error) {
        console.warn('Error fetching availability:', error);
        return;
      }

      // Convert database data to local format
      const availabilityData: Availability = {
        0: { isOpen: false, startTime: '09:00', endTime: '17:00' },
        1: { isOpen: false, startTime: '09:00', endTime: '17:00' },
        2: { isOpen: false, startTime: '09:00', endTime: '17:00' },
        3: { isOpen: false, startTime: '09:00', endTime: '17:00' },
        4: { isOpen: false, startTime: '09:00', endTime: '17:00' },
        5: { isOpen: false, startTime: '09:00', endTime: '17:00' },
        6: { isOpen: false, startTime: '09:00', endTime: '17:00' }
      };

      data?.forEach(slot => {
        availabilityData[slot.day_of_week] = {
          id: slot.id,
          isOpen: slot.is_available,
          startTime: slot.start_time,
          endTime: slot.end_time
        };
      });

      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update barber profile
      const { error: profileError } = await supabase
        .from('barber_profiles')
        .update({
          ...editData,
          updated_at: new Date().toISOString()
        })
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

  const saveAvailability = async () => {
    if (!isConnected) {
      NotificationManager.error('Please connect to Supabase to save availability');
      return;
    }
    setLoading(true);
    try {
      // Delete existing availability
      await supabase
        .from('availability')
        .delete()
        .eq('barber_id', barber.id);

      // Insert new availability
      const availabilityInserts = Object.entries(availability)
        .filter(([_, dayData]) => dayData.isOpen)
        .map(([day, dayData]) => ({
          barber_id: barber.id,
          day_of_week: parseInt(day),
          start_time: dayData.startTime,
          end_time: dayData.endTime,
          is_available: true
        }));

      if (availabilityInserts.length > 0) {
        const { error } = await supabase
          .from('availability')
          .insert(availabilityInserts);

        if (error) throw error;
      }

      await fetchAvailability();
      NotificationManager.success('Business hours updated successfully!');
    } catch (error) {
      console.error('Error saving availability:', error);
      NotificationManager.error('Failed to save business hours. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = (day: number, field: string, value: any) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 sm:p-3 shadow-sm border border-gray-100 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveSubTab?.('info')}
          className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
            activeSubTab === 'info'
              ? 'bg-primary-500 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building className="h-5 w-5" />
          <span className="text-xs sm:text-sm font-semibold">Info</span>
        </button>
        <button
          onClick={() => setActiveSubTab?.('services')}
          className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
            activeSubTab === 'services'
              ? 'bg-primary-500 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Scissors className="h-5 w-5" />
          <span className="text-xs sm:text-sm font-semibold">Services</span>
        </button>
        <button
          onClick={() => setActiveSubTab?.('availability')}
          className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
            activeSubTab === 'availability'
              ? 'bg-primary-500 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-5 w-5" />
          <span className="text-xs sm:text-sm font-semibold">Hours</span>
        </button>
        <button
          onClick={() => setActiveSubTab?.('gallery')}
          className={`py-4 px-2 sm:px-6 rounded-xl font-medium transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 min-h-[64px] sm:min-h-[52px] ${
            activeSubTab === 'gallery'
              ? 'bg-primary-500 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs sm:text-sm font-semibold">Gallery</span>
        </button>
        </div>
      </div>

      {/* Business Info Tab */}
      {activeSubTab === 'info' && (
        <div className="card-premium p-6 sm:p-8 animate-fade-in-up">
          {isEditing ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="mobile-headline font-display text-gray-900">Edit Business Information</h3>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
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
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-6 sm:space-y-0">
                <div>
                  <label className="block mobile-small font-medium text-gray-700 mb-3">
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
                  <label className="block mobile-small font-medium text-gray-700 mb-3">
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
                  <label className="block mobile-small font-medium text-gray-700 mb-3">
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
                  <label className="block mobile-small font-medium text-gray-700 mb-3">
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
                <label className="block mobile-small font-medium text-gray-700 mb-3">
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

              <div className="space-y-4 sm:grid sm:grid-cols-2 md:grid-cols-3 sm:gap-4 sm:space-y-0">
                <div>
                  <label className="block mobile-small font-medium text-gray-700 mb-3">City</label>
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block mobile-small font-medium text-gray-700 mb-3">State</label>
                  <input
                    type="text"
                    value={editData.state}
                    onChange={(e) => setEditData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block mobile-small font-medium text-gray-700 mb-3">ZIP Code</label>
                  <input
                    type="text"
                    value={editData.zip_code}
                    onChange={(e) => setEditData(prev => ({ ...prev, zip_code: e.target.value }))}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block mobile-small font-medium text-gray-700 mb-3">
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

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary w-full sm:w-auto disabled:opacity-50"
                >
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start space-y-6 sm:space-y-0 sm:space-x-8 pb-8 border-b border-gray-100">
                <div className="relative">
                  <img
                    src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=200'}
                    alt={barber.business_name}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white shadow-premium mx-auto sm:mx-0"
                  />
                  <label
                    htmlFor="profile-image-upload"
                    className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-primary-500 text-white p-2 sm:p-3 rounded-xl cursor-pointer hover:bg-primary-600 transition-all duration-200 shadow-lg hover:scale-110"
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
                  <h3 className="mobile-headline font-display text-gray-900 mb-2">{barber.business_name}</h3>
                  <p className="text-gray-600 mobile-body font-medium mb-4">{barber.owner_name}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6">
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
                    <Crown className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">Pro</p>
                  <p className="text-gray-600 font-medium">Verified Status</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stripe Connection Status & Setup Video */}
      {activeSubTab === 'info' && !isEditing && (
        <div className="card-premium p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-primary-500 p-2 rounded-xl">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-display font-bold text-gray-900">Profile Status</h3>
          </div>
          
          {/* Stripe Connection Status */}
          <div>
            {barber.stripe_onboarding_completed ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                  <div className="bg-emerald-500 p-2 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-lg font-semibold text-emerald-800">Stripe Connected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open('https://www.youtube.com/watch?v=T35k_1IzzO8', '_blank')}
                      className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">Watch Stripe Setup Tutorial</span>
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to disconnect your Stripe account? This will disable payment processing.')) {
                          try {
                            const { data, error } = await supabase.functions.invoke('disconnect-stripe-account', {
                              body: { barberId: barber.id }
                            });
                            if (error) throw error;
                            onUpdate();
                          } catch (error) {
                            console.error('Error disconnecting Stripe:', error);
                            alert('Failed to disconnect Stripe account. Please try again.');
                          }
                        }
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
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
                  <div className="flex items-center space-x-2">
                    <button
                    onClick={() => window.open('https://www.youtube.com/watch?v=T35k_1IzzO8', '_blank')}
                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                  >
                    <Play className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-gray-600">Watch Setup Tutorial</span>
                  </div>
                </div>
                <p className="text-yellow-700 leading-relaxed mb-4">
                  Complete your Stripe setup to start accepting online payments and bookings from customers.
                </p>
                <button className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold flex items-center space-x-2 shadow-lg hover:scale-105">
                  <CreditCard className="h-5 w-5" />
                  <span>Setup Payments</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consent Management Tab */}
      
      {/* Services Tab */}
      {activeSubTab === 'services' && (
        <div className="animate-fade-in-up">
          <ServicesManagement barberId={barber.id} />
        </div>
      )}

      {/* Availability Tab */}
      {activeSubTab === 'availability' && (
        <div className="card-premium p-8 animate-fade-in-up">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-xl">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Business Hours</h3>
            </div>
            <button
              onClick={saveAvailability}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          <div className="space-y-6">
            {dayNames.map((dayName, dayIndex) => (
              <div key={dayIndex} className="flex items-center space-x-6 p-6 border border-gray-100 rounded-2xl bg-gray-50">
                <div className="w-32">
                  <span className="font-semibold text-gray-900 text-lg">{dayName}</span>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={availability[dayIndex]?.isOpen || false}
                    onChange={(e) => updateAvailability(dayIndex, 'isOpen', e.target.checked)}
                    className="w-5 h-5 text-primary-600 border-gray-300 rounded-lg focus:ring-primary-500"
                  />
                  <span className="ml-3 font-medium text-gray-700">Open</span>
                </label>

                {availability[dayIndex]?.isOpen && (
                  <div className="flex items-center space-x-4">
                    <input
                      type="time"
                      value={availability[dayIndex].startTime}
                      onChange={(e) => updateAvailability(dayIndex, 'startTime', e.target.value)}
                      className="input-premium"
                    />
                    <span className="text-gray-500 font-medium">to</span>
                    <input
                      type="time"
                      value={availability[dayIndex].endTime}
                      onChange={(e) => updateAvailability(dayIndex, 'endTime', e.target.value)}
                      className="input-premium"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Tab */}
      {activeSubTab === 'gallery' && (
        <div className="space-y-8 animate-fade-in-up">
          <div className="card-premium p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-primary-100 p-2 rounded-xl">
                <Camera className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Upload New Media</h3>
            </div>
            <MediaUpload 
              barberId={barber.id} 
              onUploadComplete={() => {
                setGalleryRefreshTrigger(prev => prev + 1);
              }} 
            />
          </div>

          <div className="card-premium p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-accent-100 p-2 rounded-xl">
                <ImageIcon className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-gray-900">Your Gallery</h3>
            </div>
            <MediaGallery 
              barberId={barber.id} 
              isOwner={true}
              refreshTrigger={galleryRefreshTrigger}
              onMediaUpdate={() => {
                setGalleryRefreshTrigger(prev => prev + 1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BarberProfile;