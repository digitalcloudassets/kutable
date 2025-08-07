import { supabase } from '../lib/supabase';

export interface NotificationRecipient {
  name: string;
  phone?: string;
  email?: string;
  preferences?: {
    sms: boolean;
    email: boolean;
    communication: boolean;
  };
}

export interface BookingNotificationData {
  bookingId: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  totalAmount: number;
  depositAmount?: number;
  notes?: string;
  barber: {
    businessName: string;
    ownerName: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  client: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
}

export type NotificationEvent = 
  | 'booking_created'
  | 'booking_confirmed' 
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'appointment_reminder'
  | 'barber_running_late'
  | 'client_checked_in'
  | 'payment_received'
  | 'refund_processed';

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async sendNotifications(
    event: NotificationEvent,
    bookingData: BookingNotificationData,
    options?: {
      skipSMS?: boolean;
      skipEmail?: boolean;
      recipientOverride?: 'barber' | 'client' | 'both';
    }
  ): Promise<{
    sms: { barber: boolean; client: boolean };
    email: { barber: boolean; client: boolean };
  }> {
    const results = {
      sms: { barber: false, client: false },
      email: { barber: false, client: false }
    };

    try {
      // Get user preferences from database
      const [barberPrefs, clientPrefs] = await Promise.all([
        this.getUserPreferences('barber', bookingData.barber.email),
        this.getUserPreferences('client', bookingData.client.email)
      ]);

      const recipients = options?.recipientOverride || 'both';

      // Send to barber
      if (recipients === 'both' || recipients === 'barber') {
        if (!options?.skipSMS && barberPrefs.sms && bookingData.barber.phone) {
          results.sms.barber = await this.sendSMS(
            bookingData.barber.phone,
            this.generateSMSMessage(event, bookingData, 'barber'),
            event
          );
        }

        if (!options?.skipEmail && barberPrefs.email && bookingData.barber.email) {
          results.email.barber = await this.sendEmail(
            bookingData.barber.email,
            bookingData.barber.ownerName,
            this.generateEmailSubject(event, bookingData, 'barber'),
            this.generateEmailMessage(event, bookingData, 'barber'),
            event
          );
        }
      }

      // Send to client
      if (recipients === 'both' || recipients === 'client') {
        if (!options?.skipSMS && clientPrefs.sms && bookingData.client.phone) {
          results.sms.client = await this.sendSMS(
            bookingData.client.phone,
            this.generateSMSMessage(event, bookingData, 'client'),
            event
          );
        }

        if (!options?.skipEmail && clientPrefs.email && bookingData.client.email) {
          results.email.client = await this.sendEmail(
            bookingData.client.email,
            `${bookingData.client.firstName} ${bookingData.client.lastName}`,
            this.generateEmailSubject(event, bookingData, 'client'),
            this.generateEmailMessage(event, bookingData, 'client'),
            event
          );
        }
      }

      // Log notification results
      await this.logNotificationEvent(event, bookingData.bookingId, results);

    } catch (error) {
      console.error('Notification service error:', error);
      // Don't throw - notifications shouldn't break booking flow
    }

    return results;
  }

