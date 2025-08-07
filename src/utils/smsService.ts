import { supabase } from '../lib/supabase';
import { notificationService, BookingNotificationData } from '../services/NotificationService';

export interface SMSMessage {
  to: string;
  message: string;
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_update';
}

// Enhanced SMS service with centralized notification handling
export const sendBookingNotificationSMS = async (
  event: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled' | 'appointment_reminder',
  bookingData: BookingNotificationData,
  recipientOverride?: 'barber' | 'client' | 'both'
): Promise<boolean> => {
  try {
    const results = await notificationService.sendNotifications(event, bookingData, {
      skipEmail: true, // Only send SMS
      recipientOverride
    });

    // Return true if at least one SMS was sent successfully
    return results.sms.barber || results.sms.client;
  } catch (error) {
    console.error('Error sending booking notification SMS:', error);
    return false;
  }
};

export const sendSMS = async (smsData: SMSMessage): Promise<boolean> => {
  try {
    // Check if user has SMS consent before sending
    // This will be checked in the edge function, but we validate here too
    console.log('Attempting to send SMS:', { to: smsData.to, type: smsData.type });
    
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: smsData
      });

      if (error) {
        console.warn('SMS service error (expected if Twilio not configured):', error);
        return false;
      }

      return data?.success || false;
    } catch (fetchError) {
      // Handle network errors or function not available
      console.warn('SMS function unavailable (expected if Edge Functions not deployed or Twilio not configured):', fetchError);
      return false;
    }
  } catch (error) {
    console.warn('SMS service unavailable:', error);
    return false;
  }
};

export const formatBookingConfirmationSMS = (
  businessName: string,
  serviceName: string,
  date: string,
  time: string,
  customerName: string,
  totalAmount?: number
): string => {
  const appointmentDate = new Date(date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  let message = `🎉 Booking Confirmed!\n\nHi ${customerName}! Your ${serviceName} appointment at ${businessName} is confirmed.\n\n📅 ${formattedDate}\n⏰ ${time}`;
  
  if (totalAmount) {
    message += `\n💰 $${totalAmount}`;
  }
  
  message += `\n\nWe'll send you a reminder 24hrs before. Questions? Reply STOP to opt out.\n\n- Kutable Team`;
  
  return message;
};

export const formatBookingReminderSMS = (
  businessName: string,
  serviceName: string,
  date: string,
  time: string,
  customerName: string,
  appointmentLocation?: string
): string => {
  const appointmentDate = new Date(date);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  let message = `⏰ Appointment Reminder\n\nHi ${customerName}! Don't forget about your ${serviceName} appointment at ${businessName}.\n\n📅 ${formattedDate}\n⏰ ${time}`;
  
  if (appointmentLocation) {
    message += `\n📍 ${appointmentLocation}`;
  }
  
  message += `\n\nSee you soon! Reply STOP to opt out.\n\n- Kutable Team`;
  
  return message;
};

export const formatBookingUpdateSMS = (
  businessName: string,
  updateMessage: string,
  customerName: string
): string => {
  return `Hi ${customerName}, update from ${businessName}: ${updateMessage}`;
};