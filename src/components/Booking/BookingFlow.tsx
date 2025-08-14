import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  User, 
  Phone, 
  Mail, 
  Check, 
  ArrowLeft, 
  Loader,
  Scissors,
  Star,
  MapPin,
  Shield,
  Lock,
  AlertCircle,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { refreshAdminKpis } from '../../api/adminKpis';
import { getOrCreateClientProfile } from '../../utils/profileHelpers';
import { Database } from '../../lib/supabase';
import { createAvailabilityManager } from '../../utils/availabilityManager';
import { NotificationManager } from '../../utils/notifications';
import 'react-datepicker/dist/react-datepicker.css';
import InAppCheckout from '../Checkout/InAppCheckout';

type Barber = Database['public']['Tables']['barber_profiles']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingData {
  barber: Barber;
  service: Service;
  date: Date;
  time: string;
  clientDetails: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    notes: string;
  };
}


const BookingFlow: React.FC = () => {
  const { barberSlug, serviceId } = useParams<{ barberSlug: string; serviceId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<'service' | 'datetime' | 'details' | 'payment' | 'confirmation'>('service');
  const [barber, setBarber] = useState<Barber | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<import('../../utils/availabilityManager').TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    phone: '',
    email: user?.email || '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [bookingId, setBookingId] = useState<string>('');
  const [currentClientId, setCurrentClientId] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  useEffect(() => {
    if (barberSlug) {
      fetchBarberData();
    }
  }, [barberSlug]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailableTimeSlots();
    }
  }, [selectedService, selectedDate]);

  const fetchBarberData = async () => {
    try {
      const { data: barberData, error: barberError } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('slug', barberSlug)
        .single();

      if (barberError) throw barberError;
      setBarber(barberData);

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barberData.id)
        .eq('is_active', true)
        .order('price');

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Pre-select service if provided
      if (serviceId && servicesData) {
        const service = servicesData.find(s => s.id === serviceId);
        if (service) {
          setSelectedService(service);
          setStep('datetime');
        }
      }
    } catch (error) {
      console.error('Error fetching barber data:', error);
    }
  };

  const loadAvailableTimeSlots = async () => {
    if (!barber || !selectedService) return;

    setLoadingSlots(true);
    try {
      const availabilityManager = createAvailabilityManager(barber.id);
      const slots = await availabilityManager.getAvailableSlots(
        selectedDate, 
        selectedService.duration_minutes
      );
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      NotificationManager.error('Failed to load available time slots');
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('datetime');
  };

  const handleDateTimeConfirm = () => {
    if (!selectedTime) return;
    setStep('details');
  };

  const handleDetailsSubmit = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedService || !barber) return;

    // Enhanced validation for required fields
    if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim() || !customerInfo.phone.trim() || !customerInfo.email.trim()) {
      setPaymentError('Please fill in all required fields');
      return;
    }

    // Enhanced validation
    if (customerInfo.firstName.length > 50 || customerInfo.lastName.length > 50) {
      setPaymentError('Name fields must be 50 characters or less');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      setPaymentError('Please enter a valid email address');
      return;
    }

    // Validate phone number format - more strict
    const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
    const cleanPhone = customerInfo.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15 || !phoneRegex.test(cleanPhone)) {
      setPaymentError('Please enter a valid phone number with at least 10 digits');
      return;
    }

    // Validate notes field for XSS
    if (customerInfo.notes.length > 500) {
      setPaymentError('Notes must be 500 characters or less');
      return;
    }

    // Basic XSS prevention for notes
    const sanitizedNotes = customerInfo.notes.replace(/<[^>]*>/g, '').trim();
    
    setPaymentLoading(true);
    setPaymentError('');

    try {
      // Get or create client profile and update with latest contact info (but don't create booking yet)
      const clientProfile = await getOrCreateClientProfile(user);
      if (!clientProfile) {
        throw new Error('Failed to get client profile');
      }

      // Store client ID for payment
      setCurrentClientId(clientProfile.id);

      // Update profile with latest contact info from booking form
      const { error: updateError } = await supabase
        .from('client_profiles')
        .update({
          first_name: customerInfo.firstName.trim(),
          last_name: customerInfo.lastName.trim(),
          phone: customerInfo.phone.trim(),
          email: customerInfo.email.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', clientProfile.id);

      if (updateError) throw updateError;
      
      // Go directly to payment step without creating booking record
      setStep('payment');
      
    } catch (error: any) {
      // Don't expose internal error details
      console.error('Booking creation error:', error);
      setPaymentError(error?.message || 'Unable to proceed to payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      console.log('Payment succeeded, creating booking record...', { paymentIntentId });
      
      // Create the booking record directly since payment succeeded
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          barber_id: barber.id,
          client_id: currentClientId,
          service_id: selectedService.id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: selectedTime,
          total_amount: selectedService.price,
          deposit_amount: selectedService.deposit_required ? selectedService.deposit_amount : 0,
          platform_fee: Math.round(selectedService.price * 0.01 * 100) / 100,
          status: 'confirmed',
          stripe_payment_intent_id: paymentIntentId,
          notes: customerInfo.notes || null
        })
        .select(`
          *,
          services(name, duration_minutes),
          barber_profiles(business_name, owner_name)
        `)
        .single();

      if (error) {
        console.error('Error creating booking:', error);
        throw new Error('Failed to create booking record');
      }

      console.log('Booking created successfully:', booking);
      setConfirmedBooking(booking);

      // Refresh admin KPIs after successful booking
      try {
        await refreshAdminKpis();
      } catch (error) {
        console.warn('Failed to refresh admin KPIs after booking:', error);
      }

      // Send booking confirmation notifications
      try {
        await supabase.functions.invoke('process-booking-notifications', {
          body: {
            bookingId: booking.id,
            event: 'booking_confirmed'
          }
        });
        console.log('Booking notifications sent');
      } catch (notificationError) {
        console.warn('Failed to send notifications (booking still created):', notificationError);
      }
      setStep('confirmation');
      
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      NotificationManager.error(error.message || 'Failed to confirm booking. Please contact support.');
    }
  };

  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  if (!barber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">Loading booking experience...</p>
            <p className="text-sm text-gray-500">Preparing your appointment details</p>
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
        <div className="card-premium p-6 sm:p-8 mb-8 relative z-10 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <img
              src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=100'}
              alt={barber.business_name}
              className="w-24 h-24 sm:w-20 sm:h-20 rounded-2xl object-cover mx-auto sm:mx-0 border-4 border-white shadow-premium"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-2">{barber.business_name}</h1>
              <p className="text-gray-600 font-medium text-lg">{barber.owner_name}</p>
              <div className="flex items-center justify-center sm:justify-start space-x-2 mt-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 font-medium">{barber.city}, {barber.state}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12 px-2 relative z-10">
          {['service', 'datetime', 'details', 'payment', 'confirmation'].map((stepName, index) => (
            <div key={stepName} className="flex items-center flex-1">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xs sm:text-sm font-semibold shadow-premium transition-all duration-300 ${
                step === stepName
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-premium-lg scale-110'
                  : index < ['service', 'datetime', 'details', 'payment', 'confirmation'].indexOf(step)
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : 'bg-white text-gray-600 border-2 border-gray-200'
              }`}>
                {index < ['service', 'datetime', 'details', 'payment', 'confirmation'].indexOf(step) ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 4 && (
                <div className={`flex-1 h-2 mx-2 sm:mx-3 rounded-full transition-all duration-300 ${
                  index < ['service', 'datetime', 'details', 'payment', 'confirmation'].indexOf(step)
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="card-premium relative z-10 animate-fade-in-up">
          {step === 'service' && (
            <div className="p-6 sm:p-8 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium">
                  <Scissors className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-gray-900 mb-4">Select a Service</h2>
                <p className="text-gray-600 text-lg">Choose the service you'd like to book</p>
              </div>
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="border-2 border-gray-200 rounded-2xl p-6 sm:p-8 hover:border-primary-500 hover:shadow-premium cursor-pointer transition-all duration-300 hover:scale-[1.02] group"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-display font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{service.name}</h3>
                        <p className="text-gray-600 mt-2">{service.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <div className="bg-gray-200 p-1.5 rounded-lg">
                              <Clock className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{service.duration_minutes} min</span>
                          </div>
                          {service.deposit_required && (
                            <span className="text-accent-600 font-semibold">
                              ${service.deposit_amount} deposit required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center sm:text-right bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-center space-x-1 text-3xl sm:text-4xl font-display font-bold text-gray-900 mb-1">
                          <DollarSign className="h-6 w-6" />
                          <span>{service.price.toLocaleString()}</span>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Service Price</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'datetime' && selectedService && (
            <div className="p-6 sm:p-8 max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Select Date & Time</h2>
                <p className="text-gray-600">Choose your preferred appointment slot</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-display font-bold text-gray-900 mb-4 text-lg">Choose Date</h3>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => date && setSelectedDate(date)}
                    minDate={new Date()}
                    maxDate={addDays(new Date(), 30)}
                    inline
                    className="w-full border border-gray-200 rounded-2xl shadow-sm mx-auto"
                  />
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900 mb-4 text-lg">
                    Available Times - {formatDateDisplay(selectedDate)}
                  </h3>
                  
                  {loadingSlots ? (
                    <div className="text-center py-8">
                      <div className="relative mb-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
                      </div>
                      <p className="text-gray-600 font-medium">Loading available times...</p>
                    </div>
                  ) : timeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`p-4 text-sm rounded-2xl border-2 font-semibold transition-all duration-200 ${
                            selectedTime === slot.time
                              ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white border-primary-500 shadow-premium scale-105'
                              : slot.available
                              ? 'border-gray-300 hover:border-primary-400 hover:bg-primary-50 hover:scale-105'
                              : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                          }`}
                          title={!slot.available ? slot.reason : undefined}
                        >
                          {slot.time}
                          {!slot.available && slot.reason && (
                            <div className="text-xs text-gray-400 mt-1 font-medium">{slot.reason}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="bg-gray-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-10 w-10 text-gray-400" />
                      </div>
                      <h4 className="text-xl font-display font-bold text-gray-900 mb-3">No Available Times</h4>
                      <p className="text-gray-600">
                        This barber doesn't have any available slots on {formatDateDisplay(selectedDate)}. 
                        Please try a different date.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('service')}
                  className="btn-secondary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleDateTimeConfirm}
                  disabled={!selectedTime}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="p-6 sm:p-8 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-accent-500 to-accent-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Your Details</h2>
                <p className="text-gray-600">Please provide your contact information</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={customerInfo.firstName}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400"
                    placeholder="Any special requests or notes for your barber..."
                  />
                </div>
              </div>

              {paymentError && (
                <div className="mt-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center space-x-3">
                  <div className="bg-red-500 p-1.5 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  {paymentError}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('datetime')}
                  className="btn-secondary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleDetailsSubmit}
                  disabled={paymentLoading || !customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
                >
                  {paymentLoading ? (
                    <Loader className="h-5 w-5 animate-spin" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                  <span>{paymentLoading ? 'Preparing Payment...' : 'Continue to Payment'}</span>
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && selectedService && (
            <div className="p-6 sm:p-8 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-premium">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Complete Payment</h2>
                <p className="text-gray-600">Secure payment processing powered by Stripe</p>
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium text-gray-900">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">{format(selectedDate, 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium text-gray-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium text-gray-900">{selectedService.duration_minutes} minutes</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Price:</span>
                      <span className="font-medium text-gray-900">${selectedService.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Platform Fee (1%):</span>
                      <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedService.price * 0.01)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Processing Fee (~2.9%):</span>
                      <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedService.price * 0.029 + 0.30)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t border-gray-300 pt-3 mt-3">
                      <span>Total:</span>
                      <span className="text-emerald-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedService.price)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-App Checkout */}
              <InAppCheckout
                barberId={barber.id}
                amount={Math.round(selectedService.price * 100)} // Convert to cents
                currency="usd"
                customerEmail={customerInfo.email}
                metadata={{
                  clientId: currentClientId,
                  barberId: barber.id,
                  serviceId: selectedService.id,
                  appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
                  appointmentTime: selectedTime,
                  notes: customerInfo.notes,
                  clientName: `${customerInfo.firstName} ${customerInfo.lastName}`,
                  clientPhone: customerInfo.phone
                }}
                onComplete={handlePaymentSuccess}
              />

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setStep('details')}
                  className="btn-secondary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Details</span>
                </button>
              </div>
            </div>
          )}

          {step === 'confirmation' && confirmedBooking && (
            <div className="p-8 sm:p-12 text-center max-w-2xl mx-auto">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-premium animate-float">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-6">Booking Confirmed!</h2>
              <div className="space-y-3 mb-6">
                <p className="text-gray-600 text-lg leading-relaxed">
                  Your appointment has been successfully booked and payment processed.
                </p>
                {customerInfo.phone && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                    <p className="text-blue-800 font-semibold">
                      📱 SMS confirmation sent to {customerInfo.phone}
                    </p>
                    <p className="text-blue-600 text-sm mt-2 font-medium">
                      You'll also receive a reminder 24 hours before your appointment
                    </p>
                  </div>
                )}
              </div>
              
              {/* Booking Summary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 mb-8 text-left max-w-md mx-auto shadow-sm">
                <h3 className="font-display font-bold text-gray-900 mb-6 text-lg">Booking Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Service:</span>
                    <span className="font-semibold text-gray-900">{confirmedBooking.services?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Date:</span>
                    <span className="font-semibold text-gray-900">{format(new Date(confirmedBooking.appointment_date), 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Time:</span>
                    <span className="font-semibold text-gray-900">{confirmedBooking.appointment_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Duration:</span>
                    <span className="font-semibold text-gray-900">{confirmedBooking.services?.duration_minutes} minutes</span>
                  </div>
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Paid:</span>
                      <span className="text-emerald-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(confirmedBooking.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-sm mx-auto">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary w-full hover:scale-105 transition-all duration-200"
                >
                  View in Dashboard
                </button>
                <button
                  onClick={() => navigate('/barbers')}
                  className="btn-secondary w-full hover:scale-105 transition-all duration-200"
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFlow;