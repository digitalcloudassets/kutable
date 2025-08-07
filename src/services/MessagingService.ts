import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { notificationService, BookingNotificationData } from './NotificationService';

// Check if Supabase is properly connected
const isSupabaseConnected = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabaseAnonKey !== 'your_supabase_anon_key_here' &&
    supabaseUrl !== 'your_supabase_url_here' &&
    supabaseAnonKey !== 'your_supabase_anon_key_here' &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder') &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co');
};

export type Message = Database['public']['Tables']['messages']['Row'] & {
  sender_profile?: {
    id: string;
    name: string;
    type: 'barber' | 'client';
  };
  receiver_profile?: {
    id: string;
    name: string;
    type: 'barber' | 'client';
  };
};

export interface Conversation {
  bookingId: string;
  lastMessage?: Message;
  unreadCount: number;
  participant: {
    id: string;
    name: string;
    type: 'barber' | 'client';
    avatar?: string;
  };
  booking: {
    id: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    status: string;
  };
}

export interface SendMessageRequest {
  bookingId: string;
  receiverId: string;
  messageText: string;
}

export class MessagingService {
  private static instance: MessagingService;
  private subscriptions: Map<string, any> = new Map();

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (!isSupabaseConnected()) {
      console.warn('Supabase not connected - messaging unavailable');
      return [];
    }

    try {
      // First, get user's barber profile if they have one
      const { data: barberProfile } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      // Get user's client profile if they have one
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      let allBookings: any[] = [];

      // Get bookings where user is a barber
      if (barberProfile) {
        const { data: barberBookings, error: barberError } = await supabase
          .from('bookings')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
           barber_id,
           client_id,
            services(name),
            barber_profiles(id, user_id, business_name, owner_name, profile_image_url),
            client_profiles(id, user_id, first_name, last_name)
          `)
          .eq('barber_id', barberProfile.id)
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('appointment_date', { ascending: false });

        if (barberError) throw barberError;
        allBookings.push(...(barberBookings || []));
      }

      // Get bookings where user is a client
      if (clientProfile) {
        const { data: clientBookings, error: clientError } = await supabase
          .from('bookings')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
           barber_id,
           client_id,
            services(name),
            barber_profiles(id, user_id, business_name, owner_name, profile_image_url),
            client_profiles(id, user_id, first_name, last_name)
          `)
          .eq('client_id', clientProfile.id)
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('appointment_date', { ascending: false });

        if (clientError) throw clientError;
        allBookings.push(...(clientBookings || []));
      }

      // Deduplicate bookings (in case user is both barber and client)
      const uniqueBookings = Array.from(
        new Map(allBookings.map(booking => [booking.id, booking])).values()
      );

      const conversations: Conversation[] = [];

      for (const booking of uniqueBookings) {
       // Detect if the current user is the barber for this booking
       // Use the barber_id from the booking directly, not the nested profile
       const isUserTheBarber = barberProfile && booking.barber_id === barberProfile.id;

        // Participant logic:  
        // For barbers, always show the client as the conversation participant, 
        // even if client_profiles.user_id is null (unclaimed account)
        let participant;
        if (isUserTheBarber) {
          // For barbers: participant is the client's Auth UID
          participant = {
            id: booking.client_profiles?.user_id || '', // <-- Use only user_id!
            name: `${booking.client_profiles?.first_name || ''} ${booking.client_profiles?.last_name || ''}`.trim() || 'Client',
            type: 'client' as const,
            avatar: undefined,
          };
        } else {
          // For clients: participant is the barber's Auth UID
          participant = {
            id: booking.barber_profiles?.user_id || '', // <-- Use only user_id!
            name: booking.barber_profiles?.business_name || 'Barber',
            type: 'barber' as const,
            avatar: booking.barber_profiles?.profile_image_url || undefined,
          };
        }

        // Debug logging for participant assignment
        console.log('🔍 DEBUG - Participant assignment:', {
          booking_id: booking.id,
          is_user_the_barber: isUserTheBarber,
          participant_user_id: participant.id,
          participant_name: participant.name,
          participant_type: participant.type,
          client_user_id: booking.client_profiles?.user_id,
          barber_user_id: booking.barber_profiles?.user_id
        });

          .from('messages')
          .select('*')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('booking_id', booking.id)
          .eq('receiver_id', userId)
          .is('read_at', null);

       // Always include the conversation - unclaimed clients still show in the list
        conversations.push({
          bookingId: booking.id,
          lastMessage: lastMessage || undefined,
          unreadCount: unreadCount || 0,
          participant,
          booking: {
            id: booking.id,
            serviceName: booking.services?.name || 'Service',
            appointmentDate: booking.appointment_date,
            appointmentTime: booking.appointment_time,
            status: booking.status
          }
        });
      }

