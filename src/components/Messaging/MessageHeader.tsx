import React from 'react';
import { Calendar, User, Building } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageHeaderProps {
  avatar?: string | null;
  name: string;
  participantType: 'barber' | 'client';
  serviceName: string;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | string;
}

const MessageHeader: React.FC<MessageHeaderProps> = ({
  avatar,
  name,
  participantType,
  serviceName,
  appointmentDate,
  appointmentTime,
  status = 'pending',
}) => {
  const statusStyles = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800'
  };

  const statusStyle = statusStyles[status as keyof typeof statusStyles] || statusStyles.default;

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMM d');
  };

  const dateLabel = appointmentDate ? formatAppointmentDate(appointmentDate) : '';

  return (
    <div className="w-full border-b border-gray-200 bg-white">
      <div className="px-4 py-4">
        {/* Top row: avatar + name on left, status on right */}
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 mb-3">
          <div className="flex-shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                participantType === 'barber' 
                  ? 'bg-primary-100' 
                  : 'bg-accent-100'
              }`}>
                {participantType === 'barber' ? (
                  <Building className="h-6 w-6 text-primary-600" />
                ) : (
                  <User className="h-6 w-6 text-accent-600" />
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {name}
            </h3>
          </div>

          <div className="flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Second row: service and appointment details */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-700">{serviceName}</span>
            {appointmentDate && (
              <>
                <span className="mx-2">•</span>
                <span className="text-gray-500">
                  {dateLabel}
                  {appointmentTime && ` at ${appointmentTime}`}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageHeader;