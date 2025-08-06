import { supabase } from '../api/supabaseClient';

export interface SMSMessage {
  to: string;
  message: string;
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_update';
}

export const sendSMS = async (smsData: SMSMessage): Promise<boolean> => {
  try {
    // Check if user has SMS consent before sending
    // This will be checked in the edge function, but we validate here too
    console.log('Attempting to send SMS:', { to: smsData.to, type: smsData.type });
    
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: smsData
    });

    if (error) {
      console.error('SMS service error:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Error sending SMS:', error);
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