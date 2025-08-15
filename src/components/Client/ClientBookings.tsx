import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  Phone, 
  X, 
  CheckCircle,
  AlertCircle,
  Filter,
  Search,
  ExternalLink,
  User,
  DollarSign,
  Edit,
  Save,
  Loader,
  Trash2,
  CreditCard,
  ChevronDown
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import RescheduleModal from '../Booking/RescheduleModal';
import { NotificationManager, BookingNotifications } from '../../utils/notifications';
import { getOrCreateClientProfile } from '../../utils/profileHelpers';
import 'react-datepicker/dist/react-datepicker.css';
import { formatUSD } from '../../utils/money';

interface Booking {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refund_requested';
  total_amount: number;
  deposit_amount: number;
  notes: string | null;
  created_at: string;
  barber_profiles: {
    id: string;
    slug: string;
    business_name: string;
    owner_name: string;
    phone: string | null;
    profile_image_url: string | null;
    city: string | null;
    state: string | null;
  } | null;
  services: {
    name: string;
    description: string | null;
    duration_minutes: number;
  } | null;
}

const ClientBookings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    date: new Date(),
    time: '',
    availableSlots: [] as string[]
  });
  const [rescheduling, setRescheduling] = useState(false);
  const [removingBooking, setRemovingBooking] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBookings();
      
      // Set up realtime subscription for instant booking updates
      const channel = supabase
        .channel('client-bookings-realtime')
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'bookings',
            filter: `client_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Booking realtime update:', payload);
            // Refresh bookings when changes occur
            fetchBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    filterBookings();
  }, [bookings, statusFilter, searchTerm]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      // Get or create client profile using centralized logic
      const clientProfile = await getOrCreateClientProfile(user);
      if (!clientProfile) {
        throw new Error('Failed to get client profile');
      }

      // Fetch bookings with related data
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          total_amount,
          deposit_amount,
          notes,
          created_at,
          barber_profiles (
            id,
            slug,
            business_name,
            owner_name,
            phone,
            profile_image_url,
            city,
            state
          ),
          services (
            name,
            description,
            duration_minutes
          )
        `)
        .eq('client_id', clientProfile.id)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'upcoming') {
        filtered = filtered.filter(booking => 
          ['pending', 'confirmed'].includes(booking.status) &&
          isAfter(new Date(booking.appointment_date), new Date())
        );
      } else if (statusFilter === 'past') {
        filtered = filtered.filter(booking => 
          booking.status === 'completed' ||
          (isBefore(new Date(booking.appointment_date), new Date()) && booking.status !== 'cancelled')
        );
      } else {
        filtered = filtered.filter(booking => booking.status === statusFilter);
      }
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.barber_profiles?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.barber_profiles?.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.services?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredBookings(filtered);
  };

  const cancelBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    // Check if cancellation is allowed (at least 24 hours before appointment)
    const appointmentDateTime = new Date(`${booking.appointment_date} ${booking.appointment_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      NotificationManager.error('Bookings can only be cancelled at least 24 hours in advance. Please contact the barber directly for last-minute changes.');
      return;
    }

    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setCancellingBooking(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' as const }
          : booking
      ));
      // Send rescheduling notifications
      try {
        const { data: notificationResult, error: notificationError } = await supabase.functions.invoke('process-booking-notifications', {
          body: {
            bookingId: bookingId,
            event: 'booking_cancelled'
          }
        });

        if (notificationError) {
          console.warn('Failed to send rescheduling notifications:', notificationError);
        } else if (notificationResult?.success) {
          console.log('Cancellation notifications sent successfully');
        }
      } catch (notificationError) {
        console.warn('Notification error (rescheduling still succeeded):', notificationError);
      }

      BookingNotifications.bookingCancelled();

    } catch (error) {
      console.error('Error cancelling booking:', error);
      NotificationManager.error('Failed to cancel booking. Please try again.');
    } finally {
      setCancellingBooking(null);
    }
  };

  const removeBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (!confirm(`Are you sure you want to permanently remove this ${booking.status} booking? This action cannot be undone.`)) {
      return;
    }

    setRemovingBooking(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.filter(booking => booking.id !== bookingId));
      NotificationManager.success('Booking removed successfully');

    } catch (error) {
      console.error('Error removing booking:', error);
      NotificationManager.error('Failed to remove booking. Please try again.');
    } finally {
      setRemovingBooking(null);
    }
  };

  const startReschedule = async (booking: Booking) => {
    setReschedulingBooking(booking);
    setRescheduleData({
      date: new Date(),
      time: '',
      availableSlots: generateAvailableSlots()
    });
  };

  const generateAvailableSlots = (): string[] => {
    // Generate mock available time slots
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (Math.random() > 0.3) { // 70% chance slot is available
          slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
        }
      }
    }
    return slots;
  };

  const handleReschedule = async (bookingId: string, newDate: Date, newTime: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          appointment_date: format(newDate, 'yyyy-MM-dd'),
          appointment_time: newTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { 
              ...booking, 
              appointment_date: format(newDate, 'yyyy-MM-dd'),
              appointment_time: newTime
            }
          : booking
      ));

      // Send SMS notification to barber
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        try {
          const { error: notificationError } = await supabase.functions.invoke('process-booking-notifications', {
            body: {
              bookingId: booking.id,
              event: 'booking_cancelled'
            }
          });

          if (notificationError) {
            console.warn('Failed to send cancellation notifications:', notificationError);
          }
        } catch (notificationError) {
          console.warn('Notification error (cancellation still succeeded):', notificationError);
        }
      }
      
      BookingNotifications.bookingRescheduled(
        format(newDate, 'EEEE, MMM d'),
        newTime
      );
      
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      NotificationManager.error('Failed to reschedule booking. Please try again.');
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'refund_requested': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      case 'refund_requested': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const canCancelBooking = (booking: Booking): boolean => {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false;
    }
    
    const appointmentDateTime = new Date(`${booking.appointment_date} ${booking.appointment_time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilAppointment >= 24;
  };

  const isUpcoming = (booking: Booking): boolean => {
    const appointmentDate = new Date(booking.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return isAfter(appointmentDate, today) || appointmentDate.getTime() === today.getTime();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-40"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-primary-500 to-accent-500 p-2 rounded-xl">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <h2 className="mobile-headline font-display text-gray-900">My Bookings</h2>
        </div>
        
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white placeholder-gray-400 sm:w-64"
            />
          </div>
          
          <div className="kutable-with-icon w-full">
            <Filter className="kutable-icon-left h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter bookings"
              className="kutable-select has-left has-right w-full h-12 rounded-xl border border-gray-200 bg-white text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="all">All Bookings</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="kutable-icon-right h-4 w-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="card-premium p-6 sm:p-12 text-center">
            <div className="bg-gray-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-display font-bold text-gray-900 mb-4">
              {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
            </h3>
            <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-md mx-auto">
              {bookings.length === 0 
                ? 'Book your first appointment to get started!'
                : 'Try adjusting your search or filters'
              }
            </p>
            {bookings.length === 0 && (
              <Link
                to="/barbers"
                className="btn-primary inline-flex items-center space-x-2"
              >
                Find Barbers
              </Link>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const appointmentDateTime = new Date(`${booking.appointment_date} ${booking.appointment_time}`);
            const upcoming = isUpcoming(booking);
            
            return (
              <div 
                key={booking.id} 
                className={`card-premium p-4 sm:p-6 transition-all duration-200 hover:shadow-lg ${
                  upcoming && booking.status === 'confirmed' 
                    ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-primary-50/30' 
                    : ''
                }`}
              >
                <div className="flex flex-col gap-4">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Barber Image */}
                      <Link 
                        to={`/barber/${booking.barber_profiles?.slug}`}
                        className="flex-shrink-0 mx-auto sm:mx-0"
                      >
                        <img
                          src={booking.barber_profiles?.profile_image_url || 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=100'}
                          alt={booking.barber_profiles?.business_name}
                          className="w-16 h-16 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-white shadow-sm hover:border-primary-300 transition-all duration-200"
                        />
                      </Link>

                      {/* Booking Details */}
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 space-y-2 sm:space-y-0">
                          <div className="space-y-1">
                            <Link 
                              to={`/barber/${booking.barber_profiles?.slug}`}
                              className="text-base sm:text-lg font-display font-bold text-gray-900 hover:text-primary-600 transition-colors block"
                            >
                              {booking.barber_profiles?.business_name}
                            </Link>
                            <p className="text-gray-600 font-medium text-sm">{booking.barber_profiles?.owner_name}</p>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)} flex items-center space-x-1`}>
                            {getStatusIcon(booking.status)}
                            <span>{booking.status.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="bg-primary-100 p-1.5 rounded-lg">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{booking.services?.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="bg-gray-200 p-1.5 rounded-lg">
                                <Clock className="h-4 w-4" />
                              </div>
                              <span className="text-gray-600 font-medium text-sm">{booking.services?.duration_minutes} min</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="bg-accent-100 p-1.5 rounded-lg">
                                <Calendar className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">
                                {format(new Date(booking.appointment_date), 'EEEE, MMMM d, yyyy')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="bg-yellow-100 p-1.5 rounded-lg">
                                <Clock className="h-4 w-4" />
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{booking.appointment_time}</span>
                            </div>
                          </div>

                          {booking.barber_profiles?.city && (
                            <div className="flex items-center space-x-2">
                              <div className="bg-gray-200 p-1.5 rounded-lg">
                                <MapPin className="h-4 w-4" />
                              </div>
                              <span className="text-gray-600 font-medium text-sm">{booking.barber_profiles.city}, {booking.barber_profiles.state}</span>
                            </div>
                          )}

                          {booking.notes && (
                            <div className="bg-gray-50 rounded-lg p-3 mt-2">
                              <p className="text-gray-700 text-sm">
                                <strong>Notes:</strong> {booking.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions - Only show for cancelled or confirmed upcoming bookings */}
                  {(booking.status === 'cancelled' || (booking.status === 'confirmed' && upcoming)) && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-gray-100">
                      {/* Action Buttons */}
                      <div className="flex gap-3 ml-auto">
                        {/* Contact Barber */}
                        {booking.barber_profiles?.phone && (
                          <a
                            href={`tel:${booking.barber_profiles.phone}`}
                            className="btn-secondary text-sm px-3 py-2"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}

                        {/* Cancel Booking */}
                        {canCancelBooking(booking) && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            disabled={cancellingBooking === booking.id}
                            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {cancellingBooking === booking.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        {/* Reschedule Button (for future implementation) */}
                        {booking.status === 'confirmed' && upcoming && (
                          <button
                            onClick={() => setReschedulingBooking(booking)}
                            className="btn-secondary text-primary-600 border-primary-200 hover:bg-primary-50 text-sm px-3 py-2"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {/* Remove Cancelled Booking */}
                        {booking.status === 'cancelled' && (
                          <button
                            onClick={() => removeBooking(booking.id)}
                            disabled={removingBooking === booking.id}
                            className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-all duration-200 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {removingBooking === booking.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reschedule Modal */}
      {reschedulingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reschedule Appointment</h3>
              <button
                onClick={() => setReschedulingBooking(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Date
                </label>
                <DatePicker
                  selected={rescheduleData.date}
                  onChange={(date) => {
                    if (date) {
                      setRescheduleData(prev => ({ 
                        ...prev, 
                        date, 
                        time: '', 
                        availableSlots: generateAvailableSlots() 
                      }));
                    }
                  }}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 30)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Times
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                  {rescheduleData.availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setRescheduleData(prev => ({ ...prev, time: slot }))}
                      className={`p-2 text-sm rounded border transition-colors ${
                        rescheduleData.time === slot
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-300 hover:border-orange-500'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {rescheduleData.availableSlots.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No available slots for this date
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setReschedulingBooking(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReschedule(reschedulingBooking.id, rescheduleData.date, rescheduleData.time)}
                disabled={!rescheduleData.time || rescheduling}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {rescheduling ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Reschedule</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-xs">
                <strong>Note:</strong> Rescheduling sends an SMS notification to your barber. 
                Changes are subject to availability and barber approval.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Reschedule Modal */}
      <RescheduleModal
        booking={reschedulingBooking}
        isOpen={!!reschedulingBooking}
        onClose={() => setReschedulingBooking(null)}
        onReschedule={handleReschedule}
      />
    </div>
  );
};

export default ClientBookings;