  private async getUserPreferences(userType: 'barber' | 'client', email?: string): Promise<{
    sms: boolean;
    email: boolean;
    communication: boolean;
  }> {
    if (!email) {
      return { sms: false, email: false, communication: false };
    }

    try {
      const table = userType === 'barber' ? 'barber_profiles' : 'client_profiles';
      const { data } = await supabase
        .from(table)
        .select('sms_consent, email_consent, communication_consent')
        .eq('email', email)
        .maybeSingle();

      return {
        sms: data?.sms_consent ?? true, // Default to true for essential notifications
        email: data?.email_consent ?? true,
        communication: data?.communication_consent ?? true
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Default to sending essential notifications
      return { sms: true, email: true, communication: true };
    }
  }

  private async sendSMS(
    phoneNumber: string,
    message: string,
    eventType: NotificationEvent
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: phoneNumber,
          message: message,
          type: this.mapEventToSMSType(eventType)
        }
      });

      if (error) {
        console.error('SMS sending error:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('SMS service error:', error);
      return false;
    }
  }

  private async sendEmail(
    email: string,
    name: string,
    subject: string,
    message: string,
    eventType: NotificationEvent
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          name: name,
          subject: subject,
          message: message,
          type: eventType
        }
      });

      if (error) {
        console.error('Email sending error:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  private mapEventToSMSType(event: NotificationEvent): string {
    switch (event) {
      case 'booking_created':
      case 'booking_confirmed':
        return 'booking_confirmation';
      case 'appointment_reminder':
        return 'booking_reminder';
      default:
        return 'booking_update';
    }
  }

  private generateSMSMessage(
    event: NotificationEvent,
    booking: BookingNotificationData,
    recipient: 'barber' | 'client'
  ): string {
    const appointmentDate = new Date(booking.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });

    const recipientName = recipient === 'barber' 
      ? booking.barber.ownerName 
      : booking.client.firstName;

    const otherPartyName = recipient === 'barber'
      ? `${booking.client.firstName} ${booking.client.lastName}`
      : booking.barber.businessName;

    switch (event) {
      case 'booking_created':
        if (recipient === 'barber') {
          return `🆕 New Booking Request!\n\nHi ${recipientName}! ${otherPartyName} wants to book ${booking.serviceName}.\n\n📅 ${formattedDate}\n⏰ ${booking.appointmentTime}\n💰 $${booking.totalAmount}\n\nPlease review and confirm this booking in your dashboard.\n\n- Kutable`;
        } else {
          return `📋 Booking Submitted!\n\nHi ${recipientName}! Your ${booking.serviceName} request at ${otherPartyName} has been submitted.\n\n📅 ${formattedDate}\n⏰ ${booking.appointmentTime}\n💰 $${booking.totalAmount}\n\nWe'll notify you once confirmed!\n\n- Kutable`;
        }

      case 'booking_confirmed':
        if (recipient === 'barber') {
          return `✅ Booking Confirmed!\n\nHi ${recipientName}! You confirmed ${otherPartyName}'s ${booking.serviceName} appointment.\n\n📅 ${formattedDate}\n⏰ ${booking.appointmentTime}\n💰 $${booking.totalAmount}\n\nSee you soon!\n\n- Kutable`;
        } else {
          return `🎉 Booking Confirmed!\n\nHi ${recipientName}! Your ${booking.serviceName} appointment at ${otherPartyName} is confirmed.\n\n📅 ${formattedDate}\n⏰ ${booking.appointmentTime}\n💰 $${booking.totalAmount}\n\nWe'll remind you 24hrs before!\n\n- Kutable`;
        }

      case 'booking_cancelled':
        if (recipient === 'barber') {
          return `❌ Booking Cancelled\n\nHi ${recipientName}! ${otherPartyName} cancelled their ${booking.serviceName} appointment on ${formattedDate} at ${booking.appointmentTime}.\n\nNo action needed from you.\n\n- Kutable`;
        } else {
          return `❌ Booking Cancelled\n\nHi ${recipientName}! Your ${booking.serviceName} appointment at ${otherPartyName} on ${formattedDate} at ${booking.appointmentTime} has been cancelled.\n\nFull refund processed.\n\n- Kutable`;
        }

      case 'booking_rescheduled':
        return `📅 Appointment Rescheduled\n\nHi ${recipientName}! Your ${booking.serviceName} appointment ${recipient === 'barber' ? `with ${otherPartyName}` : `at ${otherPartyName}`} has been rescheduled to ${formattedDate} at ${booking.appointmentTime}.\n\n- Kutable`;

      case 'appointment_reminder':
        if (recipient === 'barber') {
          return `⏰ Appointment Tomorrow\n\nHi ${recipientName}! Reminder: ${otherPartyName} has ${booking.serviceName} tomorrow at ${booking.appointmentTime}.\n\nContact: ${booking.client.phone || 'No phone provided'}\n\n- Kutable`;
        } else {
          return `⏰ Appointment Reminder\n\nHi ${recipientName}! Don't forget your ${booking.serviceName} appointment at ${otherPartyName} tomorrow at ${booking.appointmentTime}.\n\n📍 ${booking.barber.address ? `${booking.barber.address}, ${booking.barber.city}, ${booking.barber.state}` : 'Contact barber for location'}\n\n- Kutable`;
        }

      case 'barber_running_late':
        return `⏰ Running Late Notice\n\nHi ${recipientName}! ${otherPartyName} is running about 15 minutes late for your ${booking.appointmentTime} appointment. They'll be with you shortly!\n\n- Kutable`;

      case 'client_checked_in':
        return `👋 Client Checked In\n\nHi ${recipientName}! ${otherPartyName} has checked in for their ${booking.appointmentTime} ${booking.serviceName} appointment.\n\n- Kutable`;

      case 'payment_received':
        return `💰 Payment Received\n\nHi ${recipientName}! Payment of $${booking.totalAmount} for ${booking.serviceName} has been processed and will arrive in your account in 2-3 business days.\n\n- Kutable`;

      default:
        return `📱 Booking Update\n\nHi ${recipientName}! There's an update regarding your ${booking.serviceName} appointment. Please check your Kutable dashboard for details.\n\n- Kutable`;
    }
  }

  private generateEmailSubject(
    event: NotificationEvent,
    booking: BookingNotificationData,
    recipient: 'barber' | 'client'
  ): string {
    const businessName = booking.barber.businessName;
    const clientName = `${booking.client.firstName} ${booking.client.lastName}`;

    switch (event) {
      case 'booking_created':
        return recipient === 'barber' 
          ? `New Booking Request from ${clientName}`
          : `Booking Request Submitted - ${businessName}`;

      case 'booking_confirmed':
        return recipient === 'barber'
          ? `Booking Confirmed with ${clientName}`
          : `Appointment Confirmed - ${businessName}`;

      case 'booking_cancelled':
        return recipient === 'barber'
          ? `Booking Cancelled - ${clientName}`
          : `Appointment Cancelled - ${businessName}`;

      case 'booking_rescheduled':
        return `Appointment Rescheduled - ${businessName}`;

      case 'appointment_reminder':
        return recipient === 'barber'
          ? `Tomorrow's Appointment - ${clientName}`
          : `Appointment Reminder - ${businessName}`;

      case 'payment_received':
        return `Payment Received - $${booking.totalAmount}`;

      default:
        return `Booking Update - ${businessName}`;
    }
  }

  private generateEmailMessage(
    event: NotificationEvent,
    booking: BookingNotificationData,
    recipient: 'barber' | 'client'
  ): string {
    const appointmentDate = new Date(booking.appointmentDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });

    const recipientName = recipient === 'barber' 
      ? booking.barber.ownerName 
      : booking.client.firstName;

    const otherPartyName = recipient === 'barber'
      ? `${booking.client.firstName} ${booking.client.lastName}`
      : booking.barber.businessName;

    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; font-size: 28px; margin: 0;">Kutable</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">Professional Barber Booking</p>
          </div>
    `;

    const footerTemplate = `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This email was sent by Kutable. If you have questions, please contact support.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
              To manage your notification preferences, visit your dashboard.
            </p>
          </div>
        </div>
      </div>
    `;

    switch (event) {
      case 'booking_created':
        if (recipient === 'barber') {
          return baseTemplate + `
            <h2 style="color: #059669; margin-bottom: 20px;">New Booking Request!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You have a new booking request from <strong>${otherPartyName}</strong>.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0;">Booking Details</h3>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Amount:</strong> $${booking.totalAmount}</p>
              ${booking.notes ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Notes:</strong> ${booking.notes}</p>` : ''}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://kutable.com/dashboard" style="background-color: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Review & Confirm Booking
              </a>
            </div>
          ` + footerTemplate;
        } else {
          return baseTemplate + `
            <h2 style="color: #0066ff; margin-bottom: 20px;">Booking Request Submitted</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your booking request with <strong>${otherPartyName}</strong> has been submitted successfully.
            </p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0;">Booking Details</h3>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Amount:</strong> $${booking.totalAmount}</p>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We'll notify you once the barber confirms your appointment.
            </p>
          ` + footerTemplate;
        }

      case 'booking_confirmed':
        if (recipient === 'barber') {
          return baseTemplate + `
            <h2 style="color: #059669; margin-bottom: 20px;">Booking Confirmed</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You've successfully confirmed the appointment with <strong>${otherPartyName}</strong>.
            </p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="color: #065f46; margin: 0 0 15px 0;">Appointment Details</h3>
              <p style="margin: 5px 0; color: #047857;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Amount:</strong> $${booking.totalAmount}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Client Phone:</strong> ${booking.client.phone || 'Not provided'}</p>
            </div>
          ` + footerTemplate;
        } else {
          return baseTemplate + `
            <h2 style="color: #10b981; margin-bottom: 20px;">🎉 Appointment Confirmed!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Great news! Your appointment with <strong>${otherPartyName}</strong> has been confirmed.
            </p>
            
            <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="color: #065f46; margin: 0 0 15px 0;">Your Appointment</h3>
              <p style="margin: 5px 0; color: #047857;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Location:</strong> ${booking.barber.address ? `${booking.barber.address}, ${booking.barber.city}, ${booking.barber.state}` : 'Contact barber for details'}</p>
              <p style="margin: 5px 0; color: #047857;"><strong>Barber Phone:</strong> ${booking.barber.phone || 'Available in your dashboard'}</p>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We'll send you a reminder 24 hours before your appointment. Looking forward to seeing you!
            </p>
          ` + footerTemplate;
        }

      case 'appointment_reminder':
        if (recipient === 'barber') {
          return baseTemplate + `
            <h2 style="color: #f59e0b; margin-bottom: 20px;">⏰ Appointment Tomorrow</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Reminder: You have an appointment with <strong>${otherPartyName}</strong> tomorrow.
            </p>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 15px 0;">Tomorrow's Appointment</h3>
              <p style="margin: 5px 0; color: #b45309;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 5px 0; color: #b45309;"><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p style="margin: 5px 0; color: #b45309;"><strong>Client:</strong> ${otherPartyName}</p>
              <p style="margin: 5px 0; color: #b45309;"><strong>Phone:</strong> ${booking.client.phone || 'Not provided'}</p>
            </div>
          ` + footerTemplate;
        } else {
          return baseTemplate + `
            <h2 style="color: #f59e0b; margin-bottom: 20px;">⏰ Appointment Reminder</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              This is a friendly reminder about your appointment with <strong>${otherPartyName}</strong> tomorrow.
            </p>
            
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 15px 0;">Your Appointment Tomorrow</h3>
              <p style="margin: 5px 0; color: #b45309;"><strong>Service:</strong> ${booking.serviceName}</p>
              <p style="margin: 5px 0; color: #b45309;"><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p style="margin: 5px 0; color: #b45309;"><strong>Location:</strong> ${booking.barber.address ? `${booking.barber.address}, ${booking.barber.city}, ${booking.barber.state}` : 'Contact barber for details'}</p>
              <p style="margin: 5px 0; color: #b45309;"><strong>Barber Phone:</strong> ${booking.barber.phone || 'Check your dashboard'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://kutable.com/dashboard" style="background-color: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                View Appointment Details
              </a>
            </div>
          ` + footerTemplate;
        }

      default:
        return baseTemplate + `
          <h2 style="color: #6b7280; margin-bottom: 20px;">Booking Update</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${recipientName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            There's an update regarding your appointment. Please check your Kutable dashboard for the latest information.
          </p>
        ` + footerTemplate;
    }
  }

  private async logNotificationEvent(
    event: NotificationEvent,
    bookingId: string,
    results: { sms: { barber: boolean; client: boolean }; email: { barber: boolean; client: boolean } }
  ): Promise<void> {
    try {
      // Log notification attempts (for debugging and analytics)
      console.log('Notification event logged:', {
        event,
        bookingId,
        timestamp: new Date().toISOString(),
        results
      });

      // In production, you might want to store this in a notifications log table
      // await supabase.from('notification_logs').insert({ ... })
    } catch (error) {
      console.error('Error logging notification event:', error);
    }
  }

  // Convenience methods for specific events
  async notifyBookingCreated(bookingData: BookingNotificationData) {
    return this.sendNotifications('booking_created', bookingData);
  }

  async notifyBookingConfirmed(bookingData: BookingNotificationData) {
    return this.sendNotifications('booking_confirmed', bookingData);
  }

  async notifyBookingCancelled(bookingData: BookingNotificationData) {
    return this.sendNotifications('booking_cancelled', bookingData);
  }

  async notifyAppointmentReminder(bookingData: BookingNotificationData) {
    return this.sendNotifications('appointment_reminder', bookingData);
  }

  async notifyPaymentReceived(bookingData: BookingNotificationData) {
    return this.sendNotifications('payment_received', bookingData, { recipientOverride: 'barber' });
  }
}

export const notificationService = NotificationService.getInstance();