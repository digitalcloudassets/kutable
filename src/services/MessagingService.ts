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
    id: string | null;
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

    // Guard against undefined userId
    if (!userId) {
      console.warn('getUserConversations called with undefined userId');
      return [];
    }
    
    try {
      console.log('Loading conversations for user:', userId);
      
      // NEW: Single query approach using RLS to get all accessible bookings
      // The RLS policies will automatically filter based on user participation
      const { data: accessibleBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          barber_id,
          client_id,
          appointment_date,
          appointment_time,
          status,
          service_id,
          barber_profiles!inner (
            id,
            user_id,
            business_name,
            owner_name,
            profile_image_url,
            email
          ),
          client_profiles!inner (
            id,
            user_id,
            first_name,
            last_name,
            profile_image_url,
            email
          ),
          services!inner (
            name
          )
        `)
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('appointment_date', { ascending: false });

      if (bookingsError) {
        console.error('Error fetching accessible bookings:', bookingsError);
        return [];
      }

      console.log('Found accessible bookings:', accessibleBookings?.length || 0);
      if (accessibleBookings) {
        console.log('Booking details:', accessibleBookings.map(b => ({
          id: b.id,
          barberUserId: b.barber_profiles?.user_id,
          clientUserId: b.client_profiles?.user_id,
          currentUserId: userId
        })));
      }
      const conversations: Conversation[] = [];

      for (const booking of accessibleBookings || []) {
        // Determine if current user is the barber or client
        const isBarber = booking.barber_profiles?.user_id === userId;
        const isClient = booking.client_profiles?.user_id === userId;
        
        console.log('Processing booking:', {
          bookingId: booking.id,
          isBarber,
          isClient,
          barberUserId: booking.barber_profiles?.user_id,
          clientUserId: booking.client_profiles?.user_id,
          currentUserId: userId
        });
        
        // Build the other chat participant (the person opposite the authed user)
        const participant = isClient
          ? {
              // client is viewing → show the barber as the participant
              id: booking.barber_profiles?.user_id || null,
              name: booking.barber_profiles?.business_name || 'Barber',
              type: 'barber' as const,
              avatar: booking.barber_profiles?.profile_image_url || undefined
            }
          : isBarber
          ? {
              // barber is viewing → show the client as the participant
              id: booking.client_profiles?.user_id || null,
              name: `${booking.client_profiles?.first_name || ''} ${booking.client_profiles?.last_name || ''}`.trim() || 'Client',
              type: 'client' as const,
              avatar: booking.client_profiles?.profile_image_url || undefined
            }
          : null;

        if (!participant) {
          console.log('Skipping booking - user is neither barber nor client');
          continue;
        }

        console.log('Participant for booking:', {
          bookingId: booking.id,
          participantId: participant.id,
          participantName: participant.name,
          participantType: participant.type
        });

        // Get last message for this booking using the new index
        const { data: lastMessage, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (messageError) {
          console.error('Error fetching last message for booking:', booking.id, messageError);
        }

        console.log('Last message for booking:', {
          bookingId: booking.id,
          hasMessage: !!lastMessage,
          messageText: lastMessage?.message_text?.slice(0, 50)
        });

        // Get unread count for this user
        const { count: unreadCount, error: unreadError } = await supabase
          .from('messages')
          .select('*', { count: 'exact' })
          .eq('booking_id', booking.id)
          .eq('receiver_id', userId)
          .is('read_at', null);

        if (unreadError) {
          console.error('Error fetching unread count for booking:', booking.id, unreadError);
        }

        console.log('Unread count for booking:', {
          bookingId: booking.id,
          unreadCount: unreadCount || 0
        });

        const conversation: Conversation = {
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
        };

        conversations.push(conversation);
        console.log('Added conversation:', {
          bookingId: conversation.bookingId,
          participantName: conversation.participant.name,
          hasLastMessage: !!conversation.lastMessage,
          unreadCount: conversation.unreadCount
        });
      }
      
      console.log('Final conversations count:', conversations.length);
      
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

  async getMessagesForBooking(bookingId: string): Promise<Message[]> {
    if (!isSupabaseConnected()) {
      return [];
    }

    if (!bookingId || bookingId.length < 10) {
      throw new Error('Invalid bookingId');
    }

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, booking_id, sender_id, receiver_id, message_text, created_at, read_at')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (messages || []) as Message[];
    } catch (error) {
      throw error;
    }
  }


  async sendMessage({ bookingId, receiverId, messageText }: SendMessageRequest): Promise<Message> {
    if (!isSupabaseConnected()) {
      throw new Error('Messaging is not available - please connect to Supabase');
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

  subscribeToBookingMessages(bookingId: string, onInsert: (message: Message) => void): () => void {
    if (!isSupabaseConnected()) {
      return () => {};
    }

    console.log('Subscribing to realtime messages for booking:', bookingId);

    const channel = supabase
      .channel(`messages:booking:${bookingId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `booking_id=eq.${bookingId}` 
        },
        (payload) => {
          console.log('Realtime message received:', payload.new);
          const newMessage = payload.new as Message;
          onInsert(newMessage);
        }
      )
      .subscribe();

    console.log('Realtime subscription created for booking:', bookingId, 'Channel:', `messages:booking:${bookingId}`);

    const unsubscribe = () => {
      console.log('Unsubscribing from realtime messages for booking:', bookingId);
      supabase.removeChannel(channel);
    };

    return unsubscribe;
  }

  subscribeToMessages(bookingId: string, callback: (message: Message) => void): () => void {
    if (!isSupabaseConnected()) {
      // Return a no-op unsubscribe function
      return () => {};
    }

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
          barber_profiles(business_name, owner_name, user_id, phone, email, sms_consent, email_consent, communication_consent),
          client_profiles(first_name, last_name, user_id, phone, email, sms_consent, email_consent, communication_consent)
        `)
        .eq('id', bookingId)
        .single();

      if (!booking) {
        return;
      }
      

      const isFromBarber = senderId === booking.barber_profiles?.user_id;
      
      const receiverProfile = isFromBarber ? booking.client_profiles : booking.barber_profiles;
      const senderProfile = isFromBarber ? booking.barber_profiles : booking.client_profiles;

      if (!receiverProfile || !senderProfile) {
        return;
      }

      const senderName = isFromBarber 
        ? senderProfile.business_name 
        : `${senderProfile.first_name} ${senderProfile.last_name}`;

      const receiverName = isFromBarber
        ? `${receiverProfile.first_name} ${receiverProfile.last_name}`
        : receiverProfile.business_name;

      // Send SMS notification if user has SMS enabled (default to true for essential notifications)
      const shouldSendSMS = (receiverProfile.sms_consent !== false) && !!receiverProfile.phone;
      
      if (shouldSendSMS) {
        const smsMessage = `💬 New message from ${senderName}:\n\n"${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}"\n\nReply in your Kutable dashboard.\n\n- Kutable`;
        
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            to: receiverProfile.phone,
            message: smsMessage,
            type: 'booking_update'
          }
        });
        
        console.log('SMS notification result:', { smsResult, smsError });
      }

      // Send email notification if user has email enabled (default to true for essential notifications)
      const shouldSendEmail = (receiverProfile.email_consent !== false) && !!receiverProfile.email;
      
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

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: receiverProfile.email,
            name: receiverName,
            subject: emailSubject,
            message: emailMessage,
            type: 'message_notification'
          }
        });
        
        console.log('Email notification result:', { emailResult, emailError });
      }

    } catch (error) {
      console.error('Error sending message notification:', error);
      // Don't throw - message sending should succeed even if notification fails
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    if (!isSupabaseConnected()) {
      return 0;
    }

    // Guard against undefined userId
    if (!userId) {
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