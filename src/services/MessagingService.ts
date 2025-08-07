import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { notificationService, BookingNotificationData } from './NotificationService';

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
    try {
      // Get bookings where user is a barber
      const { data: barberBookings, error: barberError } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          services(name),
          barber_profiles(id, user_id, business_name, owner_name, profile_image_url),
          client_profiles(id, user_id, first_name, last_name)
        `)
        .eq('barber_profiles.user_id', userId)
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('appointment_date', { ascending: false });

      if (barberError) throw barberError;

      // Get bookings where user is a client
      const { data: clientBookings, error: clientError } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          services(name),
          barber_profiles(id, user_id, business_name, owner_name, profile_image_url),
          client_profiles(id, user_id, first_name, last_name)
        `)
        .eq('client_profiles.user_id', userId)
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('appointment_date', { ascending: false });

      if (clientError) throw clientError;

      // Combine and deduplicate bookings
      const allBookings = [...(barberBookings || []), ...(clientBookings || [])];
      const uniqueBookings = Array.from(
        new Map(allBookings.map(booking => [booking.id, booking])).values()
      );

      const conversations: Conversation[] = [];

      for (const booking of uniqueBookings) {
        const isBarber = booking.barber_profiles?.user_id === userId;
        const participant = isBarber 
          ? {
              id: booking.client_profiles?.user_id || '',
              name: `${booking.client_profiles?.first_name} ${booking.client_profiles?.last_name}`,
              type: 'client' as const,
              avatar: undefined
            }
          : {
              id: booking.barber_profiles?.user_id || '',
              name: booking.barber_profiles?.business_name || '',
              type: 'barber' as const,
              avatar: booking.barber_profiles?.profile_image_url || undefined
            };

        // Get last message and unread count
        const { data: lastMessage } = await supabase
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
                name: booking.barber_profiles?.business_name || '',
                type: 'barber'
              }
            : {
                id: booking.client_profiles?.user_id || '',
                name: `${booking.client_profiles?.first_name} ${booking.client_profiles?.last_name}`,
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
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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

      // Send notification to receiver if they have notifications enabled
      this.sendMessageNotification(bookingId, receiverId, sanitizedMessage, user.id);

      return message;

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
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
          callback(payload.new as Message);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(bookingId);
    };

    this.subscriptions.set(bookingId, unsubscribe);
    return unsubscribe;
  }

  private async sendMessageNotification(
    bookingId: string, 
    receiverId: string, 
    messageText: string, 
    senderId: string
  ): Promise<void> {
    try {
      // Get booking and user details for notification
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          services(name),
          barber_profiles(business_name, owner_name, user_id, phone, email, sms_consent, email_consent),
          client_profiles(first_name, last_name, user_id, phone, email, sms_consent, email_consent)
        `)
        .eq('id', bookingId)
        .single();

      if (!booking) return;

      const isFromBarber = senderId === booking.barber_profiles?.user_id;
      const receiverProfile = isFromBarber ? booking.client_profiles : booking.barber_profiles;
      const senderProfile = isFromBarber ? booking.barber_profiles : booking.client_profiles;

      if (!receiverProfile || !senderProfile) return;

      const senderName = isFromBarber 
        ? senderProfile.business_name 
        : `${senderProfile.first_name} ${senderProfile.last_name}`;

      const receiverName = isFromBarber
        ? `${receiverProfile.first_name} ${receiverProfile.last_name}`
        : receiverProfile.business_name;

      // Send SMS notification if user has SMS enabled
      if (receiverProfile.sms_consent && receiverProfile.phone) {
        const smsMessage = `💬 New message from ${senderName}:\n\n"${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}"\n\nReply in your Kutable dashboard.\n\n- Kutable`;
        
        await supabase.functions.invoke('send-sms', {
          body: {
            to: receiverProfile.phone,
            message: smsMessage,
            type: 'booking_update'
          }
        });
      }

      // Send email notification if user has email enabled
      if (receiverProfile.email_consent && receiverProfile.email) {
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

        await supabase.functions.invoke('send-email', {
          body: {
            to: receiverProfile.email,
            name: receiverName,
            subject: emailSubject,
            message: emailMessage,
            type: 'message_notification'
          }
        });
      }

    } catch (error) {
      console.error('Error sending message notification:', error);
      // Don't throw - message sending should succeed even if notification fails
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
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