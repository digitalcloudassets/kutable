import { supabase } from './supabase';

export async function sendEmail(params: { 
  to: string; 
  subject: string; 
  html: string; 
  template: string; 
  toUserId?: string; 
  meta?: any 
}) {
  const { data, error } = await supabase.functions.invoke('send-email', { body: params });
  if (error || !data?.success) {
    console.warn('Email send failed:', error?.context || data?.error || error);
    return { ok: false, error: data?.error || error?.message || 'Send failed' };
  }
  return { ok: true, id: data.id, providerId: data.providerId };
}

// Helper functions for common email types
export async function sendBookingConfirmation(params: {
  to: string;
  toUserId?: string;
  customerName: string;
  barberName: string;
  service: string;
  date: string;
  bookingId: string;
}) {
  const { bookingConfirmationTemplate } = await import('./emailTemplates');
  
  const html = bookingConfirmationTemplate({
    barberName: params.barberName,
    customerName: params.customerName,
    date: params.date,
    service: params.service,
    manageUrl: `${window.location.origin}/dashboard`
  });

  return sendEmail({
    to: params.to,
    subject: `Booking confirmed - ${params.barberName}`,
    html,
    template: 'booking_confirmation',
    toUserId: params.toUserId,
    meta: { bookingId: params.bookingId }
  });
}

export async function sendBookingReminder(params: {
  to: string;
  toUserId?: string;
  customerName: string;
  date: string;
  bookingId: string;
}) {
  const { bookingReminderTemplate } = await import('./emailTemplates');
  
  const html = bookingReminderTemplate({
    customerName: params.customerName,
    date: params.date,
    manageUrl: `${window.location.origin}/dashboard`
  });

  return sendEmail({
    to: params.to,
    subject: `Appointment reminder - Tomorrow`,
    html,
    template: 'booking_reminder',
    toUserId: params.toUserId,
    meta: { bookingId: params.bookingId }
  });
}

export async function sendBarberNotification(params: {
  to: string;
  toUserId?: string;
  barberName: string;
  customerName: string;
  service: string;
  date: string;
  amount: string;
  bookingId: string;
}) {
  const { barberBookingNotificationTemplate } = await import('./emailTemplates');
  
  const html = barberBookingNotificationTemplate({
    barberName: params.barberName,
    customerName: params.customerName,
    date: params.date,
    service: params.service,
    amount: params.amount,
    manageUrl: `${window.location.origin}/dashboard`
  });

  return sendEmail({
    to: params.to,
    subject: `New booking from ${params.customerName}`,
    html,
    template: 'barber_booking_notification',
    toUserId: params.toUserId,
    meta: { bookingId: params.bookingId }
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  toUserId?: string;
  name: string;
  userType: 'client' | 'barber';
}) {
  const { welcomeEmailTemplate } = await import('./emailTemplates');
  
  const html = welcomeEmailTemplate({
    name: params.name,
    userType: params.userType,
    dashboardUrl: `${window.location.origin}/dashboard`
  });

  return sendEmail({
    to: params.to,
    subject: 'Welcome to Kutable!',
    html,
    template: 'welcome_email',
    toUserId: params.toUserId,
    meta: { userType: params.userType }
  });
}