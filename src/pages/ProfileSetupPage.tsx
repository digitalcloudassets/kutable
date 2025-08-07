import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  Camera,
  Clock,
  DollarSign,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseConnection } from '../hooks/useSupabaseConnection';
import SupabaseConnectionBanner from '../components/Setup/SupabaseConnectionBanner';

interface BusinessInfo {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bio: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  depositRequired: boolean;
  depositAmount: number;
}

interface Availability {
  [key: number]: {
    isOpen: boolean;
    startTime: string;
    endTime: string;
  };
}

const ProfileSetupPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isConnected: isSupabaseConnected } = useSupabaseConnection();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    businessName: '',
    ownerName: '',
    phone: '',
    email: user?.email || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    bio: ''
  });

  const [services, setServices] = useState<Service[]>([{
    id: '1',
    name: 'Haircut',
    description: 'Classic men\'s haircut',
    price: 25,
    duration: 30,
    depositRequired: false,
    depositAmount: 0
  }]);

  const [availability, setAvailability] = useState<Availability>({
    1: { isOpen: true, startTime: '09:00', endTime: '17:00' }, // Monday
    2: { isOpen: true, startTime: '09:00', endTime: '17:00' }, // Tuesday
    3: { isOpen: true, startTime: '09:00', endTime: '17:00' }, // Wednesday
    4: { isOpen: true, startTime: '09:00', endTime: '17:00' }, // Thursday
    5: { isOpen: true, startTime: '09:00', endTime: '18:00' }, // Friday
    6: { isOpen: true, startTime: '08:00', endTime: '17:00' }, // Saturday
    0: { isOpen: false, startTime: '09:00', endTime: '17:00' } // Sunday
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');

  useEffect(() => {
    if (!user && isSupabaseConnected) {
      navigate('/login');
      return;
    }

    // Pre-fill user data if available
    if (user) {
      setBusinessInfo(prev => ({
        ...prev,
        ownerName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
        email: user.email || ''
      }));
    }
  }, [user, navigate, isSupabaseConnected]);

  const steps = [
    { number: 1, title: 'Business Info', icon: Building },
    { number: 2, title: 'Services', icon: DollarSign },
    { number: 3, title: 'Availability', icon: Clock },
    { number: 4, title: 'Profile Photo', icon: Camera },
    { number: 5, title: 'Payment Setup', icon: CreditCard }
  ];

  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: string) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const addService = () => {
    const newService: Service = {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      duration: 30,
      depositRequired: false,
      depositAmount: 0
    };
    setServices(prev => [...prev, newService]);
  };

  const updateService = (id: string, field: keyof Service, value: any) => {
    setServices(prev => prev.map(service => 
      service.id === id ? { ...service, [field]: value } : service
    ));
  };

  const removeService = (id: string) => {
    if (services.length > 1) {
      setServices(prev => prev.filter(service => service.id !== id));
    }
  };

  const updateAvailability = (day: number, field: string, value: any) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(businessInfo.businessName && businessInfo.ownerName && businessInfo.phone);
      case 2:
        return services.every(service => service.name && service.price > 0);
      case 3:
        return Object.values(availability).some(day => day.isOpen);
      case 4:
        return true; // Profile photo is optional
      case 5:
        return true; // Will be handled by Stripe
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleComplete = async () => {
    if (!isSupabaseConnected) {
      setError('Please connect to Supabase to complete profile setup');
      return;
    }

    if (!user) {
      setError('Please sign in to complete profile setup');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create barber profile
      const { data: barberProfile, error: profileError } = await supabase
        .from('barber_profiles')
        .insert({
          user_id: user.id,
          business_name: businessInfo.businessName,
          owner_name: businessInfo.ownerName,
          phone: businessInfo.phone,
          email: businessInfo.email,
          address: businessInfo.address,
          city: businessInfo.city,
          state: businessInfo.state,
          zip_code: businessInfo.zipCode,
          bio: businessInfo.bio,
          is_claimed: true,
          is_active: true
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Upload profile image if provided
      if (profileImage && barberProfile) {
        const fileName = `${barberProfile.id}/profile-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('barber-images')
          .upload(fileName, profileImage);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('barber-images')
            .getPublicUrl(fileName);

          await supabase
            .from('barber_profiles')
            .update({ profile_image_url: urlData.publicUrl })
            .eq('id', barberProfile.id);
        }
      }

      // Create services
      const serviceInserts = services.map(service => ({
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
      const availabilityInserts = Object.entries(availability)
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Up Your Barber Profile</h1>
          <p className="text-gray-600">Complete these steps to start accepting bookings on Kutable</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep >= step.number
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.number ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 sm:w-12 h-1 mx-2 ${
                  currentStep > step.number ? 'bg-orange-500' : 'bg-gray-200'
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
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Step 1: Business Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
                <p className="text-gray-600">Tell us about your barbershop</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Building className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={businessInfo.businessName}
                      onChange={(e) => handleBusinessInfoChange('businessName', e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="e.g., Elite Cuts Barbershop"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Name *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={businessInfo.ownerName}
                      onChange={(e) => handleBusinessInfoChange('ownerName', e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={businessInfo.phone}
                      onChange={(e) => handleBusinessInfoChange('phone', e.target.value)}
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
                      value={businessInfo.email}
                      onChange={(e) => handleBusinessInfoChange('email', e.target.value)}
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
                    value={businessInfo.address}
                    onChange={(e) => handleBusinessInfoChange('address', e.target.value)}
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
                    value={businessInfo.city}
                    onChange={(e) => handleBusinessInfoChange('city', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={businessInfo.state}
                    onChange={(e) => handleBusinessInfoChange('state', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={businessInfo.zipCode}
                    onChange={(e) => handleBusinessInfoChange('zipCode', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="12345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={businessInfo.bio}
                    onChange={(e) => handleBusinessInfoChange('bio', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="Tell customers about your experience, specialties, and what makes your shop unique..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <DollarSign className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Services & Pricing</h2>
                <p className="text-gray-600">Define the services you offer</p>
              </div>

              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Service {index + 1}</h3>
                      {services.length > 1 && (
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
                          Service Name *
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
                          Price * ($)
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

          {/* Step 3: Availability */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
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
                        checked={availability[dayIndex]?.isOpen || false}
                        onChange={(e) => updateAvailability(dayIndex, 'isOpen', e.target.checked)}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Open</span>
                    </label>

                    {availability[dayIndex]?.isOpen && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={availability[dayIndex].startTime}
                          onChange={(e) => updateAvailability(dayIndex, 'startTime', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={availability[dayIndex].endTime}
                          onChange={(e) => updateAvailability(dayIndex, 'endTime', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Profile Photo */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Camera className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Profile Photo</h2>
                <p className="text-gray-600">Add a professional photo of yourself or your shop</p>
              </div>

              <div className="max-w-md mx-auto">
                {profileImagePreview ? (
                  <div className="text-center">
                    <img
                      src={profileImagePreview}
                      alt="Profile preview"
                      className="w-48 h-48 object-cover rounded-lg mx-auto mb-4"
                    />
                    <button
                      onClick={() => {
                        setProfileImage(null);
                        setProfileImagePreview('');
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove Photo
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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
                      className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors cursor-pointer inline-block"
                    >
                      Choose Photo
                    </label>
                    <p className="text-xs text-gray-500 mt-2">JPG, PNG • Max 5MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Payment Setup */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <CreditCard className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900">Payment Setup</h2>
                <p className="text-gray-600">Connect your payment processing to start accepting bookings</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Platform Fees</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Platform Fee:</span>
                      <span>1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stripe Processing Fee:</span>
                      <span>2.9% + $0.30</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-medium text-gray-900">
                        <span>Combined Fee:</span>
                        <span>~4% per transaction</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    You'll be redirected to Stripe to complete your payment setup after creating your profile.
                    This is required to start accepting bookings.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> You can complete your profile setup now and set up payments later 
                      from your dashboard if you prefer.
                    </p>
                  </div>
                </div>
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

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!validateStep(currentStep)}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading || !isSupabaseConnected || !user}
                className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>
                  {loading ? 'Creating Profile...' : 
                   !isSupabaseConnected ? 'Connect Supabase Required' :
                   !user ? 'Sign In Required' : 'Complete Setup'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;