import toast from 'react-hot-toast';

export type NotificationType = 'success' | 'error' | 'loading' | 'info';

interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export class NotificationManager {
  static show(
    message: string, 
    type: NotificationType = 'info', 
    options: NotificationOptions = {}
  ) {
    const defaultOptions = {
      duration: 4000,
      position: 'top-right' as const,
      ...options
    };

    const toastOptions = {
      duration: defaultOptions.duration,
      position: defaultOptions.position,
      style: {
        background: '#fff',
        color: '#374151',
        border: '1px solid #E5E7EB',
        borderRadius: '0.75rem',
        padding: '1rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    };

    switch (type) {
      case 'success':
        return toast.success(message, {
          ...toastOptions,
          style: {
            ...toastOptions.style,
            borderColor: '#10B981',
            background: '#ECFDF5',
            color: '#065F46',
          },
          icon: '✅',
        });
      
      case 'error':
        return toast.error(message, {
          ...toastOptions,
          style: {
            ...toastOptions.style,
            borderColor: '#EF4444',
            background: '#FEF2F2',
            color: '#991B1B',
          },
          icon: '❌',
        });
      
      case 'loading':
        return toast.loading(message, {
          ...toastOptions,
          style: {
            ...toastOptions.style,
            borderColor: '#0066FF',
            background: '#EBF4FF',
            color: '#1E40AF',
          },
        });
      
      case 'info':
      default:
        return toast(message, {
          ...toastOptions,
          style: {
            ...toastOptions.style,
            borderColor: '#0066FF',
            background: '#EBF4FF',
            color: '#1E40AF',
          },
          icon: 'ℹ️',
        });
    }
  }

  static success(message: string, options?: NotificationOptions) {
    return this.show(message, 'success', options);
  }

  static error(message: string, options?: NotificationOptions) {
    return this.show(message, 'error', options);
  }

  static loading(message: string, options?: NotificationOptions) {
    return this.show(message, 'loading', options);
  }

  static info(message: string, options?: NotificationOptions) {
    return this.show(message, 'info', options);
  }

  static dismiss(toastId?: string) {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  static promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: NotificationOptions
  ) {
    return toast.promise(promise, messages, {
      style: {
        background: '#fff',
        color: '#374151',
        border: '1px solid #E5E7EB',
        borderRadius: '0.75rem',
        padding: '1rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      ...options
    });
  }
}

// Booking-specific notifications
export const BookingNotifications = {
  bookingCreated: (barberName: string, date: string, time: string) =>
    NotificationManager.success(
      `Booking confirmed with ${barberName} on ${date} at ${time}!`
    ),
  
  bookingRequestSubmitted: (barberName: string, date: string, time: string) =>
    NotificationManager.info(
      `Booking request sent to ${barberName} for ${date} at ${time}. Awaiting confirmation.`
    ),

  bookingCancelled: () => 
    NotificationManager.info('Booking cancelled successfully'),
  
  bookingRescheduled: (newDate: string, newTime: string) => 
    NotificationManager.success(
      `Appointment rescheduled to ${newDate} at ${newTime}`
    ),
  
  paymentProcessing: () => 
    NotificationManager.loading('Processing payment...'),
  
  paymentSuccess: () => 
    NotificationManager.success('Payment processed successfully!'),
  
  paymentFailed: (reason?: string) => 
    NotificationManager.error(
      `Payment failed${reason ? `: ${reason}` : '. Please try again.'}`
    ),
  
  profileUpdated: () => 
    NotificationManager.success('Profile updated successfully!'),
  
  serviceCreated: (serviceName: string) => 
    NotificationManager.success(`Service "${serviceName}" created!`),
  
  serviceDeleted: (serviceName: string) => 
    NotificationManager.info(`Service "${serviceName}" deleted`),
  
  stripeConnected: () => 
    NotificationManager.success('Stripe account connected! You can now accept payments.'),
  
  stripeDisconnected: () => 
    NotificationManager.info('Stripe account disconnected'),
  
  availabilityUpdated: () => 
    NotificationManager.success('Availability updated successfully!'),

  notificationsSent: (smsCount: number, emailCount: number) =>
    NotificationManager.success(
      `Notifications sent: ${smsCount} SMS, ${emailCount} emails`
    ),

  notificationsFailed: () =>
    NotificationManager.error('Some notifications failed to send. Check your settings.'),
};

// Admin-specific notifications
export const AdminNotifications = {
  dataExported: (type: string) => 
    NotificationManager.success(`${type} data exported successfully!`),
  
  barberStatusUpdated: (barberName: string, status: string) => 
    NotificationManager.info(`${barberName} status updated to ${status}`),
  
  bulkActionCompleted: (count: number, action: string) => 
    NotificationManager.success(`${action} completed for ${count} items`),
};

// Error handling notifications
export const ErrorNotifications = {
  networkError: () => 
    NotificationManager.error('Network error. Please check your connection.'),
  
  databaseError: () => 
    NotificationManager.error('Database error. Please try again later.'),
  
  permissionDenied: () => 
    NotificationManager.error('You do not have permission to perform this action.'),
  
  validationError: (field: string) => 
    NotificationManager.error(`Please check the ${field} field and try again.`),
  
  fileUploadError: (reason?: string) => 
    NotificationManager.error(
      `File upload failed${reason ? `: ${reason}` : '. Please try again.'}`
    ),
  
  stripeError: (message: string) => 
    NotificationManager.error(`Payment error: ${message}`),
};