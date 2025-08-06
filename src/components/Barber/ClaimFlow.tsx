import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Building, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  CreditCard,
  ArrowRight,
  Loader,
  AlertCircle
} from 'lucide-react';
import { barberDataService } from '../../shared/services/barberDataService';
import { parseCSV, generateSlug } from '../../shared/utils/csvParser';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { isReservedSlug } from '../../shared/utils/reservedSlugs';
import { Database } from '../../lib/supabase';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

const ClaimFlow: React.FC = () => {
  const { barberId } = useParams<{ barberId: string }>();
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'signin' | 'verify' | 'details' | 'complete'>('signin');
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claimData, setClaimData] = useState({
    businessName: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    bio: ''
  });

  useEffect(() => {
    if (barberId) {
      fetchBarberProfile();
    }
  }, [barberId]);

  useEffect(() => {
    if (user && step === 'signin') {
      setStep('verify');
    }
  }, [user, step]);

  const fetchBarberProfile = async () => {
    try {
      console.log('🔍 Fetching barber profile for ID:', barberId);
      
      // Check if this is a reserved slug that shouldn't be claimable
      if (barberId && isReservedSlug(barberId)) {
        setError('This profile is not available for claiming');
        return;
      }
      
      // Use centralized data service to get barber profile
      const { data: foundBarber, error } = await barberDataService.getBarberProfile(barberId);
      
      if (error || !foundBarber) {
        setError('Barber profile not found');
        return;
      }
      
      if (foundBarber.is_claimed) {
        console.log('⚠️ Profile already claimed, redirecting...');
        navigate(`/barber/${foundBarber.slug}`);
        return;
      }

      console.log('📋 Found barber profile:', foundBarber.business_name);
      setBarber(foundBarber);
      setClaimData({
        businessName: foundBarber.business_name || '',
        ownerName: foundBarber.owner_name || '',
        phone: foundBarber.phone || '',
        email: foundBarber.email || '',
        address: foundBarber.address || '',
        city: foundBarber.city || '',
        state: foundBarber.state || '',
        zipCode: foundBarber.zip_code || '',
        bio: foundBarber.bio || ''
      });
    } catch (error) {
      console.error('Error fetching barber profile:', error);
      setError('Unable to load barber profile');
    }
  };

  // Enhanced CSV parsing function
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
  const handleDetailsSubmit = async () => {
    if (!isConnected) {
      setError('Please connect to Supabase to claim this profile');
      return;
    }

    if (!user) {
      setError('Please sign in to continue with claiming');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if this user already has a barber profile
      const supabase = barberDataService.getSupabaseClient();
      const { data: existingProfile } = await supabase
        .from('barber_profiles')
        .select('id, slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // User already has a profile, redirect to it
        navigate(`/barber/${existingProfile.slug}`);
        return;
      }

      // Check if someone already claimed the "kutable" slug
      const { data: slugExists } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('slug', 'kutable')
        .maybeSingle();

      // Generate a unique slug - if kutable is taken, create business-based slug
      let finalSlug = claimData.businessName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
        
      // For demo "kutable" profile, use "kutable" if available
      if (barberId === 'demo-kutable' && !slugExists) {
        finalSlug = 'kutable';
      } else if (slugExists) {
        // Add timestamp to make it unique
        finalSlug = `${finalSlug}-${Date.now()}`;
      }
      if (slugExists) {
        finalSlug = `${finalSlug}-${Date.now()}`;
      }

      // Create new barber profile (for CSV profiles that don't exist in DB yet)
      const { data: newProfile, error: createError } = await supabase
        .from('barber_profiles')
        .insert({
          user_id: user?.id,
          slug: finalSlug,
          business_name: claimData.businessName,
          owner_name: claimData.ownerName,
          phone: claimData.phone,
          email: claimData.email,
          address: claimData.address,
          city: claimData.city,
          state: claimData.state,
          zip_code: claimData.zipCode,
          bio: claimData.bio,
          is_claimed: true,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;

      // Navigate to the new profile
      navigate(`/barber/${finalSlug}`);
      setStep('complete');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  if (!barber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim Your Profile</h1>
          <p className="text-gray-600">
            Verify your identity and start accepting bookings on Kutable
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {['signin', 'verify', 'details', 'complete'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepName
                  ? 'bg-orange-500 text-white'
                  : index < ['signin', 'verify', 'details', 'complete'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index < ['signin', 'verify', 'details', 'complete'].indexOf(step) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className={`w-12 h-1 mx-2 ${
                  index < ['signin', 'verify', 'details', 'complete'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {step === 'signin' && (
            <div className="p-8 text-center">
              <User className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Sign In Required
              </h2>
              <p className="text-gray-600 mb-6">
                To claim this barber profile, you need to sign in or create an account first.
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium block"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="w-full border border-orange-500 text-orange-500 py-3 rounded-lg hover:bg-orange-50 transition-colors font-medium block"
                >
                  Create Account
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Don't worry - we'll bring you back here after you sign in
              </p>
            </div>
          )}

          {step === 'verify' && (
            <div className="p-8 text-center">
              <Building className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Is this your business?
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">{barber.business_name}</h3>
                <p className="text-gray-600">{barber.owner_name}</p>
                {barber.address && (
                  <p className="text-gray-600 mt-2">
                    {barber.address}<br />
                    {barber.city}, {barber.state} {barber.zip_code}
                  </p>
                )}
              </div>
              <p className="text-gray-600 mb-6">
                By claiming this profile, you confirm that you are the owner or authorized representative 
                of this business.
              </p>
              <button
                onClick={handleVerifyIdentity}
                className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Yes, This is My Business
              </button>
              
              {!isConnected && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-yellow-800 text-sm">
                      Connect to Supabase to complete the claiming process
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Update Your Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={claimData.businessName}
                      onChange={(e) => setClaimData(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Your business name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={claimData.ownerName}
                      onChange={(e) => setClaimData(prev => ({ ...prev, ownerName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={claimData.phone}
                        onChange={(e) => setClaimData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={claimData.email}
                        onChange={(e) => setClaimData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={claimData.address}
                      onChange={(e) => setClaimData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={claimData.city}
                      onChange={(e) => setClaimData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={claimData.state}
                      onChange={(e) => setClaimData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={claimData.zipCode}
                      onChange={(e) => setClaimData(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Description
                  </label>
                  <textarea
                    value={claimData.bio}
                    onChange={(e) => setClaimData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Tell customers about your services and experience..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleDetailsSubmit}
                  disabled={loading || !isConnected || !user}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? <Loader className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  <span>
                    {loading ? 'Updating...' : 
                     !isConnected ? 'Connect Supabase Required' :
                     !user ? 'Sign In Required' : 'Claim Profile'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Profile Claimed Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                Your barber profile has been claimed! Complete your setup to start accepting bookings.
              </p>
              <Link
                to="/onboarding?type=barber"
                className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Complete Setup
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimFlow;