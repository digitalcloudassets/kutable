import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Scissors, 
  User, 
  Calendar, 
  CreditCard, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  Clock,
  DollarSign,
  Camera,
  Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { refreshAdminKpis } from '../api/adminKpis';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';
import { generateUniqueSlug } from '../utils/updateBarberSlugs';

interface OnboardingData {
  userType: 'client' | 'barber';
  businessInfo: {
    businessName: string;
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    bio: string;
  };
  services: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number;
    depositRequired: boolean;
    depositAmount: number;
  }>;
  availability: {
    [key: number]: {
      isOpen: boolean;
      startTime: string;
      endTime: string;
    };
  };
  profileImage: File | null;
  profileImagePreview: string;
  stripeAccountId: string | null;
  stripeOnboardingUrl: string | null;
}

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected: isSupabaseConnected } = useSupabaseConnection();
  
  const userTypeFromUrl = (searchParams.get('type') as 'client' | 'barber') || 
                          (user?.user_metadata?.user_type as 'client' | 'barber');
  const [currentStep, setCurrentStep] = useState(() => {
    // Skip user type selection if already known from signup
    if (userTypeFromUrl === 'client') return 2; // Go to profile photo
    if (userTypeFromUrl === 'barber') return 2; // Go to business info
    return 1; // Start with user type selection
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [data, setData] = useState<OnboardingData>({
    userType: userTypeFromUrl || 'client',
    businessInfo: {
      businessName: '',
      ownerName: user?.user_metadata?.first_name && user?.user_metadata?.last_name 
        ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`.trim()
        : '',
      phone: '',
      email: user?.email || '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      bio: ''
    },
    services: [{
      id: '1',
      name: 'Haircut',
      description: 'Classic men\'s haircut',
      price: 25,
      duration: 30,
      depositRequired: false,
      depositAmount: 0
    }],
    availability: {
      1: { isOpen: true, startTime: '09:00', endTime: '17:00' },
      2: { isOpen: true, startTime: '09:00', endTime: '17:00' },
      3: { isOpen: true, startTime: '09:00', endTime: '17:00' },
      4: { isOpen: true, startTime: '09:00', endTime: '17:00' },
      5: { isOpen: true, startTime: '09:00', endTime: '18:00' },
      6: { isOpen: true, startTime: '08:00', endTime: '17:00' },
      0: { isOpen: false, startTime: '09:00', endTime: '17:00' }
    },
    profileImage: null,
    profileImagePreview: '',
    stripeAccountId: null,
    stripeOnboardingUrl: null
  });

  useEffect(() => {
    // Check if user is already set up
    if (user && isSupabaseConnected) {
      checkExistingProfile();
    }
  }, [user, isSupabaseConnected]);

  const checkExistingProfile = async () => {
    if (!user) return;

    try {
      const userType = user.user_metadata?.user_type || data.userType;
      
      if (userType === 'barber') {
        const { data: barberProfile } = await supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (barberProfile) {
          navigate('/dashboard');
          return;
        }
      } else {
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (clientProfile) {
          navigate('/dashboard');
          return;
        }
      }
    } catch (error) {
      // Profile doesn't exist, continue with onboarding
    }
  };

  const updateData = (path: string, value: any) => {
    setData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return newData;
    });
  };

  const addService = () => {
    const newService = {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      duration: 30,
      depositRequired: false,
      depositAmount: 0
    };
    setData(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const updateService = (id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === id ? { ...service, [field]: value } : service
      )
    }));
  };

  const removeService = (id: string) => {
    if (data.services.length > 1) {
      setData(prev => ({
        ...prev,
        services: prev.services.filter(service => service.id !== id)
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData(prev => ({ ...prev, profileImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setData(prev => ({ ...prev, profileImagePreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // User type selection
        return !!data.userType;
      case 2: // Business info (only for barbers)
        if (data.userType === 'client') return true;
        return !!(data.businessInfo.businessName && data.businessInfo.ownerName && data.businessInfo.phone);
      case 3: // Services (only for barbers)
        if (data.userType === 'client') return true;
        return data.services.every(service => service.name && service.price > 0);
      case 4: // Availability (only for barbers)
        if (data.userType === 'client') return true;
        return Object.values(data.availability).some(day => day.isOpen);
      case 5: // Profile photo (optional)
        return true;
      case 6: // Complete
        return true;
      default:
        return false;
    }
  };

  const getTotalSteps = () => {
    return data.userType === 'client' ? 3 : 7; // Clients: type, photo, complete | Barbers: type, business, services, availability, photo, stripe, complete
  };

  const getStepTitle = (step: number) => {
    if (data.userType === 'client') {
      switch (step) {
        case 1: return 'Account Type';
        case 2: return 'Profile Photo';
        case 3: return 'Complete';
        default: return '';
      }
    } else {
      switch (step) {
        case 1: return 'Account Type';
        case 2: return 'Business Info';
        case 3: return 'Services';
        case 4: return 'Availability';
        case 5: return 'Profile Photo';
        case 6: return 'Payment Setup';
        case 7: return 'Complete';
        default: return '';
      }
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Skip steps for clients
      if (data.userType === 'client') {
        if (currentStep === 1) setCurrentStep(2); // Skip to photo step
        else if (currentStep === 2) setCurrentStep(3); // Go to complete
        else setCurrentStep(prev => prev + 1);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, getTotalSteps()));
      }
    }
  };

  const handleBack = () => {
    if (data.userType === 'client') {
      if (currentStep === 2) setCurrentStep(1); // Go back to type selection
      else if (currentStep === 3) setCurrentStep(2); // Go back to photo
      else setCurrentStep(prev => Math.max(prev - 1, 1));
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 1));
    }
  };

  const handleStripeConnect = async () => {
    if (!isSupabaseConnected || !user) {
      setError('Please ensure you are signed in and connected to Supabase');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call edge function to create Stripe Connect account
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-account', {
        body: {
          businessName: data.businessInfo.businessName,
          ownerName: data.businessInfo.ownerName,
          email: data.businessInfo.email,
          phone: data.businessInfo.phone,
          address: {
            line1: data.businessInfo.address,
            city: data.businessInfo.city,
            state: data.businessInfo.state,
            postal_code: data.businessInfo.zipCode
          }
        }
      });

      if (stripeError) throw stripeError;

      if (stripeData?.accountId && stripeData?.onboardingUrl) {
        setData(prev => ({
          ...prev,
          stripeAccountId: stripeData.accountId,
          stripeOnboardingUrl: stripeData.onboardingUrl
        }));
        
        // Redirect to Stripe onboarding
        window.open(stripeData.onboardingUrl, '_blank');
      } else {
        throw new Error('Failed to create Stripe account');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!isSupabaseConnected) {
      setError('Please connect to Supabase to complete onboarding');
      return;
    }

    if (!user) {
      setError('Please sign in to complete onboarding');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (data.userType === 'client') {
        // Create client profile
        const { error: clientError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            phone: '',
            preferred_contact: 'sms'
          });

        if (clientError) throw clientError;
      } else {
        // Create barber profile
        const { data: barberProfile, error: profileError } = await supabase
          .from('barber_profiles')
          .insert({
            user_id: user.id,
           slug: await generateUniqueSlug(data.businessInfo.businessName),
            business_name: data.businessInfo.businessName,
            owner_name: data.businessInfo.ownerName,
            phone: data.businessInfo.phone,
            email: data.businessInfo.email,
            address: data.businessInfo.address,
            city: data.businessInfo.city,
            state: data.businessInfo.state,
            zip_code: data.businessInfo.zipCode,
            bio: data.businessInfo.bio,
            is_claimed: true,
            is_active: true
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // Upload profile image if provided
        if (data.profileImage && barberProfile) {
         try {
           const fileName = `${barberProfile.id}/profile-${Date.now()}.jpg`;
           const { data: uploadData, error: uploadError } = await supabase.storage
             .from('barber-images')
             .upload(fileName, data.profileImage);

           if (!uploadError) {
             const { data: urlData } = supabase.storage
               .from('barber-images')
               .getPublicUrl(fileName);

             await supabase
               .from('barber_profiles')
               .update({ profile_image_url: urlData.publicUrl })
               .eq('id', barberProfile.id);
           }
         } catch (imageError) {
           // Image upload failed, but don't break the onboarding flow
           console.warn('Profile image upload failed:', imageError);
         }
        }

        // Create services
        const serviceInserts = data.services.map(service => ({
          barber_id: barberProfile.id,
          name: service.name,
          description: service.description,
          price: service.price,
          duration_minutes: service.duration,
          deposit_required: service.depositRequired,
          deposit_amount: service.depositAmount,
          is_active: true
        }));

        const { error: servicesError } = await supabase
          .from('services')
          .insert(serviceInserts);

        if (servicesError) throw servicesError;

        // Create availability
        const availabilityInserts = Object.entries(data.availability)
          .filter(([_, dayData]) => dayData.isOpen)
          .map(([day, dayData]) => ({
            barber_id: barberProfile.id,
            day_of_week: parseInt(day),
            start_time: dayData.startTime,
            end_time: dayData.endTime,
            is_available: true
          }));

        if (availabilityInserts.length > 0) {
          const { error: availabilityError } = await supabase
            .from('availability')
            .insert(availabilityInserts);

          if (availabilityError) throw availabilityError;
        }
      }

      // Refresh admin KPIs after creating new barber profile
      try {
        await refreshAdminKpis();
      } catch (error) {
        console.warn('Failed to refresh admin KPIs after profile creation:', error);
      }

      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="min-h-screen bg-gray-50 page-container">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SupabaseConnectionBanner isConnected={isSupabaseConnected} />
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img 
              src="/Kutable Logo.png" 
              alt="Kutable Logo" 
              className="h-12 w-auto"
            />
            <span className="text-2xl font-bold text-gray-900">Kutable</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Kutable!</h1>
          <p className="text-gray-600">Let's get you set up in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {getTotalSteps()}</span>
            <span className="text-sm text-gray-600">{getStepTitle(currentStep)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / getTotalSteps()) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Step 1: User Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">I am a...</h2>
                <p className="text-gray-600">Choose your account type to get started</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <button
                  onClick={() => updateData('userType', 'client')}
                  className={`p-8 border-2 rounded-lg text-center transition-all hover:shadow-md ${
                    data.userType === 'client'
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-300 hover:border-orange-300'
                  }`}
                >
                  <User className="h-16 w-16 mx-auto mb-4 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Client</h3>
                  <p className="text-gray-600 text-sm">
                    I want to book appointments with barbers
                  </p>
                  <ul className="mt-4 text-left text-sm text-gray-500 space-y-1">
                    <li>• Find and book barbers</li>
                    <li>• Manage appointments</li>
                    <li>• Leave reviews</li>
                    <li>• Track booking history</li>
                  </ul>
                </button>

                <button
                  onClick={() => updateData('userType', 'barber')}
                  className={`p-8 border-2 rounded-lg text-center transition-all hover:shadow-md ${
                    data.userType === 'barber'
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-300 hover:border-orange-300'
                  }`}
                >
                  <Scissors className="h-16 w-16 mx-auto mb-4 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Barber</h3>
                  <p className="text-gray-600 text-sm">
                    I want to accept bookings and manage my business
                  </p>
                  <ul className="mt-4 text-left text-sm text-gray-500 space-y-1">
                    <li>• Accept online bookings</li>
                    <li>• Manage services & pricing</li>
                    <li>• Track earnings</li>
                    <li>• Build your reputation</li>
                  </ul>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Business Information (Barbers only) */}
          {currentStep === 2 && data.userType === 'barber' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Building className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
                <p className="text-gray-600">Tell us about your barbershop</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={data.businessInfo.businessName}
                      onChange={(e) => updateData('businessInfo.businessName', e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="e.g., Elite Cuts Barbershop"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={data.businessInfo.ownerName}
                      onChange={(e) => updateData('businessInfo.ownerName', e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={data.businessInfo.phone}
                      onChange={(e) => updateData('businessInfo.phone', e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={data.businessInfo.email}
                      onChange={(e) => updateData('businessInfo.email', e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={data.businessInfo.address}
                    onChange={(e) => updateData('businessInfo.address', e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={data.businessInfo.city}
                    onChange={(e) => updateData('businessInfo.city', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={data.businessInfo.state}
                    onChange={(e) => updateData('businessInfo.state', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={data.businessInfo.zipCode}
                    onChange={(e) => updateData('businessInfo.zipCode', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <textarea
                  value={data.businessInfo.bio}
                  onChange={(e) => updateData('businessInfo.bio', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                  placeholder="Tell customers about your experience, specialties, and what makes your shop unique..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Services (Barbers only) */}
          {currentStep === 3 && data.userType === 'barber' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <DollarSign className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Services & Pricing</h2>
                <p className="text-gray-600">Define the services you offer</p>
              </div>

              <div className="space-y-4">
                {data.services.map((service, index) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Service {index + 1}</h3>
                      {data.services.length > 1 && (
                        <button
                          onClick={() => removeService(service.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => updateService(service.id, 'name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="e.g., Haircut, Beard Trim"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Price <span className="text-red-500">*</span> ($)
                        </label>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="25.00"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={service.duration}
                          onChange={(e) => updateService(service.id, 'duration', parseInt(e.target.value) || 30)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="30"
                          min="15"
                          step="15"
                        />
                      </div>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={service.depositRequired}
                            onChange={(e) => updateService(service.id, 'depositRequired', e.target.checked)}
                            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Require deposit</span>
                        </label>
                        {service.depositRequired && (
                          <input
                            type="number"
                            value={service.depositAmount}
                            onChange={(e) => updateService(service.id, 'depositAmount', parseFloat(e.target.value) || 0)}
                            className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            placeholder="10.00"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={service.description}
                        onChange={(e) => updateService(service.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Describe this service..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addService}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-4 text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors"
              >
                + Add Another Service
              </button>
            </div>
          )}

          {/* Step 4: Availability (Barbers only) */}
          {currentStep === 4 && data.userType === 'barber' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Clock className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Set Your Availability</h2>
                <p className="text-gray-600">When are you available for appointments?</p>
              </div>

              <div className="space-y-4">
                {dayNames.map((dayName, dayIndex) => (
                  <div key={dayIndex} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-24">
                      <span className="font-medium text-gray-900">{dayName}</span>
                    </div>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={data.availability[dayIndex]?.isOpen || false}
                        onChange={(e) => {
                          setData(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              [dayIndex]: {
                                ...prev.availability[dayIndex],
                                isOpen: e.target.checked
                              }
                            }
                          }));
                        }}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Open</span>
                    </label>

                    {data.availability[dayIndex]?.isOpen && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={data.availability[dayIndex].startTime}
                          onChange={(e) => {
                            setData(prev => ({
                              ...prev,
                              availability: {
                                ...prev.availability,
                                [dayIndex]: {
                                  ...prev.availability[dayIndex],
                                  startTime: e.target.value
                                }
                              }
                            }));
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={data.availability[dayIndex].endTime}
                          onChange={(e) => {
                            setData(prev => ({
                              ...prev,
                              availability: {
                                ...prev.availability,
                                [dayIndex]: {
                                  ...prev.availability[dayIndex],
                                  endTime: e.target.value
                                }
                              }
                            }));
                          }}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 (Barbers) or Step 2 (Clients): Profile Photo */}
          {((currentStep === 5 && data.userType === 'barber') || (currentStep === 2 && data.userType === 'client')) && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Camera className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Profile Photo</h2>
                <p className="text-gray-600">
                  {data.userType === 'barber' 
                    ? 'Add a professional photo of yourself or your shop'
                    : 'Add a profile photo (optional)'
                  }
                </p>
              </div>

              <div className="max-w-md mx-auto">
                {data.profileImagePreview ? (
                  <div className="text-center">
                    <img
                      src={data.profileImagePreview}
                      alt="Profile preview"
                      className="w-48 h-48 object-cover rounded-lg mx-auto mb-4 shadow-md"
                    />
                    <button
                      onClick={() => setData(prev => ({ 
                        ...prev, 
                        profileImage: null, 
                        profileImagePreview: '' 
                      }))}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Upload a profile photo</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="profile-image"
                    />
                    <label
                      htmlFor="profile-image"
                      className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors cursor-pointer inline-block font-medium"
                    >
                      Choose Photo
                    </label>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG • Max 5MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Stripe Connect (Barbers only) */}
          {currentStep === 6 && data.userType === 'barber' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <CreditCard className="h-16 w-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Connect Your Payment Account</h2>
                <p className="text-gray-600">Set up Stripe to start accepting payments from customers</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Why do I need this?</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Accept secure payments from customers</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Automatic deposits to your bank account</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>Handle deposits and full payments seamlessly</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">Platform Fees</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Platform Fee:</span>
                      <span>1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stripe Processing:</span>
                      <span>2.9% + $0.30</span>
                    </div>
                    <div className="border-t border-blue-300 pt-1 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total per transaction:</span>
                        <span>~4%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Click below to securely connect your bank account with Stripe. 
                    You'll be redirected to Stripe's secure platform to complete the setup.
                  </p>
                  
                  <button
                    onClick={handleStripeConnect}
                    disabled={loading || !isSupabaseConnected || !user}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto"
                  >
                    {loading ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    <span>
                      {loading ? 'Setting up Stripe...' : 'Connect with Stripe'}
                    </span>
                  </button>

                  <p className="text-xs text-gray-500 mt-4">
                    Powered by Stripe • Your financial information is secure and encrypted
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Final Step: Complete */}
          {((currentStep === 7 && data.userType === 'barber') || (currentStep === 3 && data.userType === 'client')) && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {data.userType === 'barber' ? 'Ready to Start Accepting Bookings!' : 'Welcome to Kutable!'}
                </h2>
                <p className="text-gray-600 text-lg">
                  {data.userType === 'barber' 
                    ? 'Your profile is almost ready. Complete the setup to start earning.'
                    : 'Your account is set up! You can now start booking appointments with barbers.'
                  }
                </p>
              </div>

              {data.userType === 'barber' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 max-w-2xl mx-auto">
                  <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Profile created with services and availability</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Stripe payment account connected</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Camera className="h-4 w-4 text-blue-500" />
                      <span>Add photos to your gallery to showcase your work</span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={handleComplete}
                  disabled={loading || (!isSupabaseConnected && data.userType === 'barber') || !user}
                  className="bg-green-600 text-white px-8 py-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 mx-auto"
                >
                  {loading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  <span>
                    {loading ? 'Setting up your account...' : 
                     !isSupabaseConnected ? 'Connect Supabase Required' :
                     !user ? 'Sign In Required' : 
                     data.userType === 'barber' ? 'Complete Barber Setup' : 'Enter Dashboard'}
                  </span>
                </button>
                
                {!isSupabaseConnected && (
                  <p className="text-sm text-gray-500 mt-3">
                    Connect to Supabase above to save your profile and enable full functionality
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            {currentStep < getTotalSteps() ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;