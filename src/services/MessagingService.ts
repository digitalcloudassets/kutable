/* src/services/MessagingService.ts
   Messaging service with profile-aware conversations (barber_profile.id → user_id)
   Preserves public API and types; removes duplicate methods; fixes class scope.
*/

import { supabase } from '../lib/supabase';
// If you use Database types elsewhere, keep this export available:
export type { Database } from '../lib/supabase';

// --- Helpers ---
const isSupabaseConnected = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return (
    !!url &&
    !!key &&
    url.startsWith('https://') &&
    url.includes('.supabase.co') &&
    !url.includes('placeholder') &&
    key !== 'your_supabase_anon_key_here'
  );
};

// --- Types consumed by UI ---
export type Conversation = {
  bookingId: string;
  participant: {
    id: string; // ALWAYS auth user id (receiver_id when sending)
    name: string;
    avatar?: string | null;
    type: 'barber' | 'client';
  };
  booking: {
    id: string;
    serviceName: string;
    appointmentDate: string; // ISO
    appointmentTime: string; // display
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

// Back-compat
export type Message = ThreadMessage;

export type SendMessageRequest = {
  bookingId: string;
  receiverId: string;
  messageText: string;
};

export class MessagingService {
  private static instance: MessagingService;
  private subscriptions: Map<string, () => void> = new Map();

  static getInstance(): MessagingService {
    if (!MessagingService.instance) {
      MessagingService.instance = new MessagingService();
    }
    return MessagingService.instance;
  }

  // ========== Conversations (profile-aware) ==========
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (!isSupabaseConnected() || !userId) return [];

    try {
      // Is the current user a barber? (fetch their barber_profile)
      const { data: myBarberProfile, error: bpErr } = await supabase
        .from('barber_profiles')
        .select('id, user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (bpErr) throw bpErr;

      // Build bookings query:
      // - If barber: bookings where barber_id == my barber_profile.id OR I'm the client
      // - If client only: bookings where client_id == my userId
      let bq = supabase
        .from('bookings')
        .select(
          'id, client_id, barber_id, status, appointment_date, appointment_time, service_id, created_at'
        )
        .order('created_at', { ascending: false });

      if (myBarberProfile?.id) {
        bq = bq.or(`client_id.eq.${userId},barber_id.eq.${myBarberProfile.id}`);
      } else {
        bq = bq.eq('client_id', userId);
      }

      const { data: bookings, error: bErr } = await bq;
      if (bErr) throw bErr;
      if (!bookings?.length) return [];

      const bookingIds = bookings.map((b) => b.id);

      // Fetch participants
      const [{ data: clientProfiles, error: cErr }, { data: barberProfiles, error: bbErr }] =
        await Promise.all([
          supabase
            .from('client_profiles')
            .select('user_id, first_name, last_name, profile_image_url'),
          supabase
            .from('barber_profiles')
            .select('id, user_id, business_name, profile_image_url'),
        ]);
      if (cErr) throw cErr;
      if (bbErr) throw bbErr;

      const clientByUserId = new Map((clientProfiles ?? []).map((p) => [p.user_id, p]));
      const barberByProfileId = new Map((barberProfiles ?? []).map((p) => [p.id, p]));

      // Fetch last messages and unread counts
      const [{ data: msgs, error: mErr }, { data: unread, error: uErr }] = await Promise.all([
        supabase
          .from('messages')
          .select('id, booking_id, message_text, created_at, sender_id, receiver_id')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('booking_id')
          .eq('receiver_id', userId)
          .is('read_at', null)
          .in('booking_id', bookingIds),
      ]);
      if (mErr) throw mErr;
      if (uErr) throw uErr;

      const lastByBooking = new Map<string, Conversation['lastMessage']>();
      for (const m of msgs ?? []) {
        if (!lastByBooking.has(m.booking_id)) {
          lastByBooking.set(m.booking_id, {
            id: m.id,
            message_text: m.message_text,
            created_at: m.created_at,
          });
        }
      }

      const unreadByBooking = new Map<string, number>();
      for (const r of unread ?? []) {
        unreadByBooking.set(r.booking_id, (unreadByBooking.get(r.booking_id) ?? 0) + 1);
      }

      // Map bookings → conversations
      const conversations: Conversation[] = (bookings ?? []).map((b) => {
        const iAmBarber = !!myBarberProfile?.id && b.barber_id === myBarberProfile.id;

        const otherAuthId = iAmBarber
          ? b.client_id // client_id stores the client's auth user id
          : (barberByProfileId.get(b.barber_id)?.user_id ?? ''); // map barber_profile.id → auth user id

        let name = 'Unknown';
        let avatar: string | null | undefined = null;
        const type: 'barber' | 'client' = iAmBarber ? 'client' : 'barber';

        if (type === 'client') {
          const cp = clientByUserId.get(otherAuthId);
          name = cp ? [cp.first_name, cp.last_name].filter(Boolean).join(' ') || 'Client' : 'Client';
          avatar = cp?.profile_image_url ?? null;
        } else {
          const bp = barberByProfileId.get(b.barber_id);
          name = bp?.business_name || 'Barber';
          avatar = bp?.profile_image_url ?? null;
        }

        return {
          bookingId: b.id,
          participant: { id: otherAuthId, type, name, avatar },
          booking: {
            id: b.id,
            serviceName: String(b.service_id ?? 'Service'),
            appointmentDate: String(b.appointment_date),
            appointmentTime: String(b.appointment_time),
            status: String(b.status),
          },
          lastMessage: lastByBooking.get(b.id),
          unreadCount: unreadByBooking.get(b.id) ?? 0,
        };
      });

      // Sort newest activity first
      conversations.sort((a, b) => {
        const ta = a.lastMessage?.created_at ?? '1970-01-01';
        const tb = b.lastMessage?.created_at ?? '1970-01-01';
        return tb.localeCompare(ta);
      });

      console.log('[getUserConversations]', { userId, count: conversations.length, sample: conversations.slice(0, 2) });
      return conversations;
    } catch (e) {
      console.error('Error fetching conversations:', e);
      return [];
    }
  }

  // No-op for backwards compatibility with useMessaging hook
  async enrichConversationsWithMessages(
    conversations: Conversation[],
    _userId: string
  ): Promise<Conversation[]> {
    // getUserConversations already returns lastMessage + unreadCount
    return conversations;
  }

  // ========== Threads ==========
  async getThread(bookingId: string): Promise<ThreadMessage[]> {
    if (!isSupabaseConnected()) return [];
    if (!bookingId || bookingId.length < 10) throw new Error('Invalid bookingId');

    const { data, error } = await supabase
      .from('messages')
      .select('id, booking_id, sender_id, receiver_id, message_text, created_at, read_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ThreadMessage[];
  }

  async getMessagesForBooking(bookingId: string): Promise<ThreadMessage[]> {
    return this.getThread(bookingId);
  }

  // ========== Send / Read ==========
  async sendMessage({ bookingId, receiverId, messageText }: SendMessageRequest): Promise<ThreadMessage> {
    if (!isSupabaseConnected()) throw new Error('Messaging is not available - please connect to Supabase');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const sanitized = messageText.trim().replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').slice(0, 1000);
    if (!sanitized) throw new Error('Message must be between 1 and 1000 characters');

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        receiver_id: receiverId,
        message_text: sanitized,
      })
      .select()
      .single();

    if (error) throw error;
    return message as ThreadMessage;
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    if (!isSupabaseConnected()) return;
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('receiver_id', userId);
    if (error) throw error;
  }

  async markConversationAsRead(bookingId: string, userId: string): Promise<void> {
    await this.markThreadRead(bookingId, userId);
  }

  async markThreadRead(bookingId: string, userId: string): Promise<void> {
    if (!isSupabaseConnected()) return;
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .eq('receiver_id', userId)
      .is('read_at', null);
    if (error) throw error;
  }

  // ========== Realtime ==========
  subscribeToThread(
    bookingId: string,
    onEvent: (evt: { type: 'INSERT' | 'UPDATE'; new: ThreadMessage }) => void
  ): () => void {
    if (!isSupabaseConnected()) return () => {};

    const channel = supabase
      .channel(`messages:booking:${bookingId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') onEvent({ type: 'INSERT', new: payload.new as ThreadMessage });
          if (payload.eventType === 'UPDATE') onEvent({ type: 'UPDATE', new: payload.new as ThreadMessage });
        }
      )
      .subscribe();

    const unsubscribe = () => {
      try { supabase.removeChannel(channel); } catch {}
    };

    // track to cleanup
    this.subscriptions.set(bookingId, unsubscribe);
    return unsubscribe;
  }

  subscribeToBookingMessages(bookingId: string, onInsert: (message: ThreadMessage) => void): () => void {
    return this.subscribeToThread(bookingId, (evt) => {
      if (evt.type === 'INSERT') onInsert(evt.new);
    });
  }

  applyRealtime(prev: ThreadMessage[], evt: { type: 'INSERT' | 'UPDATE'; new: ThreadMessage }): ThreadMessage[] {
    if (evt.type === 'INSERT') {
      if (prev.some((m) => m.id === evt.new.id)) return prev;
      return [...prev, evt.new];
    }
    if (evt.type === 'UPDATE') {
      return prev.map((m) => (m.id === evt.new.id ? evt.new : m));
    }
    return prev;
  }

  // ========== Badges / Cleanup ==========
  async getUnreadMessageCount(userId: string): Promise<number> {
    if (!isSupabaseConnected() || !userId) return 0;
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('receiver_id', userId)
      .is('read_at', null);
    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
    return count || 0;
  }

  cleanup(): void {
    this.subscriptions.forEach((off) => {
      try { off(); } catch {}
    });
    this.subscriptions.clear();
  }
}

export const messagingService = MessagingService.getInstance();