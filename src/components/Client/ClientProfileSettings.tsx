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
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Database } from '../../lib/supabase';
import ConsentManagement from './ConsentManagement';
import { NotificationManager } from '../../utils/notifications';
import { validateEmail, validatePhone } from '../../utils/security';

type ClientProfile = Database['public']['Tables']['client_profiles']['Row'];

const ClientProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    preferred_contact: 'sms' as 'sms' | 'email' | 'phone'
  });

  useEffect(() => {
    if (user) {
      fetchClientProfile();
    }
  }, [user]);

  const fetchClientProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      
      const { data: existingProfile, error: fetchError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingProfile) {
        setClientProfile(existingProfile);
        setEditData({
          first_name: existingProfile.first_name || '',
          last_name: existingProfile.last_name || '',
          phone: existingProfile.phone || '',
          email: existingProfile.email || '',
          preferred_contact: existingProfile.preferred_contact as 'sms' | 'email' | 'phone' || 'sms'
        });
      } else {
        // Create client profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            phone: '',
            preferred_contact: 'sms'
          })
          .select()
          .single();

        if (createError) throw createError;

        setClientProfile(newProfile);
        setEditData({
          first_name: newProfile.first_name || '',
          last_name: newProfile.last_name || '',
          phone: newProfile.phone || '',
          email: newProfile.email || '',
          preferred_contact: newProfile.preferred_contact as 'sms' | 'email' | 'phone' || 'sms'
        });
      }
    } catch (error: any) {
      console.error('Error fetching client profile:', error);
      if (error.message?.includes('Connect to Supabase')) {
        setError('Please connect to Supabase to manage your profile');
      } else {
        setError('Failed to load profile information');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !clientProfile) return;

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
    setError('');
    setSuccessMessage('');

    try {
      const { error: updateError } = await supabase
        .from('client_profiles')
        .update({
          first_name: editData.first_name.trim(),
          last_name: editData.last_name.trim(),
          phone: editData.phone.trim() || null,
          email: editData.email.trim() || null,
          preferred_contact: editData.preferred_contact,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientProfile.id);

      if (updateError) throw updateError;

      // Update local state
      setClientProfile(prev => prev ? {
        ...prev,
        first_name: editData.first_name.trim(),
        last_name: editData.last_name.trim(),
        phone: editData.phone.trim() || null,
        email: editData.email.trim() || null,
        preferred_contact: editData.preferred_contact,
        updated_at: new Date().toISOString()
      } : null);

      setIsEditing(false);
      NotificationManager.success('Profile updated successfully!');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      NotificationManager.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (clientProfile) {
      setEditData({
        first_name: clientProfile.first_name || '',
        last_name: clientProfile.last_name || '',
        phone: clientProfile.phone || '',
        email: clientProfile.email || '',
        preferred_contact: clientProfile.preferred_contact as 'sms' | 'email' | 'phone' || 'sms'
      });
    }
    setIsEditing(false);
    setError('');
    setSuccessMessage('');
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
    <div className="card-premium p-8">
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
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 w-20 h-20 rounded-2xl flex items-center justify-center shadow-premium">
              <User className="h-10 w-10 text-white" />
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
                userId={user?.id}
                userType="client"
                currentConsent={{
                   communication: clientProfile?.communication_consent ?? false,
                   sms: clientProfile?.sms_consent ?? false,
                   email: clientProfile?.email_consent ?? false
                }}
                onConsentUpdate={fetchClientProfile}
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