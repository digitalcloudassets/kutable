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
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { calculateFees } from '../../lib/stripe';
import { Database } from '../../lib/supabase';
import 'react-datepicker/dist/react-datepicker.css';

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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
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
  const [clientSecret, setClientSecret] = useState<string>('');
  const [bookingId, setBookingId] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [sendingSMS, setSendingSMS] = useState(false);

  useEffect(() => {
    if (barberSlug) {
      fetchBarberData();
    }
  }, [barberSlug]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      generateTimeSlots();
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

  const generateTimeSlots = () => {
    // Generate time slots from 9 AM to 6 PM
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: Math.random() > 0.3 }); // Mock availability
      }
    }
    setTimeSlots(slots);
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

    // Validation for required fields
    if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim() || !customerInfo.phone.trim() || !customerInfo.email.trim()) {
      setPaymentError('Please fill in all required fields');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = customerInfo.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setPaymentError('Please enter a valid phone number with at least 10 digits');
      return;
    }
    setPaymentLoading(true);
    setPaymentError('');

    try {
      // Ensure client profile exists with phone number for SMS
      let clientProfile;
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile with latest contact info
        const { data: updatedProfile, error: updateError } = await supabase
          .from('client_profiles')
          .update({
            first_name: customerInfo.firstName.trim(),
            last_name: customerInfo.lastName.trim(),
            phone: customerInfo.phone.trim(),
            email: customerInfo.email.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        clientProfile = updatedProfile;
      } else {
        // Create new client profile
        const { data: newProfile, error: createError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: user.id,
            first_name: customerInfo.firstName.trim(),
            last_name: customerInfo.lastName.trim(),
            phone: customerInfo.phone.trim(),
            email: customerInfo.email.trim(),
            preferred_contact: 'sms'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        clientProfile = newProfile;
      }

      // Create payment intent via edge function
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          barberId: barber.id,
          clientId: clientProfile.id,
          serviceId: selectedService.id,
          appointmentDate: format(selectedDate, 'yyyy-MM-dd'),
          appointmentTime: selectedTime,
          clientDetails: customerInfo,
          totalAmount: selectedService.price,
          depositAmount: selectedService.deposit_required ? selectedService.deposit_amount : 0
        }
      });

      if (error) throw error;

      if (data?.clientSecret && data?.bookingId) {
        setClientSecret(data.clientSecret);
        setBookingId(data.bookingId);
        setStep('payment');
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to initialize payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
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
        <div className="bg-white rounded-lg p-4 sm:p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <img
              src={barber.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=100'}
              alt={barber.business_name}
              className="w-20 h-20 sm:w-16 sm:h-16 rounded-lg object-cover mx-auto sm:mx-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{barber.business_name}</h1>
              <p className="text-gray-600">{barber.owner_name}</p>
              <p className="text-sm text-gray-500">{barber.city}, {barber.state}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-2">
          {['service', 'datetime', 'details', 'payment', 'confirmation'].map((stepName, index) => (
            <div key={stepName} className="flex items-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                step === stepName
                  ? 'bg-orange-500 text-white'
                  : index < ['service', 'datetime', 'details', 'payment', 'confirmation'].indexOf(step)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index < ['service', 'datetime', 'details', 'payment', 'confirmation'].indexOf(step) ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 4 && (
                <div className={`flex-1 h-1 mx-1 sm:mx-2 ${
                  index < ['service', 'datetime', 'details', 'payment', 'confirmation'].indexOf(step)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-0">
          {step === 'service' && (
            <div className="p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Select a Service</h2>
              <div className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:border-orange-500 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{service.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{service.duration_minutes} min</span>
                          </div>
                          {service.deposit_required && (
                            <span className="text-orange-600">
                              ${service.deposit_amount} deposit required
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-3xl sm:text-2xl font-bold text-gray-900">${service.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'datetime' && selectedService && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Date & Time</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Choose Date</h3>
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => date && setSelectedDate(date)}
                    minDate={new Date()}
                    maxDate={addDays(new Date(), 30)}
                    inline
                    className="w-full"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Available Times - {formatDateDisplay(selectedDate)}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        disabled={!slot.available}
                        className={`p-2 text-sm rounded border transition-colors ${
                          selectedTime === slot.time
                            ? 'bg-orange-500 text-white border-orange-500'
                            : slot.available
                            ? 'border-gray-300 hover:border-orange-500'
                            : 'border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep('service')}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleDateTimeConfirm}
                  disabled={!selectedTime}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Details</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={customerInfo.firstName}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={customerInfo.notes}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Any special requests or notes for your barber..."
                  />
                </div>
              </div>

              {paymentError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {paymentError}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep('datetime')}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={handleDetailsSubmit}
                  disabled={paymentLoading || !customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone || !customerInfo.email}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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

          {step === 'payment' && selectedService && clientSecret && (
            <Elements stripe={stripePromise}>
              <PaymentStep
                barber={barber}
                service={selectedService}
                date={selectedDate}
                time={selectedTime}
                clientDetails={customerInfo}
                clientSecret={clientSecret}
                bookingId={bookingId}
                onPaymentSuccess={(booking) => {
                  setConfirmedBooking(booking);
                  setStep('confirmation');
                }}
                onBack={() => setStep('details')}
              />
            </Elements>
          )}

          {step === 'confirmation' && confirmedBooking && (
            <div className="p-6 text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
              <div className="space-y-3 mb-6">
                <p className="text-gray-600">
                  Your appointment has been successfully booked and payment processed.
                </p>
                {customerInfo.phone && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-800 text-sm">
                      📱 SMS confirmation sent to {customerInfo.phone}
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      You'll also receive a reminder 24 hours before your appointment
                    </p>
                  </div>
                )}
              </div>
              
              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{confirmedBooking.services?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{format(new Date(confirmedBooking.appointment_date), 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{confirmedBooking.appointment_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{confirmedBooking.services?.duration_minutes} minutes</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Paid:</span>
                      <span>${confirmedBooking.total_amount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  View in Dashboard
                </button>
                <button
                  onClick={() => navigate('/barbers')}
                  className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
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

// Payment Step Component with Stripe Elements
const PaymentStep: React.FC<{
  barber: Barber;
  service: Service;
  date: Date;
  time: string;
  clientDetails: any;
  clientSecret: string;
  bookingId: string;
  onPaymentSuccess: (booking: any) => void;
  onBack: () => void;
}> = ({ 
  barber, 
  service, 
  date, 
  time, 
  clientDetails, 
  clientSecret, 
  bookingId, 
  onPaymentSuccess, 
  onBack 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not loaded. Please refresh and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Payment form not loaded properly. Please refresh and try again.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${clientDetails.firstName} ${clientDetails.lastName}`,
            email: clientDetails.email,
            phone: clientDetails.phone,
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm booking via edge function
        const { data, error } = await supabase.functions.invoke('confirm-payment', {
          body: {
            paymentIntentId: paymentIntent.id,
            bookingId: bookingId
          }
        });

        if (error) throw error;

        if (data?.booking) {
          onPaymentSuccess(data.booking);
        } else {
          throw new Error('Failed to confirm booking');
        }
      } else {
        throw new Error('Payment was not completed successfully');
      }
    } catch (error: any) {
      setError(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const fees = calculateFees(service.price);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment</h2>
      
      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Service:</span>
            <span>{service.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(date, 'EEEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{time}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{service.duration_minutes} minutes</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between">
              <span>Service Price:</span>
              <span>${service.price}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing Fee:</span>
              <span>${fees.stripeFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>${(service.price + fees.stripeFee).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Payment Information
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#374151',
                    '::placeholder': {
                      color: '#9CA3AF',
                    },
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  },
                  invalid: {
                    color: '#EF4444',
                  },
                },
                hidePostalCode: false,
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your payment information is encrypted and secure. Powered by Stripe.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={processing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          
          <button
            type="submit"
            disabled={!stripe || processing}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {processing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                <span>Pay ${service.price}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security Notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          🔒 Your payment is secured with bank-level encryption. We never store your card information.
        </p>
      </div>
    </div>
  );
};

export default BookingFlow;