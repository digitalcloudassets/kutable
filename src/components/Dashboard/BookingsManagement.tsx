      if (!data?.success) {
        throw new Error(data?.error || 'Failed to process refund');
      }

      // Update booking status to refunded
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: 'cancelled' as const } : b
      ));

      NotificationManager.success(Refund of $${booking.total_amount} processed successfully);
      
      // Refresh admin KPIs after refund
      try {
        await refreshAdminKpis();
      } catch (error) {
        console.warn('Failed to refresh admin KPIs after refund:', error);
      }

    } catch (error: any) {
      console.error('Error processing refund:', error);
      NotificationManager.error(error.message || 'Failed to process refund. Please try again.');
    } finally {
      setRefundingBooking(null);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refund_requested': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canRefund = (booking: Booking): boolean => {
    return !!(
      booking.stripe_payment_intent_id &&
      (booking.status === 'confirmed' || booking.status === 'completed') &&
      booking.status !== 'cancelled'
    );
  };
  if (loading) {
    return (
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

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {booking.client_profiles?.first_name} {booking.client_profiles?.last_name}
                  </h3>
                  <span className={px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}}>
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600">{booking.services?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">${booking.total_amount}</p>
                {booking.deposit_amount > 0 && (
                  <p className="text-sm text-orange-600">${booking.deposit_amount} deposit</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(booking.appointment_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{booking.appointment_time} ({booking.services?.duration_minutes} min)</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Booked {format(new Date(booking.created_at), 'MMM d')}</span>
              </div>
            </div>

            {booking.client_profiles && (
              <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600">
                {booking.client_profiles.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{booking.client_profiles.phone}</span>
                  </div>
                )}
                {booking.client_profiles.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{booking.client_profiles.email}</span>
                  </div>
                )}
              </div>
            )}

            {booking.notes && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700"><strong>Notes:</strong> {booking.notes}</p>
              </div>
            )}

            {/* Status Actions */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Confirm Booking</span>
                  </button>
                  <button
                    onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center space-x-2"
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
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Mark Complete</span>
                  </button>
                </>
              )}

              {/* Refund Button */}
              {(booking.status === 'confirmed' || booking.status === 'completed') && booking.stripe_payment_intent_id && (
                <button
                  onClick={() => processRefund(booking)}
                  disabled={refundingBooking === booking.id}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {refundingBooking === booking.id ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Process Refund</span>
                    </>
                  )}
                </button>
              )}

              {booking.status === 'cancelled' && booking.stripe_payment_intent_id && (
                <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Refunded</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600">Your bookings will appear here once customers start booking your services.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsManagement;