import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Settings, 
  Save, 
  Edit, 
  MessageSquare,
  CheckCircle,
  X,
  Loader,
  AlertCircle,
  Camera,
  Upload
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../lib/supabase';
import { uploadAvatar } from '../../lib/uploadAvatar';
import ConsentManagement from './ConsentManagement';
import { NotificationManager } from '../../utils/notifications';
import { validateEmail, validatePhone, validateFileUpload } from '../../utils/security';

type ClientProfileRow = Database['public']['Tables']['client_profiles']['Row'];

function isUniqueViolation(err: any) {
  // Postgres unique_violation - Supabase wraps it as code '23505'
  return err && (err.code === '23505' || String(err.message || '').includes('duplicate key'));
}

// Ensures a profile row exists for the authenticated user.
// Strategy:
// 1) Try select by user_id
// 2) If none, attempt insert with minimal defaults
// 3) If insert fails with unique race, re-select
// 4) If RLS blocks insert, return null and let UI show a soft message
async function ensureOrFetchClientProfile(userId: string): Promise<ClientProfileRow | null> {
  // 1) Try existing
  {
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) return data as ClientProfileRow;
    if (error && error.code && error.code !== 'PGRST116') {
      console.warn('[ClientProfile] initial fetch error (continuing):', error);
    }
  }

  // 2) Attempt insert minimal row
  try {
    const minimal = {
      user_id: userId,
      first_name: '',
      last_name: '',
      email: '',
      phone: null,
      preferred_contact: 'sms' as const,
      profile_image_url: null,
    };
    const { data: created, error: insertErr } = await supabase
      .from('client_profiles')
      .insert(minimal)
      .select('*')
      .single();

    if (!insertErr && created) {
      return created as ClientProfileRow;
    }
    if (insertErr) {
      // 3) Handle race: someone else inserted first
      if (isUniqueViolation(insertErr)) {
        const { data: again, error: againErr } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!againErr && again) return again as ClientProfileRow;
      }

      // RLS or other error: log and fail open
      console.warn('[ClientProfile] insert blocked or failed (continuing):', insertErr);
      return null;
    }
  } catch (e) {
    console.warn('[ClientProfile] insert exception (continuing):', e);
    return null;
  }

  return null;
}

const ClientProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [clientProfile, setClientProfile] = useState<ClientProfileRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [softError, setSoftError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfileRow | null>(null);
  const [consentJustUpdated, setConsentJustUpdated] = useState(false);
  
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    preferred_contact: 'sms' as 'sms' | 'email' | 'phone',
    profile_image_url: ''
  });

  // Define fetchClientProfile function to refresh profile data
  const fetchClientProfile = React.useCallback(async () => {
    const uid = userId ?? null;
    if (!uid) {
      setProfile(null);
      setClientProfile(null);
      return;
    }

    try {
      const result = await ensureOrFetchClientProfile(uid);
      if (result) {
        setProfile(result);
        setClientProfile(result);
        setEditData({
          first_name: result.first_name || '',
          last_name: result.last_name || '',
          phone: result.phone || '',
          email: result.email || '',
          preferred_contact: result.preferred_contact as 'sms' | 'email' | 'phone' || 'sms',
          profile_image_url: result.profile_image_url || ''
        });
      }
    } catch (error) {
      console.warn('[ClientProfile] fetchClientProfile error:', error);
    }
  }, [userId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // 🚫 Never hit Supabase with undefined user_id
      const uid = userId ?? null;
      if (!uid) {
        setLoading(false);          // clear any spinners
        setSoftError(null);         // don't show scary messages
        setProfile(null);           // nothing yet
        return;                     // wait until userId exists
      }

      setLoading(true);
      setSoftError(null);

      // Cap the whole operation so UI never hangs
      const result = await Promise.race([
        ensureOrFetchClientProfile(uid),
        new Promise<null>(res => setTimeout(() => res(null), 4000)),
      ]);

      if (!alive) return;

      if (result) {
        setProfile(result);
        setClientProfile(result);
        setEditData({
          first_name: result.first_name || '',
          last_name: result.last_name || '',
          phone: result.phone || '',
          email: result.email || '',
          preferred_contact: result.preferred_contact as 'sms' | 'email' | 'phone' || 'sms',
          profile_image_url: result.profile_image_url || ''
        });
      } else {
        // Could not fetch or create due to RLS or timeout. Do not throw.
        setSoftError('We could not load your profile yet. You can still edit and save to create it.');
        setProfile(null);
        setClientProfile(null);
        // Initialize with user data if available
        setEditData({
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          phone: '',
          email: user?.email || '',
          preferred_contact: 'sms',
          profile_image_url: ''
        });
      }

      setLoading(false);
    })();

    return () => { alive = false; };
  }, [userId, user]); // 🔁 Only run when userId is available

  // Handle profile refresh after consent updates
  useEffect(() => {
    if (!consentJustUpdated || !userId) return;
    
    let cancelled = false;
    
    const run = async () => {
      try {
        const result = await ensureOrFetchClientProfile(userId);
        if (!cancelled && result) {
          setProfile(result);
          setClientProfile(result);
        }
      } catch (error) {
        console.warn('Error refreshing profile after consent update:', error);
     };
    
     void run();
    
    return () => {
      cancelled = true;
    };
  }, [consentJustUpdated, userId]);

  const handleSave = async () => {
    const uid = userId ?? null;
    if (!uid) return;

    // Validation
    if (!editData.first_name.trim() || !editData.last_name.trim()) {
      NotificationManager.error('First name and last name are required');
      return;
    }

    if (editData.email && !validateEmail(editData.email)) {
      NotificationManager.error('Please enter a valid email address');
      return;
    }

    if (editData.phone && !validatePhone(editData.phone)) {
      NotificationManager.error('Please enter a valid phone number');
      return;
    }

    setSaving(true);
    setSoftError(null);
    setSuccessMessage('');

    try {
      const payload = {
        user_id: uid,
        first_name: editData.first_name.trim(),
        last_name: editData.last_name.trim(),
        phone: editData.phone.trim() || null,
        email: editData.email.trim() || null,
        preferred_contact: editData.preferred_contact,
        profile_image_url: editData.profile_image_url || null,
        updated_at: new Date().toISOString()
      };

      // Use upsert to handle both create and update cases
      const { data: savedProfile, error: saveError } = await supabase
        .from('client_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select('*')
        .single();

      if (saveError) throw saveError;

      // Update local state
      setProfile(savedProfile as ClientProfileRow);
      setClientProfile(savedProfile as ClientProfileRow);
      setSoftError(null);

      setIsEditing(false);
      NotificationManager.success('Profile updated successfully!');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setSoftError('Save failed. Please try again.');
      NotificationManager.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        preferred_contact: profile.preferred_contact as 'sms' | 'email' | 'phone' || 'sms',
        profile_image_url: profile.profile_image_url || ''
      });
    }
    setIsEditing(false);
    setSoftError(null);
    setSuccessMessage('');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Guard: ensure user is signed in before upload
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      NotificationManager.error('Please sign in to upload your profile image.');
      return;
    }

    // Validate file
    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      NotificationManager.error(validation.error || 'Invalid file');
      return;
    }

    setUploadingImage(true);
    try {
      // Use the centralized avatar upload utility
      const avatarUrl = await uploadAvatar(file, auth.user.id, 'clients');

      // Update profile if it exists, otherwise just update local state
      if (profile) {
        const { error: updateError } = await supabase
          .from('client_profiles')
          .update({
            profile_image_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        // Update local state
        setProfile(prev => prev ? { ...prev, profile_image_url: avatarUrl } : null);
      } else {
        // No profile yet - just update form state
        setEditData(prev => ({ ...prev, profile_image_url: avatarUrl }));
      }

      // Also update user metadata for immediate display
      await supabase.auth.updateUser({ 
        data: { avatar_url: avatarUrl } 
      });
      
      NotificationManager.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      NotificationManager.error('Failed to upload image. Please check your Supabase storage configuration.');
    } finally {
      setUploadingImage(false);
      // Reset file input to allow re-selection of the same file
      const fileInput = document.getElementById('client-profile-image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border bg-white shadow-sm p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-2 rounded-xl">
            <User className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900">My Profile</h2>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCancel}
              className="btn-secondary"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-2xl mb-6 flex items-center space-x-3">
          <div className="bg-emerald-500 p-1.5 rounded-lg">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-6 flex items-center space-x-3">
          <div className="bg-red-500 p-1.5 rounded-lg">
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-6">
          {/* Profile Image Upload */}
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Profile Photo
            </label>
            <div className="relative inline-block">
              <img
                src={editData.profile_image_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200'}
                alt="Profile"
                className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-premium"
              />
              <label
                htmlFor="client-profile-image-upload"
                className="absolute -bottom-2 -right-2 bg-primary-500 text-white p-3 rounded-xl cursor-pointer hover:bg-primary-600 transition-all duration-200 shadow-lg hover:scale-110"
              >
                {uploadingImage ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
              <input
                id="client-profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG • Max 10MB</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={editData.first_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-10"
                  placeholder="First name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={editData.last_name}
                  onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-10"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-10"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 pl-10"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Preferred Contact Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Contact Method
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`flex items-center p-6 border rounded-2xl cursor-pointer transition-all duration-200 ${
                editData.preferred_contact === 'sms' 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="preferred_contact"
                  value="sms"
                  checked={editData.preferred_contact === 'sms'}
                  onChange={(e) => setEditData(prev => ({ ...prev, preferred_contact: e.target.value as 'sms' }))}
                  className="sr-only"
                />
                <div className="bg-primary-100 p-2 rounded-lg mr-4">
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">SMS</p>
                  <p className="text-gray-600">Text messages</p>
                </div>
              </label>

              <label className={`flex items-center p-6 border rounded-2xl cursor-pointer transition-all duration-200 ${
                editData.preferred_contact === 'email' 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="preferred_contact"
                  value="email"
                  checked={editData.preferred_contact === 'email'}
                  onChange={(e) => setEditData(prev => ({ ...prev, preferred_contact: e.target.value as 'email' }))}
                  className="sr-only"
                />
                <div className="bg-accent-100 p-2 rounded-lg mr-4">
                  <Mail className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Email</p>
                  <p className="text-gray-600">Email notifications</p>
                </div>
              </label>

              <label className={`flex items-center p-6 border rounded-2xl cursor-pointer transition-all duration-200 ${
                editData.preferred_contact === 'phone' 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="preferred_contact"
                  value="phone"
                  checked={editData.preferred_contact === 'phone'}
                  onChange={(e) => setEditData(prev => ({ ...prev, preferred_contact: e.target.value as 'phone' }))}
                  className="sr-only"
                />
                <div className="bg-yellow-100 p-2 rounded-lg mr-4">
                  <Phone className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Phone</p>
                  <p className="text-gray-600">Phone calls</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-6 pb-8 border-b border-gray-100">
            <div className="relative">
              <img
                src={clientProfile?.profile_image_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200'}
                alt="Profile"
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-premium"
              />
              <div className="absolute -bottom-1 -right-1 bg-accent-500 text-white p-1.5 rounded-lg shadow-lg">
                <User className="h-3 w-3" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-gray-900 mb-2">
                {clientProfile?.first_name} {clientProfile?.last_name}
              </h3>
              <div className="flex items-center space-x-3 mb-2">
                <span className="bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-semibold">Customer</span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">Active</span>
              </div>
              <p className="text-gray-500 font-medium">
                Member since {clientProfile?.created_at ? new Date(clientProfile.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                }) : 'Recently'}
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-xl font-display font-bold text-gray-900 mb-6">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="bg-primary-100 p-2 rounded-lg">
                      <User className="h-4 w-4 text-primary-600" />
                    </div>
                    <span className="text-gray-900 font-medium">
                      {clientProfile?.first_name} {clientProfile?.last_name}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="bg-accent-100 p-2 rounded-lg">
                      <Mail className="h-4 w-4 text-accent-600" />
                    </div>
                    <span className="text-gray-900 font-medium">
                      {clientProfile?.email || user?.email || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <Phone className="h-4 w-4 text-yellow-600" />
                    </div>
                    <span className="text-gray-900 font-medium">
                      {clientProfile?.phone ? formatPhoneNumber(clientProfile.phone) : 'Not provided'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                    {clientProfile?.preferred_contact === 'sms' && <MessageSquare className="h-4 w-4 text-gray-400" />}
                    {clientProfile?.preferred_contact === 'email' && <Mail className="h-4 w-4 text-gray-400" />}
                    {clientProfile?.preferred_contact === 'phone' && <Phone className="h-4 w-4 text-gray-400" />}
                    <span className="text-gray-900 font-medium capitalize">
                      {clientProfile?.preferred_contact === 'sms' ? 'Text Messages' : 
                       clientProfile?.preferred_contact === 'email' ? 'Email' : 
                       clientProfile?.preferred_contact === 'phone' ? 'Phone Calls' : 'SMS'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Consent Management */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-xl font-display font-bold text-gray-900 mb-6">Communication Preferences</h4>
            <div className="space-y-4">
              <ConsentManagement 
                userId={userId}
                userType="client"
                currentConsent={{
                   communication: clientProfile?.communication_consent ?? false,
                   sms: clientProfile?.sms_consent ?? false,
                   email: clientProfile?.email_consent ?? false
                }}
                onConsentUpdate={() => {
                  setConsentJustUpdated(true);
                }}
              />
            </div>
          </div>

          {/* Account Information */}
          <div className="pt-6 border-t border-gray-200">
            <h4 className="text-xl font-display font-bold text-gray-900 mb-6">Account Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Email</label>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
                  <div className="bg-gray-200 p-2 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="text-gray-900 font-medium">{user?.email}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">This is your login email and cannot be changed here</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-xl">
                  <div className="bg-emerald-500 p-2 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-emerald-800 font-semibold">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Preferences Info */}
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-primary-500 p-2 rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h5 className="font-semibold text-primary-900 mb-2">Communication Preferences</h5>
                <p className="text-primary-800 leading-relaxed">
                  You'll receive booking confirmations, reminders, and updates via your preferred contact method.
                  {!clientProfile?.phone && clientProfile?.preferred_contact === 'sms' && (
                    <span className="block mt-2 text-primary-700 font-semibold">
                      Add a phone number to receive SMS notifications.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProfileSettings;