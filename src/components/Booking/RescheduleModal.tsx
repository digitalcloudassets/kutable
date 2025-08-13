import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  X, 
  Save, 
  Loader, 
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { createAvailabilityManager } from '../../utils/availabilityManager';
import { NotificationManager } from '../../utils/notifications';
import 'react-datepicker/dist/react-datepicker.css';

interface RescheduleModalProps {
  booking: {
    id: string;
    appointment_date: string;
    appointment_time: string;
    barber_profiles: {
      business_name: string;
      owner_name: string;
    } | null;
    services: {
      name: string;
      duration_minutes: number;
    } | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onReschedule: (bookingId: string, newDate: Date, newTime: string) => Promise<void>;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  booking,
  isOpen,
  onClose,
  onReschedule
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<import('../../utils/availabilityManager').TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'date' | 'time' | 'confirm'>('date');

  React.useEffect(() => {
    if (isOpen) {
      setStep('date');
      setSelectedDate(new Date());
      setSelectedTime('');
      setAvailableSlots([]);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (selectedDate && step === 'time') {
      loadAvailableSlots();
    }
  }, [selectedDate, step]);

  const loadAvailableSlots = async () => {
    if (!booking.barber_profiles?.id) return;

    setLoadingSlots(true);
    try {
      const availabilityManager = createAvailabilityManager(booking.barber_profiles.id);
      const slots = await availabilityManager.getAvailableSlots(
        selectedDate, 
        booking.services?.duration_minutes || 30
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      NotificationManager.error('Failed to load available time slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep('confirm');
  };

  const handleConfirmReschedule = async () => {
    if (!selectedTime || !selectedDate) return;

    setLoading(true);
    try {
      await onReschedule(booking.id, selectedDate, selectedTime);
      onClose();
    } catch (error) {
      console.error('Reschedule error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  const getStepTitle = () => {
    switch (step) {
      case 'date': return 'Choose New Date';
      case 'time': return 'Select Time';
      case 'confirm': return 'Confirm Changes';
      default: return 'Reschedule';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Reschedule Appointment</h2>
            <p className="text-gray-600 text-sm mt-1">
              {booking.services?.name} with {booking.barber_profiles?.business_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {['date', 'time', 'confirm'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === stepName
                      ? 'bg-orange-500 text-white'
                      : ['date', 'time', 'confirm'].indexOf(step) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {['date', 'time', 'confirm'].indexOf(step) > index ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 2 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                  )}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600">{getStepTitle()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Appointment Info */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-800 mb-2">Current Appointment</h3>
            <div className="flex items-center space-x-4 text-red-700 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(booking.appointment_date), 'EEEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{booking.appointment_time}</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 'date' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select a New Date</h3>
              <div className="flex justify-center">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => date && handleDateSelect(date)}
                  minDate={new Date()}
                  maxDate={addDays(new Date(), 30)}
                  inline
                  className="border border-gray-200 rounded-lg"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> Availability depends on your barber's schedule. 
                  If no times are available, try selecting a different date.
                </p>
              </div>
            </div>
          )}

          {step === 'time' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Available Times - {formatDateDisplay(selectedDate)}
              </h3>
              
              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading available times...</p>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => slot.available && handleTimeSelect(slot.time)}
                      disabled={!slot.available}
                      className={`p-3 text-sm rounded-lg border transition-all ${
                        selectedTime === slot
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                          : slot.available
                          ? 'border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                          : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                      }`}
                      title={!slot.available ? slot.reason : undefined}
                    >
                      {slot}
                      {!slot.available && slot.reason && (
                        <div className="text-xs text-gray-400 mt-1">{slot.reason}</div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Available Times</h4>
                  <p className="text-gray-600 text-sm">
                    This barber doesn't have any available slots on {formatDateDisplay(selectedDate)}. 
                    Please try a different date.
                  </p>
                  <button
                    onClick={() => setStep('date')}
                    className="mt-4 text-orange-600 hover:text-orange-500 font-medium text-sm"
                  >
                    ← Choose Different Date
                  </button>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  Times shown are in your local timezone. Your barber will be notified of the change.
                </p>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Reschedule</h3>
              
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">New Appointment Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{booking.services?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{format(selectedDate, 'EEEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{booking.services?.duration_minutes} minutes</span>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">Important Information</h4>
                    <ul className="text-blue-700 text-sm space-y-1">
                      <li>• Your barber will receive an SMS notification about this change</li>
                      <li>• No additional charges apply for rescheduling</li>
                      <li>• You'll receive a new confirmation with updated details</li>
                      <li>• The barber may need to approve the new time slot</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                if (step === 'date') {
                  onClose();
                } else if (step === 'time') {
                  setStep('date');
                } else {
                  setStep('time');
                }
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              {step === 'date' ? 'Cancel' : 'Back'}
            </button>

            {step === 'confirm' && (
              <button
                onClick={handleConfirmReschedule}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Confirm Reschedule</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;