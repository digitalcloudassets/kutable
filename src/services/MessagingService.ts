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
      console.warn('Supabase not connected - showing demo conversations');
      // Return demo conversations when Supabase is not connected
      return [
        {
          bookingId: 'demo-booking-1',
          participant: {
            id: 'demo-client-1',
            name: 'Pete Drake',
            type: 'client',
            avatar: undefined,
            needsClaim: true,
            hasValidProfile: false,
            isPlaceholder: true,
            canReceiveMessages: false
          },
          booking: {
            id: 'demo-booking-1',
            serviceName: 'Haircut',
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: '14:00',
            status: 'confirmed'
          },
          unreadCount: 1,
          lastMessage: {
            id: 'demo-message-1',
            booking_id: 'demo-booking-1',
            sender_id: 'demo-client-1',
            receiver_id: userId,
            message_text: 'Hi! I have a question about my haircut appointment.',
            read_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      ];
    }

    try {
      console.log('🔍 Loading conversations for user:', userId);
      
      // First, get user's barber profile if they have one
      const { data: barberProfile } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('👨‍💼 Barber profile check:', { hasBarberProfile: !!barberProfile, barberId: barberProfile?.id });
      // Get user's client profile if they have one
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('👤 Client profile check:', { hasClientProfile: !!clientProfile, clientId: clientProfile?.id });
      let allBookings: any[] = [];

      // Get bookings where user is a barber
      if (barberProfile) {
        console.log('📅 Fetching bookings for barber:', barberProfile.id);
        
        const { data: barberBookings, error: barberError } = await supabase
          .from('bookings')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            services(name),
            barber_profiles!inner(id, user_id, business_name, owner_name, profile_image_url),
            client_profiles(id, user_id, first_name, last_name, phone, email)
          `)
          .eq('barber_id', barberProfile.id)
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('appointment_date', { ascending: false });

        if (barberError) throw barberError;
        
        console.log(`📋 Found ${(barberBookings || []).length} barber bookings`);
        
        // Log each booking for debugging
        (barberBookings || []).forEach((booking, index) => {
          console.log(`📄 Booking ${index + 1}:`, {
            id: booking.id,
            clientName: booking.client_profiles ? `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}` : 'No client profile',
            clientUserId: booking.client_profiles?.user_id,
            serviceName: booking.services?.name,
            status: booking.status,
            date: booking.appointment_date
          });
        });

        // Keep ALL bookings with client profiles, even unclaimed ones
        const validBarberBookings = (barberBookings || []).filter(booking => {
          // Must have a client profile
          if (!booking.client_profiles) {
            console.warn('❌ Excluding booking without client profile:', booking.id);
            return false;
          }
          
          // Skip self-messaging (same user is both barber and client)
          if (booking.client_profiles.user_id === userId) {
            console.warn('❌ Excluding self-messaging booking:', booking.id);
            return false;
          }
          
          console.log('✅ Including booking:', {
            id: booking.id,
            clientName: `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}`,
            clientUserId: booking.client_profiles.user_id || 'UNCLAIMED',
            canMessage: !!booking.client_profiles.user_id
          });
          
          return true;
        });
        
        console.log(`✅ Valid barber bookings after filtering: ${validBarberBookings.length}`);
        
        allBookings.push(...validBarberBookings);
      }

      // Get bookings where user is a client
      if (clientProfile) {
        console.log('📅 Fetching bookings for client:', clientProfile.id);
        
        const { data: clientBookings, error: clientError } = await supabase
          .from('bookings')
          .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            services(name),
            barber_profiles!inner(id, user_id, business_name, owner_name, profile_image_url),
            client_profiles!inner(id, user_id, first_name, last_name)
          `)
          .eq('client_id', clientProfile.id)
          .in('status', ['pending', 'confirmed', 'completed'])
          .order('appointment_date', { ascending: false });

        if (clientError) throw clientError;
        
        console.log(`📋 Found ${(clientBookings || []).length} client bookings`);
        
        // Filter out self-messaging for client bookings too
        const validClientBookings = (clientBookings || []).filter(booking => {
          if (booking.barber_profiles?.user_id === userId) {
            console.warn('❌ Excluding self-messaging client booking:', booking.id);
            return false;
          }
          return true;
        });
        
        allBookings.push(...validClientBookings);
      }

      console.log(`📊 Total bookings found: ${allBookings.length}`);
      // Deduplicate bookings (in case user is both barber and client)
      const uniqueBookings = Array.from(
        new Map(allBookings.map(booking => [booking.id, booking])).values()
      );

      console.log(`📊 Unique bookings after deduplication: ${uniqueBookings.length}`);
      const conversations: Conversation[] = [];

      for (const booking of uniqueBookings) {
        const barberUserId = booking.barber_profiles?.user_id;
        const clientUserId = booking.client_profiles?.user_id;
        
        console.log(`🔍 Processing booking ${booking.id}:`, {
          barberUserId,
          clientUserId,
          currentUserId: userId,
          clientName: booking.client_profiles ? `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}` : 'No client'
        });
        
        // Determine user role in this booking
        const isUserBarber = barberUserId === userId;
        const isUserClient = clientUserId === userId;
        
        // Skip if user is both barber and client (self-messaging)
        if (isUserBarber && isUserClient) {
          console.warn('❌ Skipping self-messaging conversation:', {
            bookingId: booking.id,
            userId: userId,
            barberUserId,
            clientUserId
          });
          continue;
        }
        
        // User must be involved in this booking
        if (!isUserBarber && !isUserClient) {
          console.warn('❌ Skipping conversation - user not involved:', {
            bookingId: booking.id,
            userId: userId,
            barberUserId,
            clientUserId
          });
          continue;
        }
        
        // Determine the other participant
        const participant = isUserBarber 
          ? {
              id: clientUserId || `placeholder_client_${booking.id}`,
              name: clientUserId 
                ? `${booking.client_profiles?.first_name} ${booking.client_profiles?.last_name}`
                : `${booking.client_profiles?.first_name || 'Unknown'} ${booking.client_profiles?.last_name || 'Client'} (Unclaimed)`,
              type: 'client' as const,
              avatar: undefined,
              needsClaim: !clientUserId,
              hasValidProfile: !!clientUserId,
              isPlaceholder: !clientUserId,
              canReceiveMessages: !!clientUserId && clientUserId !== userId
            }
          : {
              id: barberUserId || `placeholder_${booking.id}`,
              name: barberUserId 
                ? booking.barber_profiles?.business_name || ''
                : 'Unclaimed Barber',
              type: 'barber' as const,
              avatar: booking.barber_profiles?.profile_image_url || undefined,
              needsClaim: !barberUserId,
              hasValidProfile: !!barberUserId,
              isPlaceholder: !barberUserId,
              canReceiveMessages: !!barberUserId && barberUserId !== userId
            };

        console.log(`✅ Creating conversation: ${participant.name} (${participant.type})`);
          .from('messages')
          .select('*')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count for current user
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

      console.log(`📊 Final conversations count: ${conversations.length}`);
      conversations.forEach((conv, index) => {
        console.log(`💬 Conversation ${index + 1}: ${conv.participant.name} (${conv.participant.type}) - ${conv.participant.needsClaim ? 'UNCLAIMED' : 'CLAIMED'}`);
      });
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
    if (!isSupabaseConnected()) {
      throw new Error('Messaging is not available - please connect to Supabase');
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Critical: Prevent self-messaging
      if (receiverId === user.id) {
        console.warn('Attempted self-messaging blocked:', {
          userId: user.id,
          receiverId,
          bookingId
        });
        throw new Error('This client has not set up messaging yet. You cannot message yourself.');
      }

      // Additional validation for empty or invalid receiver ID
      if (!receiverId || receiverId.trim() === '') {
        console.warn('Message blocked - invalid receiver ID:', {
          userId: user.id,
          receiverId,
          bookingId
        });
        throw new Error('This client has not activated messaging yet. They need to claim their account first.');
      }

      // Validate booking participants before sending
      const { data: bookingValidation, error: validationError } = await supabase
        .from('bookings')
        .select(`
          id,
          barber_profiles!inner(user_id, business_name),
          client_profiles!inner(user_id, first_name, last_name)
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (validationError || !bookingValidation) {
        console.error('Booking validation failed:', validationError);
        throw new Error('Invalid booking - cannot send message');
      }

      // Verify user is part of this booking
      const isBarber = bookingValidation.barber_profiles.user_id === user.id;
      const isClient = bookingValidation.client_profiles.user_id === user.id;
      
      if (!isBarber && !isClient) {
        console.warn('User not part of booking:', {
          userId: user.id,
          bookingId,
          barberUserId: bookingValidation.barber_profiles.user_id,
          clientUserId: bookingValidation.client_profiles.user_id
        });
        throw new Error('You are not authorized to send messages for this booking');
      }

      // Verify receiver is the other participant
      const expectedReceiverId = isBarber 
        ? bookingValidation.client_profiles.user_id 
        : bookingValidation.barber_profiles.user_id;
      
      if (receiverId !== expectedReceiverId) {
        console.warn('Receiver ID mismatch:', {
          providedReceiverId: receiverId,
          expectedReceiverId,
          isBarber,
          bookingId
        });
        throw new Error('Invalid message recipient for this booking');
      }

      // Final check: ensure sender and receiver are different
      if (user.id === expectedReceiverId) {
        console.error('Critical: Booking has invalid participant setup - same user as barber and client:', {
          bookingId,
          userId: user.id,
          barberUserId: bookingValidation.barber_profiles.user_id,
          clientUserId: bookingValidation.client_profiles.user_id
        });
        throw new Error('This booking has invalid participant setup. Please contact support to resolve this issue.');
      }
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
      console.log('Sending message notification:', { bookingId, receiverId, senderId, messagePreview: messageText.slice(0, 50) });
      
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
        console.error('Booking not found for notification:', bookingId);
        return; // Exit silently - don't throw error for notifications
      }

      console.log('Booking data for notification:', {
        barberUserId: booking.barber_profiles?.user_id,
        clientUserId: booking.client_profiles?.user_id,
        barberPhone: booking.barber_profiles?.phone,
        clientPhone: booking.client_profiles?.phone,
        senderId,
        receiverId
      });

      // Enhanced validation for profile completeness
      if (!booking.barber_profiles || !booking.client_profiles) {
        console.warn('Notification not sent: missing barber or client profile data.', { 
          bookingId, 
          hasBarberProfile: !!booking.barber_profiles,
          hasClientProfile: !!booking.client_profiles 
        });
        return; // Exit silently - message still saved
      }

      // Check if profiles have user_id (claimed status)
      if (!booking.barber_profiles.user_id) {
        console.warn('Notification not sent: barber profile not claimed or missing user_id.', { 
          bookingId, 
          barberId: booking.barber_profiles.business_name,
          barberUserId: booking.barber_profiles.user_id 
        });
        return; // Exit silently
      }

      if (!booking.client_profiles.user_id) {
        console.warn('Notification not sent: client profile not claimed or missing user_id. Message saved but no notification sent.', { 
          bookingId, 
          clientName: `${booking.client_profiles.first_name} ${booking.client_profiles.last_name}`,
          clientUserId: booking.client_profiles.user_id 
        });
        return; // Exit silently
      }
        const isFromBarber = senderId === booking.barber_profiles?.user_id;
        console.log('Message direction:', isFromBarber ? 'Barber → Client' : 'Client → Barber');
        
        const receiverProfile = isFromBarber ? booking.client_profiles : booking.barber_profiles;
        const senderProfile = isFromBarber ? booking.barber_profiles : booking.client_profiles;

        // Additional safety checks for profile data integrity
        if (!receiverProfile?.user_id || !senderProfile?.user_id) {
          console.warn('Notification not sent: incomplete profile data or unclaimed profiles.', { 
            bookingId, 
            receiverUserId: receiverProfile?.user_id, 
            senderUserId: senderProfile?.user_id,
            isFromBarber,
            direction: isFromBarber ? 'Barber → Client' : 'Client → Barber'
          });
          return; // Exit silently - message still saved
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
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              to: receiverProfile.phone,
              message: smsMessage,
              type: 'booking_update'
            }
          });
          
          if (smsError) {
            console.error('Failed to send SMS notification to', receiverProfile.phone, ':', smsError);
          } else if (smsResult?.success) {
            console.log('✅ SMS notification sent successfully to:', receiverProfile.phone);
          } else {
            console.error('SMS failed with result:', smsResult);
          }
        } else {
          console.warn('SMS notification skipped:', {
            reason: !receiverProfile.phone ? 'No phone number' : 'SMS consent disabled',
            receiverPhone: receiverProfile.phone,
            smsConsent: receiverProfile.sms_consent
          });
        }

        // Send email notification if user has email enabled (default to true for essential notifications)
        const shouldSendEmail = (receiverProfile.email_consent !== false) && !!receiverProfile.email;
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
            console.error('Failed to send email notification to', receiverProfile.email, ':', emailError);
          } else if (emailResult?.success) {
            console.log('✅ Email notification sent successfully to:', receiverProfile.email);
          } else {
            console.error('Email failed with result:', emailResult);
          }
        } else {
          console.warn('Email notification skipped:', {
            reason: !receiverProfile.email ? 'No email address' : 'Email consent disabled',
            receiverEmail: receiverProfile.email,
            emailConsent: receiverProfile.email_consent
          });
        }

    } catch (error) {
      console.error('Error sending message notification:', error);
      // Log the error but don't throw - message sending should succeed even if notification fails
      console.warn('Message notification failed but message was still saved successfully:', {
        bookingId,
        receiverId,
        senderId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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