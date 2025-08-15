import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Phone, Mail, Filter, Search, CheckCircle, X, Loader, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificationManager } from '../../utils/notifications';
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
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  client_profiles: {
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  services: {
    name: string;
    duration_minutes: number;
  } | null;
}

interface BookingsManagementProps {
  barberId: string;
}

const BookingsManagement: React.FC<BookingsManagementProps> = ({ barberId }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refundingBooking, setRefundingBooking] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, [barberId]);

  const fetchBookings = async () => {
    try {
      // Step 1: Query bookings only (no cross-table expansion to avoid RLS recursion)
      const { data, error } = await supabase
        .from('bookings')
        .select('id, appointment_date, appointment_time, status, total_amount, deposit_amount, notes, created_at, stripe_payment_intent_id, stripe_charge_id, client_id, service_id')
        .eq('barber_id', barberId)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      if (error) throw error;
      
      // Step 2: Fetch client and service details separately to avoid RLS recursion
      const enrichedBookings = [];
      for (const booking of data || []) {
        let clientData = null;
        let serviceData = null;
        
        // Fetch client profile separately
        if (booking.client_id) {
          const { data: client } = await supabase
            .from('client_profiles')
            .select('first_name, last_name, phone, email')
            .eq('id', booking.client_id)
            .maybeSingle();
          clientData = client;
        }
        
        // Fetch service details
        if (booking.service_id) {
          const { data: service } = await supabase
            .from('services')
            .select('name, duration_minutes')
            .eq('id', booking.service_id)
            .maybeSingle();
          serviceData = service;
        }
        
        enrichedBookings.push({
          ...booking,
          client_profiles: clientData,
          services: serviceData
        });
      }
      
      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      NotificationManager.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, status: status as any } : b))
      );

      NotificationManager.success(`Booking ${status} successfully`);
    } catch (error) {
      console.error('Error updating booking:', error);
      NotificationManager.error('Failed to update booking');
    }
  };

  const processRefund = async (booking: Booking) => {
    if (!booking.stripe_payment_intent_id) {
      NotificationManager.error('No payment found for this booking');
      return;
    }

    const customerName = `${booking.client_profiles?.first_name} ${booking.client_profiles?.last_name}`;
    if (!confirm(`Are you sure you want to refund $${booking.total_amount} to ${customerName}? This action cannot be undone.`)) {
      return;
    }

    setRefundingBooking(booking.id);

    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          payment_intent_id: booking.stripe_payment_intent_id,
          booking_id: booking.id
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process refund');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Refund processing failed');
      }

      // Update booking status to cancelled
      await updateBookingStatus(booking.id, 'cancelled');
      
      NotificationManager.success(`Refund of ${formatUSD(booking.total_amount)} processed successfully. The customer will receive their money within 5-10 business days.`);

    } catch (error: any) {
      console.error('Error processing refund:', error);
      NotificationManager.error(error.message || 'Failed to process refund. Please try again.');
    } finally {
      setRefundingBooking(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
      case 'refund_requested': return <CreditCard className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchSearch = !searchTerm || 
      `${booking.client_profiles?.first_name || ''} ${booking.client_profiles?.last_name || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      booking.services?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Manage Bookings</h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Manage Bookings</h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full sm:w-48"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refund_requested">Refund Requested</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="w-full bg-white border border-gray-100 p-6 shadow-sm overflow-hidden min-w-0">
            <div className="flex justify-between items-start mb-4 gap-3 min-w-0">
              <div>
                <div className="flex items-center space-x-3 mb-2 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 min-w-0 break-words">
                    {booking.client_profiles?.first_name} {booking.client_profiles?.last_name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)} flex items-center space-x-1`}>
                    {getStatusIcon(booking.status)}
                    <span>{booking.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                </div>
                <p className="text-gray-600 font-medium min-w-0 break-words">{booking.services?.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-gray-900">{formatUSD(booking.total_amount)}</p>
                {booking.deposit_amount > 0 && (
                  <p className="text-sm text-orange-600 font-medium">{formatUSD(booking.deposit_amount)} deposit</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-600 min-w-0">
              <div className="flex items-center space-x-2 min-w-0">
                <Calendar className="h-4 w-4" />
                <span className="font-medium min-w-0 break-words">{format(new Date(booking.appointment_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-2 min-w-0">
                <Clock className="h-4 w-4" />
                <span className="font-medium min-w-0 break-words">{booking.appointment_time} ({booking.services?.duration_minutes} min)</span>
              </div>
              <div className="flex items-center space-x-2 min-w-0">
                <User className="h-4 w-4" />
                <span className="font-medium min-w-0 break-words">Booked {new Date(booking.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {booking.client_profiles && (
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4 text-sm text-gray-600 min-w-0">
                {booking.client_profiles.phone && (
                  <a 
                    href={`tel:${booking.client_profiles.phone}`}
                    className="flex items-center space-x-2 hover:text-primary-600 transition-colors min-w-0 break-words"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    <span className="font-medium min-w-0">{booking.client_profiles.phone}</span>
                  </a>
                )}
                {booking.client_profiles.email && (
                  <a 
                    href={`mailto:${booking.client_profiles.email}`}
                    className="flex items-center space-x-2 hover:text-primary-600 transition-colors min-w-0"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="font-medium min-w-0 break-all">{booking.client_profiles.email}</span>
                  </a>
                )}
              </div>
            )}

            {booking.notes && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                <p className="text-sm text-gray-700 font-medium break-words">
                  <strong>Customer Notes:</strong> {booking.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                    className="btn-primary text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Confirm Booking</span>
                  </button>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel Booking</span>
                  </button>
                </>
              )}

              {booking.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'completed')}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Mark Complete</span>
                  </button>
                  
                  {/* Refund Button - Show for confirmed bookings with payment */}
                  {booking.stripe_payment_intent_id && (
                    <button
                      onClick={() => processRefund(booking)}
                      disabled={refundingBooking === booking.id}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {refundingBooking === booking.id ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>Refund</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Refunded Status - Show for cancelled bookings that had payments */}
              {(booking.status === 'cancelled' || booking.status === 'completed') && booking.stripe_payment_intent_id && (
                <div className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl text-sm font-semibold flex items-center space-x-2 border border-gray-200">
                  <CheckCircle className="h-4 w-4" />
                  <span>{booking.status === 'cancelled' ? 'Refunded' : 'Completed'}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
            </h3>
            <p className="text-gray-600">
              {bookings.length === 0 
                ? 'Your bookings will appear here once customers start booking your services.'
                : 'Try adjusting your search or filters to find specific bookings.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsManagement;