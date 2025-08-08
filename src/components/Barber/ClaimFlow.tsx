import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  AlertCircle,
  Crown,
  Sparkles,
  Shield,
  Edit,
  Save,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { Database } from '../../lib/supabase';
import { isReservedSlug } from '../../lib/reservedSlugs';
import { NotificationManager } from '../../utils/notifications';
import { generateUniqueSlug } from '../../utils/updateBarberSlugs';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

const ClaimFlow: React.FC = () => {
  const { barberId } = useParams<{ barberId: string }>();
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [barber, setBarber] = useState<Barber | null>(null);
  const [isCSVProfile, setIsCSVProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
    const fetchBarber = async () => {
      if (!barberId) return;
      
      try {
        // First try to fetch from database
        const { data: dbBarber, error: dbError } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('id', barberId)
          .maybeSingle();

        if (dbBarber) {
          setBarber(dbBarber);
          setIsCSVProfile(false);
          setClaimData({
            businessName: dbBarber.business_name || '',
            ownerName: dbBarber.owner_name || '',
            phone: dbBarber.phone || '',
            email: dbBarber.email || '',
            address: dbBarber.address || '',
            city: dbBarber.city || '',
            state: dbBarber.state || '',
            zipCode: dbBarber.zip_code || '',
            bio: dbBarber.bio || ''
          });
        } else {
          // Try to fetch from CSV data stored in localStorage
          const csvData = localStorage.getItem('csvBarberData');
          if (csvData) {
            const parsedData = JSON.parse(csvData);
            const csvBarber = parsedData.find((b: any) => b.id === barberId);
            
            if (csvBarber) {
              setBarber(csvBarber);
              setIsCSVProfile(true);
              setClaimData({
                businessName: csvBarber.business_name || '',
                ownerName: csvBarber.owner_name || '',
                phone: csvBarber.phone || '',
                email: csvBarber.email || '',
                address: csvBarber.address || '',
                city: csvBarber.city || '',
                state: csvBarber.state || '',
                zipCode: csvBarber.zip_code || '',
                bio: csvBarber.bio || ''
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching barber:', error);
        setError('Failed to load barber profile');
      } finally {
        setLoading(false);
      }
    };

    fetchBarber();
  }, [barberId]);

  const handleClaim = async () => {
    if (!user) {
      setError('Please sign in to claim this profile');
      return;
    }

    if (!isConnected) {
      setError('Please connect to Supabase to claim this profile');
      return;
    }

    setClaiming(true);
    setError('');

    try {
      // Check if this user already has a barber profile
      const { data: existingUserProfile } = await supabase
        .from('barber_profiles')
        .select('id, slug')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingUserProfile) {
        // User already has a profile, redirect to it
        navigate(`/barber/${existingUserProfile.slug}`);
        return;
      }

      // Generate a unique slug
      const finalSlug = await generateUniqueSlug(claimData.businessName);

      if (isCSVProfile) {
        // Create new profile for CSV profiles that don't exist in database
        const { data: newProfile, error: createError } = await supabase
          .from('barber_profiles')
          .insert({
            user_id: user.id,
            slug: finalSlug,
            business_name: claimData.businessName,
            owner_name: claimData.ownerName,
            phone: claimData.phone || null,
            email: claimData.email || null,
            address: claimData.address || null,
            city: claimData.city || null,
            state: claimData.state || null,
            zip_code: claimData.zipCode || null,
            bio: claimData.bio || null,
            profile_image_url: barber?.profile_image_url || null,
            banner_image_url: barber?.banner_image_url || null,
            is_claimed: true,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        
        // Clear the stored return URL
        localStorage.removeItem('claim_return_url');
        
        setSuccess(true);
        NotificationManager.success('Profile claimed successfully!');
        
        // Redirect to the new profile after showing success
        setTimeout(() => {
          navigate(`/barber/${finalSlug}`);
        }, 2000);
      } else {
        // Update existing database profile
        const { error: updateError } = await supabase
          .from('barber_profiles')
          .update({
            user_id: user.id,
            slug: finalSlug,
            business_name: claimData.businessName,
            owner_name: claimData.ownerName,
            phone: claimData.phone || null,
            email: claimData.email || null,
            address: claimData.address || null,
            city: claimData.city || null,
            state: claimData.state || null,
            zip_code: claimData.zipCode || null,
            bio: claimData.bio || null,
            is_claimed: true,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', barberId);

        if (updateError) throw updateError;
        
        // Clear the stored return URL
        localStorage.removeItem('claim_return_url');
        
        setSuccess(true);
        NotificationManager.success('Profile claimed successfully!');
        
        // Redirect to the updated profile after showing success
        setTimeout(() => {
          navigate(`/barber/${finalSlug}`);
        }, 2000);
      }
      
    } catch (error: any) {
      console.error('Error claiming profile:', error);
      setError(error.message);
      NotificationManager.error('Failed to claim profile. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="text-center space-y-6 relative z-10">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading business profile...</p>
            <p className="text-sm text-gray-500">Preparing claim information</p>
          </div>
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center page-container relative overflow-hidden">
        <div className="text-center space-y-6 relative z-10">
          <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Crown className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-8">The business profile you're trying to claim doesn't exist or has already been claimed.</p>
          <Link
            to="/barbers"
            className="btn-primary"
          >
            Browse Directory
          </Link>
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
            <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">Profile Claimed Successfully!</h2>
            <p className="text-xl text-gray-600 font-medium mb-6">
              Congratulations! Your profile for <strong>{claimData.businessName}</strong> has been successfully claimed.
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
            
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary hover:scale-105 transition-all duration-200"
            >
              Go to Dashboard Now
            </button>
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
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-6">Claim Your Profile</h1>
          <p className="text-xl text-gray-600 font-medium">
            Review your business information and claim your profile on Kutable
          </p>
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center space-x-3 relative z-10">
            <div className="bg-red-500 p-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Business Profile Display */}
        <div className="card-premium relative z-10 animate-fade-in-up">
          {/* Profile Header */}
          <div className="p-8 sm:p-12 text-center border-b border-gray-100">
            <div className="space-y-6">
              <div className="relative inline-block">
                <img 
                  src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=200'} 
                  alt={barber.business_name}
                  className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-premium" 
                />
                <div className="absolute -bottom-2 -right-2 bg-accent-500 text-white p-2 rounded-xl shadow-lg">
                  <Crown className="h-4 w-4" />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">{barber.business_name}</h2>
                <p className="text-xl text-gray-600 font-medium mb-4">{barber.owner_name}</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center space-x-1">
                    <div className="bg-yellow-100 p-1.5 rounded-lg">
                      <Crown className="h-4 w-4 text-yellow-600" />
                    </div>
                    <span className="font-medium text-gray-900">Available to Claim</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Information Form */}
          <div className="p-8 sm:p-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 p-3 rounded-2xl">
                  <Building className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-2xl font-display font-bold text-gray-900">Business Information</h3>
              </div>
              {user && (
                <div className="flex items-center space-x-2">
                  <Edit className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">Review and update as needed</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={claimData.businessName}
                      onChange={(e) => setClaimData(prev => ({ ...prev, businessName: e.target.value.slice(0, 100) }))}
                      disabled={!user}
                      autoComplete="organization"
                      spellCheck={false}
                      className={`w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                        !user ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="Your business name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Name *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={claimData.ownerName}
                      onChange={(e) => setClaimData(prev => ({ ...prev, ownerName: e.target.value.slice(0, 100) }))}
                      disabled={!user}
                      autoComplete="name"
                      spellCheck={false}
                      className={`w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                        !user ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={claimData.phone}
                      onChange={(e) => setClaimData(prev => ({ ...prev, phone: e.target.value.replace(/[^\d\s\-\(\)\+\.]/g, '').slice(0, 20) }))}
                      disabled={!user}
                      autoComplete="tel"
                      className={`w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                        !user ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={claimData.email}
                      onChange={(e) => setClaimData(prev => ({ ...prev, email: e.target.value.slice(0, 254).toLowerCase() }))}
                      disabled={!user}
                      autoComplete="email"
                      spellCheck={false}
                      className={`w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                        !user ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
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
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={claimData.address}
                    onChange={(e) => setClaimData(prev => ({ ...prev, address: e.target.value.slice(0, 200) }))}
                    disabled={!user}
                    autoComplete="street-address"
                    className={`w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      !user ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="Street address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={claimData.city}
                    onChange={(e) => setClaimData(prev => ({ ...prev, city: e.target.value.slice(0, 50) }))}
                    disabled={!user}
                    autoComplete="address-level2"
                    className={`w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      !user ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={claimData.state}
                    onChange={(e) => setClaimData(prev => ({ ...prev, state: e.target.value.slice(0, 50) }))}
                    disabled={!user}
                    autoComplete="address-level1"
                    className={`w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      !user ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={claimData.zipCode}
                    onChange={(e) => setClaimData(prev => ({ ...prev, zipCode: e.target.value.replace(/[^\d\-]/g, '').slice(0, 10) }))}
                    disabled={!user}
                    autoComplete="postal-code"
                    className={`w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      !user ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                  <textarea
                    value={claimData.bio}
                    onChange={(e) => setClaimData(prev => ({ ...prev, bio: e.target.value.slice(0, 1000) }))}
                    disabled={!user}
                    rows={4}
                    className={`w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 ${
                      !user ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="Tell customers about your services and experience..."
                    maxLength={1000}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{claimData.bio.length}/1000 characters</p>
              </div>
            </div>

            {/* Action Section */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              {!user ? (
                /* Not Authenticated State */
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <div className="bg-blue-500 p-2 rounded-xl">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-display font-bold text-blue-800 text-lg">Ready to Claim?</h4>
                    </div>
                    <p className="text-blue-700 leading-relaxed font-medium mb-6">
                      Sign in or create an account to claim <strong>{barber.business_name}</strong> and start accepting online bookings.
                    </p>
                    
                    <div className="space-y-4">
                      <Link
                        to="/login"
                        className="btn-primary w-full hover:scale-105 transition-all duration-200"
                      >
                        <User className="h-5 w-5" />
                        <span>Sign In to Claim</span>
                      </Link>
                      
                      <Link
                        to="/signup?type=barber"
                        className="btn-secondary w-full hover:scale-105 transition-all duration-200"
                      >
                        <Sparkles className="h-5 w-5" />
                        <span>Create Account & Claim</span>
                      </Link>
                    </div>
                  </div>

                  <button
                    disabled
                    className="btn-primary w-full opacity-50 cursor-not-allowed"
                  >
                    <Crown className="h-5 w-5" />
                    <span>Claim Profile (Sign In Required)</span>
                  </button>
                </div>
              ) : (
                /* Authenticated State */
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-8">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <div className="bg-emerald-500 p-2 rounded-xl">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="font-display font-bold text-emerald-800 text-lg">Ready to Approve & Claim</h4>
                    </div>
                    <p className="text-emerald-700 leading-relaxed font-medium">
                      Review the information above, make any necessary updates, then claim your profile to start accepting online bookings.
                    </p>
                  </div>

                  <button
                    onClick={handleClaim}
                    disabled={claiming || !isConnected}
                    className="btn-primary w-full hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {claiming ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Claiming Profile...</span>
                      </>
                    ) : !isConnected ? (
                      <>
                        <AlertCircle className="h-5 w-5" />
                        <span>Connect Supabase Required</span>
                      </>
                    ) : (
                      <>
                        <Crown className="h-5 w-5" />
                        <span>Approve & Claim Profile</span>
                      </>
                    )}
                  </button>

                  {!isConnected && (
                    <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6">
                      <div className="flex items-center justify-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <p className="text-yellow-800 font-medium">
                          Connect to Supabase to complete the claiming process
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Benefits Section */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h4 className="font-display font-bold text-gray-900 text-lg mb-6 text-center">What You Get After Claiming</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Online Booking System</p>
                    <p className="text-gray-600 text-sm">Accept appointments 24/7 through your profile</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Automatic Payments</p>
                    <p className="text-gray-600 text-sm">Get paid when customers book</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Professional Gallery</p>
                    <p className="text-gray-600 text-sm">Showcase your work with photos</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-orange-100 p-2 rounded-lg">
                    <Crown className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Verified Badge</p>
                    <p className="text-gray-600 text-sm">Build trust with customers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start space-x-3">
                <div className="bg-gray-500 p-2 rounded-xl">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Verification Process</h5>
                  <p className="text-gray-600 text-sm leading-relaxed font-medium">
                    By claiming this profile, you confirm that you are the owner or authorized representative 
                    of this business. All claims are subject to verification to maintain platform integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimFlow;