import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  Crown, 
  CheckCircle, 
  AlertTriangle, 
  Loader, 
  ArrowLeft,
  User,
  Sparkles,
  Building,
  Phone,
  Mail,
  MapPin,
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { NotificationManager } from '../utils/notifications';

const ClaimPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [prefill, setPrefill] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 1) Force authentication - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Save where to return to after login
        sessionStorage.setItem('postLoginRedirect', `/claim/${token}`);
        navigate('/login', { replace: true });
        return;
      }
      
      // User is authenticated, proceed with claim setup
      loadClaimData();
    }
  }, [token, user, authLoading, navigate]);

  // 2) Load prefill data via claim-peek, with sessionStorage fallback
  const loadClaimData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      
      // Try to get claim data from server first
      const { data, error } = await supabase.functions.invoke('claim-peek', {
        body: { token }
      });

      if (!error && data?.success && data?.profile) {
        console.log('Loaded claim data from server:', data.profile);
        setPrefill({
          business_name: data.profile.business_name || '',
          owner_name: data.profile.owner_name || '',
          phone: data.profile.phone || '',
          email: data.profile.email || '',
          address: data.profile.address || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          zip_code: data.profile.zip_code || '',
          bio: data.profile.bio || '',
          slug: data.profile.slug || ''
        });
      } else {
        // Fallback to sessionStorage
        const localPayload = sessionStorage.getItem('claim:payload');
        if (localPayload) {
          console.log('Using claim data from sessionStorage');
          const parsed = JSON.parse(localPayload);
          setPrefill({
            business_name: parsed.business_name || '',
            owner_name: parsed.owner_name || '',
            phone: parsed.phone || '',
            email: parsed.email || '',
            address: parsed.address || '',
            city: parsed.city || '',
            state: parsed.state || '',
            zip_code: parsed.zip_code || '',
            bio: parsed.bio || '',
            slug: parsed.slug || ''
          });
        }
      }
    } catch (error) {
      console.warn('Error loading claim data from server, trying sessionStorage:', error);
      
      // Fallback to sessionStorage
      const localPayload = sessionStorage.getItem('claim:payload');
      if (localPayload) {
        try {
          const parsed = JSON.parse(localPayload);
          setPrefill({
            business_name: parsed.business_name || '',
            owner_name: parsed.owner_name || '',
            phone: parsed.phone || '',
            email: parsed.email || '',
            address: parsed.address || '',
            city: parsed.city || '',
            state: parsed.state || '',
            zip_code: parsed.zip_code || '',
            bio: parsed.bio || '',
            slug: parsed.slug || ''
          });
        } catch (parseError) {
          console.error('Error parsing sessionStorage claim data:', parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !token) return;

    setClaiming(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const updates = {
        business_name: formData.get('business_name')?.toString() || prefill.business_name,
        owner_name: formData.get('owner_name')?.toString() || prefill.owner_name,
        phone: formData.get('phone')?.toString() || prefill.phone,
        email: formData.get('email')?.toString() || prefill.email,
        address: formData.get('address')?.toString() || prefill.address,
        city: formData.get('city')?.toString() || prefill.city,
        state: formData.get('state')?.toString() || prefill.state,
        zip_code: formData.get('zip_code')?.toString() || prefill.zip_code,
      };

      // Complete the claim
      const { data, error: claimError } = await supabase.functions.invoke('claim-complete', {
        body: { 
          token, 
          user_id: user.id 
        }
      });

      if (claimError) {
        const errorMessage = claimError?.context?.error || claimError?.message || 'Claim failed';
        throw new Error(errorMessage);
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Claim failed. The link may be expired or already used.';
        throw new Error(errorMessage);
      }

      // Update profile with any form changes
      const barberId = data.profile?.id;
      if (barberId && Object.values(updates).some(v => v)) {
        await supabase
          .from('barber_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', barberId);
      }

      // Success!
      setSuccess(true);
      NotificationManager.success('Profile claimed successfully! Welcome to Kutable.');

      // Clear the payload since claim was successful
      sessionStorage.removeItem('claim:payload');

      // Redirect after short delay
      setTimeout(() => {
        const slug = data.profile?.slug;
        if (slug) {
          navigate(`/barber/${slug}`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 2000);

    } catch (error: any) {
      console.error('Claim completion failed:', error);
      setError(error.message || 'Claim failed. Please try again.');
      NotificationManager.error(error.message || 'Failed to claim profile');
    } finally {
      setClaiming(false);
    }
  };

  // Don't render anything if not authenticated (will redirect)
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <p className="text-gray-600 font-medium">
            {authLoading ? 'Checking authentication...' : 'Redirecting to sign in...'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container">
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-premium animate-float">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <p className="text-gray-600 font-medium">Preparing your claim...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="max-w-lg mx-auto text-center space-y-8 relative z-10 animate-fade-in-up">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-premium animate-float">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          
          <div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Profile Claimed!</h1>
            <p className="text-xl text-gray-600 font-medium mb-6">
              Congratulations! Your barber profile has been successfully claimed.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8">
            <h4 className="font-display font-bold text-emerald-800 mb-4 text-lg">What's Next?</h4>
            <ul className="text-emerald-700 text-sm space-y-2 text-left font-medium">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Set up your services and pricing</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Configure your business hours</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Add photos to showcase your work</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Connect Stripe to accept payments</span>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
            </div>
            <p className="text-gray-500 font-medium">Redirecting to your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <div className="bg-gradient-to-br from-red-500 to-red-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-premium">
            <AlertTriangle className="h-12 w-12 text-white" />
          </div>
          
          <div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Claim Failed</h1>
            <p className="text-xl text-gray-600 font-medium mb-8">
              {error}
            </p>
          </div>
          
          <div className="space-y-4">
            <Link
              to="/barbers"
              className="btn-primary hover:scale-105 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Directory</span>
            </Link>
            
            <Link
              to="/support"
              className="btn-secondary hover:scale-105 transition-all duration-200"
            >
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 relative z-10">
          <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Complete Your Claim</h1>
          <p className="text-xl text-gray-600 font-medium">
            Review and update your business information to finalize your profile claim
          </p>
        </div>

        <div className="card-premium relative z-10 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="bg-blue-500 p-2 rounded-xl">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-blue-800 text-lg">Almost There!</h3>
                </div>
                <p className="text-blue-700 leading-relaxed">
                  Review the information below and make any necessary updates. This will become your public business profile.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name *
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    name="business_name"
                    type="text"
                    defaultValue={prefill.business_name || ''}
                    required
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="Your business name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Owner Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    name="owner_name"
                    type="text"
                    defaultValue={prefill.owner_name || ''}
                    required
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={prefill.phone || ''}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    defaultValue={prefill.email || user.email || ''}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Business Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  name="address"
                  type="text"
                  defaultValue={prefill.address || ''}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  placeholder="123 Main Street"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  name="city"
                  type="text"
                  defaultValue={prefill.city || ''}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                <input
                  name="state"
                  type="text"
                  defaultValue={prefill.state || ''}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code</label>
                <input
                  name="zip_code"
                  type="text"
                  defaultValue={prefill.zip_code || ''}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  placeholder="12345"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={claiming}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
              >
                {claiming ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Claiming Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Complete Claim</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Navigation */}
        <div className="text-center mt-8 relative z-10">
          <Link
            to="/barbers"
            className="text-gray-600 hover:text-gray-500 transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Directory</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClaimPage;