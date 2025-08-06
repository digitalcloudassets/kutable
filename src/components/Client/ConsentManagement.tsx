import React, { useState } from 'react';
import { MessageSquare, Mail, Phone, CheckCircle, X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ConsentManagementProps {
  userId?: string;
  userType: 'client' | 'barber';
  currentConsent: {
    communication: boolean;
    sms: boolean;
    email: boolean;
  };
  onConsentUpdate: () => void;
}

const ConsentManagement: React.FC<ConsentManagementProps> = ({
  userId,
  userType,
  currentConsent,
  onConsentUpdate
}) => {
  const [consent, setConsent] = useState(currentConsent);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateConsent = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const table = userType === 'client' ? 'client_profiles' : 'barber_profiles';
      
      const { error } = await supabase
        .from(table)
        .update({
          communication_consent: consent.communication,
          sms_consent: consent.sms,
          email_consent: consent.email,
          consent_updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Consent preferences updated successfully!' });
      onConsentUpdate();
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      console.error('Error updating consent:', error);
      setMessage({ type: 'error', text: 'Failed to update preferences. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return consent.communication !== currentConsent.communication ||
           consent.sms !== currentConsent.sms ||
           consent.email !== currentConsent.email;
  };

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <div className={`border rounded-lg p-4 flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Consent Options */}
      <div className="space-y-4">
        {/* Marketing Communications */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.communication}
              onChange={(e) => setConsent(prev => ({ ...prev, communication: e.target.checked }))}
              className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-1"
            />
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">Marketing Communications</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Receive promotional emails about new features, special offers, and platform updates. 
                You can unsubscribe anytime.
              </p>
            </div>
          </label>
        </div>

        {/* SMS Notifications */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.sms}
              onChange={(e) => setConsent(prev => ({ ...prev, sms: e.target.checked }))}
              className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-1"
            />
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-900">SMS Notifications</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {userType === 'client' 
                  ? 'Receive booking confirmations, appointment reminders, and important updates via text message.'
                  : 'Receive booking notifications, payment updates, and customer messages via text message.'
                }
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Standard message rates may apply. Reply STOP to opt out anytime.
              </p>
            </div>
          </label>
        </div>

        {/* Email Notifications */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent.email}
              onChange={(e) => setConsent(prev => ({ ...prev, email: e.target.checked }))}
              className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-1"
            />
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Mail className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900">Email Notifications</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Essential
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {userType === 'client'
                  ? 'Receive booking receipts, account security alerts, and important service updates via email.'
                  : 'Receive payment confirmations, security alerts, and important business updates via email.'
                }
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 mb-1">Important Notice</h4>
            <p className="text-sm text-yellow-700 leading-relaxed">
              Even if you opt out of marketing communications, you will still receive essential 
              transactional messages related to your {userType === 'client' ? 'bookings' : 'business'} 
              and account security. These are necessary for the proper functioning of the service.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges() && (
        <div className="flex justify-end">
          <button
            onClick={updateConsent}
            disabled={saving}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Legal Links */}
      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          For more information about how we use your data, please review our{' '}
          <a href="/privacy" className="text-orange-600 hover:text-orange-500 underline">Privacy Policy</a> and{' '}
          <a href="/terms" className="text-orange-600 hover:text-orange-500 underline">Terms of Service</a>.
        </p>
      </div>
    </div>
  );
};

export default ConsentManagement;