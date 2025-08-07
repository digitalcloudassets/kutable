import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { NotificationService, BookingNotificationData, NotificationEvent } from '../services/NotificationService';

export const useNotifications = () => {
  const notificationService = NotificationService.getInstance();

  const sendBookingNotification = useCallback(async (
    event: NotificationEvent,
    bookingData: BookingNotificationData,
    options?: {
      skipSMS?: boolean;
      skipEmail?: boolean;
      recipientOverride?: 'barber' | 'client' | 'both';
    }
  ) => {
    try {
      // Use the centralized notification service
      const results = await notificationService.sendNotifications(event, bookingData, options);
      
      // Also trigger the backend notification processor for reliability
      const { error } = await supabase.functions.invoke('process-booking-notifications', {
        body: {
          bookingId: bookingData.bookingId,
          event,
          skipSMS: options?.skipSMS,
          skipEmail: options?.skipEmail,
          recipientOverride: options?.recipientOverride
        }
      });

      if (error) {
        console.warn('Backend notification processor error:', error);
        // Don't throw - frontend notifications might still work
      }

      return results;
    } catch (error) {
      console.error('Notification hook error:', error);
      throw error;
    }
  }, [notificationService]);

  const scheduleReminder = useCallback(async (bookingId: string, reminderDate: Date) => {
    try {
      // Schedule a reminder notification
      const { error } = await supabase.functions.invoke('schedule-reminder', {
        body: {
          bookingId,
          reminderDate: reminderDate.toISOString(),
          type: 'appointment_reminder'
        }
      });

      if (error) {
        console.error('Error scheduling reminder:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Reminder scheduling error:', error);
      return false;
    }
  }, []);

  // Convenience methods for common notification scenarios
  const notifyBookingCreated = useCallback((bookingData: BookingNotificationData) => {
    return sendBookingNotification('booking_created', bookingData);
  }, [sendBookingNotification]);

  const notifyBookingConfirmed = useCallback((bookingData: BookingNotificationData) => {
    return sendBookingNotification('booking_confirmed', bookingData);
  }, [sendBookingNotification]);

  const notifyBookingCancelled = useCallback((bookingData: BookingNotificationData) => {
    return sendBookingNotification('booking_cancelled', bookingData);
  }, [sendBookingNotification]);

  const notifyAppointmentReminder = useCallback((bookingData: BookingNotificationData) => {
    return sendBookingNotification('appointment_reminder', bookingData);
  }, [sendBookingNotification]);

  return {
    sendBookingNotification,
    scheduleReminder,
    notifyBookingCreated,
    notifyBookingConfirmed,
    notifyBookingCancelled,
    notifyAppointmentReminder
  };
};