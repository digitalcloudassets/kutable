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

// --- Types consumed by UI ---
export type Conversation = {
  bookingId: string;
  participant: {
    id: string;
    name: string;
    avatar?: string | null;
    type: 'barber' | 'client';
  };
  booking: {
    id: string;
    serviceName: string;
    appointmentDate: string; // ISO
    appointmentTime: string; // display string
    status: string;
  };
  lastMessage?: {
    id: string;
    message_text: string;
    created_at: string;
  };
  unreadCount: number;
};

export type ThreadMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  created_at: string;
  read_at: string | null;
};

// Legacy Message type for compatibility
export type Message = ThreadMessage;

export type SendMessageRequest = {
  bookingId: string;
  receiverId: string;
  messageText: string;
};

export class MessagingService {
  private static instance: MessagingService;
  private subscriptions: Map<string, any> = new Map();

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  // --- Load conversations: booking_id as thread key, null-safe ---
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (!isSupabaseConnected() || !userId) {
      return [];
    }

    try {
      console.log('Loading conversations for user:', userId);
      
      // Query bookings where user is either the barber or client
      const { data: rows, error } = await supabase
        .from('bookings')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          barber_profiles!inner(
            user_id,
            business_name,
            owner_name,
            profile_image_url
          ),
          client_profiles!inner(
            user_id,
            first_name,
            last_name,
            profile_image_url
          ),
          services!inner(
            name
          )
        `)
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }

      console.log('Found bookings via RLS:', rows?.length || 0);
      
      if (rows && rows.length > 0) {
        console.log('Booking details:', rows.map(b => ({
          id: b.id,
          barberUserId: b.barber_profiles?.user_id,
          clientUserId: b.client_profiles?.user_id,
          currentUserId: userId,
          isBarberMatch: b.barber_profiles?.user_id === userId,
          isClientMatch: b.client_profiles?.user_id === userId
        })));
      }

      return (rows ?? []).map((booking: any) => {
        const isBarberView = booking.barber_profiles?.user_id === userId;
        
        // Build the other chat participant (the person opposite the authed user)
        const participant = isBarberView
          ? {
              // barber viewing → show client as participant
              id: booking.client_profiles?.user_id ?? '',
              name: `${booking.client_profiles?.first_name ?? ''} ${booking.client_profiles?.last_name ?? ''}`.trim() || 'Client',
              avatar: booking.client_profiles?.profile_image_url ?? null,
              type: 'client' as const,
            }
          : {
              // client viewing → show barber as participant  
              id: booking.barber_profiles?.user_id ?? '',
              name: booking.barber_profiles?.business_name ?? 'Barber',
              avatar: booking.barber_profiles?.profile_image_url ?? null,
              type: 'barber' as const,
            };

        // For now, set lastMessage and unreadCount to defaults
        // These can be fetched separately for better performance
        const conversation: Conversation = {
          bookingId: booking.id,
          participant,
          booking: {
            id: booking.id,
            serviceName: booking.services?.name ?? 'Service',
            appointmentDate: booking.appointment_date,
            appointmentTime: booking.appointment_time,
            status: booking.status,
          },
          lastMessage: undefined, // Will be fetched separately if needed
          unreadCount: 0, // Will be fetched separately if needed
        };

        return conversation;
      }).filter(c => c.participant.id); // Filter out conversations with missing participant IDs
      
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // --- Load last messages and unread counts for conversations ---
  async enrichConversationsWithMessages(conversations: Conversation[], userId: string): Promise<Conversation[]> {
    if (!isSupabaseConnected() || conversations.length === 0) {
      return conversations;
    }

    try {
      // Get booking IDs
      const bookingIds = conversations.map(c => c.bookingId);
      
      // Fetch last message for each booking
      const { data: lastMessages, error: messagesError } = await supabase
        .from('messages')
        .select('booking_id, id, message_text, created_at')
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching last messages:', messagesError);
      }

      // Get unread counts
      const { data: unreadCounts, error: unreadError } = await supabase
        .from('messages')
        .select('booking_id')
        .in('booking_id', bookingIds)
        .eq('receiver_id', userId)
        .is('read_at', null);

      if (unreadError) {
        console.error('Error fetching unread counts:', unreadError);
      }

      // Build lookup maps
      const lastMessageMap = new Map();
      const unreadCountMap = new Map();

      // Group last messages by booking_id
      if (lastMessages) {
        for (const msg of lastMessages) {
          if (!lastMessageMap.has(msg.booking_id)) {
            lastMessageMap.set(msg.booking_id, {
              id: msg.id,
              message_text: msg.message_text,
              created_at: msg.created_at
            });
          }
        }
      }

      // Count unread messages by booking_id
      if (unreadCounts) {
        for (const msg of unreadCounts) {
          unreadCountMap.set(msg.booking_id, (unreadCountMap.get(msg.booking_id) || 0) + 1);
        }
      }

      // Enrich conversations with message data
      return conversations.map(conversation => ({
        ...conversation,
        lastMessage: lastMessageMap.get(conversation.bookingId),
        unreadCount: unreadCountMap.get(conversation.bookingId) || 0
      })).sort((a, b) => {
        // Sort by last message time, then by appointment date
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

  // --- Thread API (unchanged signatures) ---
  async getMessagesForBooking(bookingId: string): Promise<ThreadMessage[]> {
    if (!isSupabaseConnected()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ThreadMessage[];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async getThread(bookingId: string, _userId: string): Promise<ThreadMessage[]> {
    return this.getMessagesForBooking(bookingId);
  }

  async sendMessage({ bookingId, receiverId, messageText }: {
    bookingId: string;
    receiverId: string;
    messageText: string;
  }): Promise<ThreadMessage> {
    if (!isSupabaseConnected()) {
      throw new Error('Messaging is not available - please connect to Supabase');
    }

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
      return message as ThreadMessage;

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
    await this.markThreadRead(bookingId, userId);
  }

  async markThreadRead(bookingId: string, userId: string): Promise<void> {
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

  // --- Realtime (stable channel name + safe unsubscribe) ---
  subscribeToThread(
    bookingId: string,
    onEvent: (evt: { type: 'INSERT' | 'UPDATE'; new: ThreadMessage }) => void
  ) {
    if (!isSupabaseConnected()) {
      return () => {};
    }

    const ch = supabase
      .channel(`messages:booking:${bookingId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') onEvent({ type: 'INSERT', new: payload.new as ThreadMessage });
          if (payload.eventType === 'UPDATE') onEvent({ type: 'UPDATE', new: payload.new as ThreadMessage });
        }
      )
      .subscribe();

    return () => { 
      try { 
        supabase.removeChannel(ch); 
      } catch (e) {
        console.warn('Error unsubscribing from messages channel:', e);
      }
    };
  }

  subscribeToBookingMessages(bookingId: string, onInsert: (message: ThreadMessage) => void): () => void {
    return this.subscribeToThread(bookingId, (evt) => {
      if (evt.type === 'INSERT') {
        onInsert(evt.new);
      }
    });
  }

  applyRealtime(prev: ThreadMessage[], evt: { type: 'INSERT' | 'UPDATE'; new: ThreadMessage }): ThreadMessage[] {
    if (evt.type === 'INSERT') {
      if (prev.some(m => m.id === evt.new.id)) return prev;
      return [...prev, evt.new];
    }
    if (evt.type === 'UPDATE') {
      return prev.map(m => (m.id === evt.new.id ? evt.new : m));
    }
    return prev;
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