      return conversations.sort((a, b) => {
        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;
        return new Date(b.booking.appointmentDate).getTime() - new Date(a.booking.appointmentDate).getTime();
      });

    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getMessagesForBooking(bookingId: string, userId: string): Promise<Message[]> {
    if (!isSupabaseConnected()) {
      console.warn('Supabase not connected - messaging unavailable');
      return [];
    }

    try {
      // Verify user has access to this booking
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          barber_profiles(user_id, business_name),
          client_profiles(user_id, first_name, last_name)
        `)
        .eq('id', bookingId)
        .single();

      if (!booking) {
        throw new Error('Booking not found');
      }

      const hasAccess = booking.barber_profiles?.user_id === userId || 
                       booking.client_profiles?.user_id === userId;

      if (!hasAccess) {
        throw new Error('Access denied');
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Add sender/receiver profile info
      const enrichedMessages: Message[] = (messages || []).map(message => {
        const isFromBarber = message.sender_id === booking.barber_profiles?.user_id;
        return {
          ...message,
          sender_profile: isFromBarber 
            ? {
                id: booking.barber_profiles?.user_id || '',
                name: booking.barber_profiles?.business_name || booking.barber_profiles?.owner_name || 'Barber',
                type: 'barber'
              }
            : {
                id: booking.client_profiles?.user_id || '',
                name: `${booking.client_profiles?.first_name || ''} ${booking.client_profiles?.last_name || ''}`.trim(),
                type: 'client'
              }
        };
      });

      return enrichedMessages;

    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async sendMessage({ bookingId, receiverId, messageText }: SendMessageRequest): Promise<Message> {
    if (!isSupabaseConnected()) {
      throw new Error('Messaging is not available - please connect to Supabase');
    }

    // Validate receiverId is not empty
    if (!receiverId || receiverId.trim() === '') {
      console.warn('Attempt to send message with blank receiverId:', { bookingId, receiverId });
      throw new Error('Cannot send message: recipient account not found. The recipient needs to create an account first.');
    }
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Sending message:', { 
        fromUserId: user.id, 
        toUserId: receiverId, 
        bookingId,
        messagePreview: messageText.slice(0, 50) 
      });
      // Validate message
      if (!messageText.trim() || messageText.length > 1000) {
        throw new Error('Message must be between 1 and 1000 characters');
      }

      // Sanitize message text
      const sanitizedMessage = messageText
        .trim()
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove JS protocols
        .slice(0, 1000);

      // Send message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          booking_id: bookingId,
          sender_id: user.id,
          receiver_id: receiverId,
          message_text: sanitizedMessage
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Message saved to database:', message.id);
      // Send notification to receiver if they have notifications enabled
      try {
        await this.sendMessageNotification(bookingId, receiverId, sanitizedMessage, user.id);
        console.log('Notification sent for message:', message.id);
      } catch (notificationError) {
        console.error('Failed to send notification for message:', message.id, notificationError);
        // Don't throw - message was still sent successfully
      }

      return message;

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    if (!isSupabaseConnected()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('receiver_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async markConversationAsRead(bookingId: string, userId: string): Promise<void> {
    if (!isSupabaseConnected()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .eq('receiver_id', userId)
        .is('read_at', null);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }

  subscribeToMessages(bookingId: string, callback: (message: Message) => void): () => void {
    if (!isSupabaseConnected()) {
      // Return a no-op unsubscribe function
      return () => {};
    }

    try {
      const channel = supabase
        .channel(`messages_${bookingId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `booking_id=eq.${bookingId}`,
          },
          (payload) => {
            try {
              callback(payload.new as Message);
            } catch (callbackError) {
              console.warn('Message callback error:', callbackError);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Real-time subscription status for booking ${bookingId}:`, status);
          
          if (status === 'SUBSCRIPTION_ERROR') {
            console.warn('Real-time subscription failed for booking:', bookingId);
          }
        });

        const { data: lastMessage } = await supabase
      const unsubscribe = () => {
        try {
          supabase.removeChannel(channel);
          this.subscriptions.delete(bookingId);
        } catch (error) {
          console.warn('Error unsubscribing from real-time channel:', error);
        }
      };

      this.subscriptions.set(bookingId, unsubscribe);
      return unsubscribe;
    } catch (subscriptionError) {
      console.warn('Failed to set up real-time subscription:', subscriptionError);
      // Return a no-op unsubscribe function
      return () => {};
    }
  }

  private async sendMessageNotification(
    bookingId: string, 
    receiverId: string, 
    messageText: string, 
    senderId: string
  ): Promise<void> {
    try {
      console.log('Sending message notification:', { bookingId, receiverId, senderId, messagePreview: messageText.slice(0, 50) });
      
      // Get booking and user details for notification
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          services(name),
          barber_profiles(user_id, business_name, phone, email, sms_consent, email_consent),
          client_profiles(user_id, first_name, last_name, phone, email, sms_consent, email_consent)
        `)
        .eq('id', bookingId)
        .single();

      if (!booking) {
        console.warn('Booking not found for notification:', bookingId);
        return;
      }

      // Determine sender and receiver profiles
      const isFromBarber = senderId === booking.barber_profiles?.user_id;
      const senderProfile = isFromBarber ? booking.barber_profiles : booking.client_profiles;
      const receiverProfile = isFromBarber ? booking.client_profiles : booking.barber_profiles;

      if (!senderProfile || !receiverProfile) {
        console.warn('Missing profile data for notification:', { 
          bookingId, 
          hasSender: !!senderProfile, 
          hasReceiver: !!receiverProfile 
        });
        return; // Exit gracefully without breaking the message flow
      }

      // Prevent sending notifications to self
      if (senderProfile.user_id === receiverProfile.user_id) {
        console.warn('Cannot send notification to self (message still sent successfully)');
        return; // Exit gracefully without breaking the message flow
      }

      const senderName = isFromBarber 
        ? senderProfile.business_name 
        : `${senderProfile.first_name} ${senderProfile.last_name}`;

      const receiverName = isFromBarber
        ? `${receiverProfile.first_name} ${receiverProfile.last_name}`
        : receiverProfile.business_name;

      console.log('Notification participants:', { senderName, receiverName, receiverPhone: receiverProfile.phone, receiverEmail: receiverProfile.email });
      // Send SMS notification if user has SMS enabled (default to true for essential notifications)
      const shouldSendSMS = (receiverProfile.sms_consent !== false) && !!receiverProfile.phone;
      console.log('SMS notification check:', { shouldSendSMS, smsConsent: receiverProfile.sms_consent, hasPhone: !!receiverProfile.phone });
      
      if (shouldSendSMS) {
        const smsMessage = `💬 New message from ${senderName}:\n\n"${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}"\n\nReply in your Kutable dashboard.\n\n- Kutable`;
        
        console.log('Sending SMS to:', receiverProfile.phone);
        try {
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            to: receiverProfile.phone,
            message: smsMessage,
            type: 'booking_update'
          }
          });
        
          if (smsError) {
            console.warn('Failed to send SMS notification to', receiverProfile.phone, ':', smsError);
          } else if (smsResult?.success) {
            console.log('✅ SMS notification sent successfully to:', receiverProfile.phone);
          } else {
            console.warn('SMS failed with result:', smsResult);
          }
        } catch (smsError) {
          console.warn('SMS service error (CORS or network issue):', smsError);
          // Don't break the messaging flow for SMS failures
        }
      }

      // Send email notification if user has email enabled (default to true for essential notifications)
      const shouldSendEmail = (receiverProfile.email_consent !== false) && 
                              !!receiverProfile.email && 
                              this.isValidEmail(receiverProfile.email);
      console.log('Email notification check:', { shouldSendEmail, emailConsent: receiverProfile.email_consent, hasEmail: !!receiverProfile.email });
      
      if (shouldSendEmail) {
        const emailSubject = `New message from ${senderName} - Kutable`;
        const emailMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937;">💬 New Message</h2>
            <p>Hi ${receiverName},</p>
            <p>You have a new message from <strong>${senderName}</strong> regarding your ${booking.services?.name} appointment:</p>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066ff;">
              <p style="font-style: italic; margin: 0;">"${messageText}"</p>
            </div>

            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #4b5563;"><strong>Appointment:</strong> ${booking.services?.name}</p>
              <p style="margin: 5px 0 0 0; color: #4b5563;"><strong>Date:</strong> ${new Date(booking.appointment_date).toLocaleDateString()} at ${booking.appointment_time}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://kutable.com/dashboard" style="background-color: #0066ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Reply in Dashboard
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              This message was sent through Kutable's secure messaging system.
            </p>
          </div>
        `;

        console.log('Sending email to:', receiverProfile.email);
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: receiverProfile.email,
            name: receiverName,
            subject: emailSubject,
            message: emailMessage,
            type: 'message_notification'
          }
          });
        
          if (emailError) {
            console.warn('Failed to send email notification to', receiverProfile.email, ':', emailError);
          } else if (emailResult?.success) {
            console.log('✅ Email notification sent successfully to:', receiverProfile.email);
          } else {
            console.warn('Email failed with result:', emailResult);
          }
        } catch (emailError) {
          console.warn('Email service error:', emailError);
          // Don't break the messaging flow for email failures
        }
      }

    } catch (error) {
      console.warn('Error sending message notification (message still sent successfully):', error);
      // Don't throw - message sending should succeed even if notification fails
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    if (!isSupabaseConnected()) {
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('receiver_id', userId)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  cleanup(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }
}

export const messagingService = MessagingService.getInstance();