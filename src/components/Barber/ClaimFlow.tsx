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
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';
import { Database } from '../../lib/supabase';
import { isReservedSlug } from '../../lib/reservedSlugs';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];

const ClaimFlow: React.FC = () => {
  const { barberId } = useParams<{ barberId: string }>();
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const location = useLocation();
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
      // Store the current claim URL for redirect after authentication
      localStorage.setItem('claim_return_url', location.pathname);
    }
  }, [barberId]);

  useEffect(() => {
    if (user && step === 'signin') {
      // Clear the stored return URL since user is now authenticated
      localStorage.removeItem('claim_return_url');
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
      
      // Check if this is a CSV ID (starts with "csv-")
      if (barberId?.startsWith('csv-')) {
        console.log('📋 Loading CSV barber profile for ID:', barberId);
        
        // Load CSV data directly
        const response = await fetch('/Barbers.csv');
        if (!response.ok) {
          throw new Error(`Failed to load CSV file: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const csvData = parseCSV(csvText);
        
        // Extract index from CSV ID (e.g., "csv-123" -> 123)
        const csvIndex = parseInt(barberId.replace('csv-', '')) - 1;
        const barberData = csvData[csvIndex];
        
        if (!barberData) {
          setError('Barber profile not found');
          return;
        }
        
        // Transform CSV data to barber profile format
        // Use only local clean barber images for CSV profiles
        const localBarberImages = [
          '/clean barbershop.jpeg',
          '/clean barbers.webp'
        ];
        const imageUrl = localBarberImages[csvIndex % localBarberImages.length];
        
        const profile = {
          id: barberId,
          slug: generateSlug(barberData.business_name, csvIndex),
          business_name: barberData.business_name,
          owner_name: barberData.owner_name,
          phone: barberData.phone || barberData.direct_phone || null,
          email: barberData.email || null,
          address: barberData.address || null,
          city: barberData.city || null,
          state: barberData.state || null,
          zip_code: barberData.zip_code || null,
          bio: barberData.industry ? `Professional ${barberData.industry.toLowerCase()} services at ${barberData.business_name}. Contact us for appointments and more information.` : `Professional services at ${barberData.business_name}. Contact us for appointments and more information.`,
          profile_image_url: imageUrl,
          is_claimed: false,
          is_active: true,
          average_rating: Number((4.0 + Math.random() * 1.0).toFixed(1)),
          total_reviews: Math.floor(Math.random() * 50) + 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('📋 Found CSV barber profile:', profile.business_name);
        setBarber(profile);
        setClaimData({
          businessName: profile.business_name || '',
          ownerName: profile.owner_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          zipCode: profile.zip_code || '',
          bio: profile.bio || ''
        });
        return;
      }

      // For non-CSV IDs, query the database if connected
      if (!isConnected) {
        setError('Database not connected and barber ID is not from CSV directory');
        return;
      }
      
      const { data, error } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('id', barberId)
        .single();
      if (error) throw error;
      
      if (data.is_claimed) {
        console.log('⚠️ Profile already claimed, redirecting...');
        navigate(`/barber/${barberId}`);
        return;
      }

      console.log('📋 Found barber profile from database:', data.business_name);
      setBarber(data);
      setClaimData({
        businessName: data.business_name || '',
        ownerName: data.owner_name || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zip_code || '',
        bio: data.bio || ''
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
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    values.push(current.trim());
    return values;
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());
    
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || '';
        if (!value) return;
        
        // Map CSV headers to our schema
        switch (header) {
          case 'company_name':
          case 'company name':
          case 'business_name':
          case 'business name':
          case 'name':
            row.business_name = value;
            break;
          case 'contact_first':
          case 'contact first':
          case 'first_name':
          case 'first name':
            row.contact_first = value;
            break;
          case 'contact_last':
          case 'contact last':
          case 'last_name':
          case 'last name':
            row.contact_last = value;
            break;
          case 'owner_name':
          case 'owner name':
          case 'owner':
            row.owner_name = value;
            break;
          case 'phone':
          case 'phone_number':
          case 'phone number':
            row.phone = value;
            break;
          case 'direct_phone':
          case 'direct phone':
            row.direct_phone = value;
            break;
          case 'email':
          case 'email_address':
          case 'email address':
            row.email = value;
            break;
          case 'address':
          case 'street_address':
          case 'street address':
            row.address = value;
            break;
          case 'city':
            row.city = value;
            break;
          case 'state':
            row.state = value;
            break;
          case 'zip':
          case 'zip_code':
          case 'zip code':
          case 'postal_code':
          case 'postal code':
            row.zip_code = value;
            break;
          case 'county':
            row.county = value;
            break;
          case 'website':
          case 'website_url':
          case 'website url':
            row.website = value;
            break;
          case 'industry':
          case 'business_type':
          case 'business type':
          case 'category':
            row.industry = value;
            break;
        }
      });
      
      // Create owner_name from contact_first and contact_last if not provided
      if (!row.owner_name && (row.contact_first || row.contact_last)) {
        row.owner_name = `${row.contact_first || ''} ${row.contact_last || ''}`.trim();
      }
      
      // Use business_name as owner_name if still missing
      if (!row.owner_name && row.business_name) {
        row.owner_name = row.business_name;
      }
      
      // Use direct_phone if phone is missing
      if (!row.phone && row.direct_phone) {
        row.phone = row.direct_phone;
      }
      
      // Only add rows that have required business name
      if (row.business_name && row.business_name.length > 1) {
        data.push(row);
      }
    }
    
    return data;
  };

  const generateSlug = (businessName: string, index: number): string => {
    let slug = businessName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();
    
    slug += `-${index}`;
    return slug;
  };

  const handleVerifyIdentity = () => {
    setStep('details');
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 page-container relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-128 h-128 bg-white/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 relative z-10">
          <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
            <Crown className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900 mb-6">Claim Your Profile</h1>
          <p className="text-gray-600">
            Verify your identity and start accepting bookings on Kutable
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12 relative z-10">
          {['signin', 'verify', 'details', 'complete'].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold shadow-premium transition-all duration-300 ${
                step === stepName
                  ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-premium-lg scale-110'
                  : index < ['signin', 'verify', 'details', 'complete'].indexOf(step)
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : 'bg-white text-gray-600 border-2 border-gray-200'
              }`}>
                {index < ['signin', 'verify', 'details', 'complete'].indexOf(step) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className={`w-16 h-2 mx-3 rounded-full transition-all duration-300 ${
                  index < ['signin', 'verify', 'details', 'complete'].indexOf(step)
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center space-x-3 relative z-10">
            <div className="bg-red-500 p-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="card-premium relative z-10 animate-fade-in-up">
          {step === 'signin' && (
            <div className="p-8 sm:p-12 text-center">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
                <User className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">
                Sign In Required
              </h2>
              <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                To claim this barber profile, you need to sign in or create an account first.
              </p>
              <div className="space-y-3 max-w-sm mx-auto">
                <Link
                  to="/login"
                  className="btn-primary w-full hover:scale-105 transition-all duration-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="btn-secondary w-full hover:scale-105 transition-all duration-200"
                >
                  Create Account
                </Link>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                Don't worry - we'll bring you back here after you sign in
              </p>
            </div>
          )}

          {step === 'verify' && (
            <div className="p-8 sm:p-12 text-center max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
                <Building className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">
                Is this your business?
              </h2>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 mb-8 text-left shadow-sm">
                <h3 className="font-display font-bold text-gray-900 text-xl mb-3">{barber.business_name}</h3>
                <p className="text-gray-700 font-medium mb-2">{barber.owner_name}</p>
                {barber.address && (
                  <div className="text-gray-600 mt-4 space-y-1">
                    <p className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{barber.address}</span>
                    </p>
                    <p className="ml-6 text-gray-500">{barber.city}, {barber.state} {barber.zip_code}</p>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                By claiming this profile, you confirm that you are the owner or authorized representative 
                of this business.
              </p>
              <button
                onClick={handleVerifyIdentity}
                className="btn-primary hover:scale-105 transition-all duration-200"
              >
                <Shield className="h-5 w-5" />
                Yes, This is My Business
              </button>
              
              {!isConnected && (
                <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-yellow-800 font-medium">
                      Connect to Supabase to complete the claiming process
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="p-8 sm:p-12 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-premium animate-float">
                  <Building className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Update Your Information</h2>
                <p className="text-gray-600 text-lg">Complete your business details to finalize your profile</p>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={claimData.businessName}
                      onChange={(e) => setClaimData(prev => ({ ...prev, businessName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="Your business name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Owner Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={claimData.ownerName}
                      onChange={(e) => setClaimData(prev => ({ ...prev, ownerName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        onChange={(e) => setClaimData(prev => ({ ...prev, phone: e.target.value }))}
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
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={claimData.email}
                        onChange={(e) => setClaimData(prev => ({ ...prev, email: e.target.value }))}
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
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={claimData.address}
                      onChange={(e) => setClaimData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={claimData.city}
                      onChange={(e) => setClaimData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={claimData.state}
                      onChange={(e) => setClaimData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={claimData.zipCode}
                      onChange={(e) => setClaimData(prev => ({ ...prev, zipCode: e.target.value }))}
                      className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="12345"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Description
                  </label>
                  <textarea
                    value={claimData.bio}
                    onChange={(e) => setClaimData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="Tell customers about your services and experience..."
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleDetailsSubmit}
                  disabled={loading || !isConnected || !user}
                  className="btn-primary disabled:opacity-50 hover:scale-105 transition-all duration-200"
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
            <div className="p-8 sm:p-12 text-center max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">
                Profile Claimed Successfully!
              </h2>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Your barber profile has been claimed! Complete your setup to start accepting bookings.
              </p>
              <Link
                to="/onboarding?type=barber"
                className="btn-primary hover:scale-105 transition-all duration-200"
              >
                <Sparkles className="h-5 w-5" />
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