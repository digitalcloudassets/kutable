import { useState, useEffect, useCallback } from 'react';
import { messagingService, Conversation, Message } from '../services/MessagingService';
import { useAuth } from './useAuth';
import { useSupabaseConnection } from './useSupabaseConnection';

export const useMessaging = () => {
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isConnected) {
      loadConversations();
      loadUnreadCount();
    } else {
      // Clear data and stop loading when connection is not established
      setConversations([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user, isConnected]);

  const loadConversations = useCallback(async () => {
    const uid = user?.id ?? null;
    if (!uid) {
      setConversations([]);
      return;
    }

    try {
      setLoading(true);
      console.log('useMessaging: Loading conversations for user:', uid);
      let conversationData = await messagingService.getUserConversations(uid);
      
      // Enrich with message data
      conversationData = await messagingService.enrichConversationsWithMessages(conversationData, uid);
      
      console.log('useMessaging: Loaded conversations:', conversationData.length);
      setConversations(conversationData);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    const uid = user?.id ?? null;
    if (!uid) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await messagingService.getUnreadMessageCount(uid);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  }, [user]);

  const sendMessage = useCallback(async (
    bookingId: string, 
    receiverId: string, 
    messageText: string
  ): Promise<Message> => {
    try {
      const message = await messagingService.sendMessage({
        bookingId,
        receiverId,
        messageText
      });

      // Refresh conversations to update last message
      await loadConversations();
      // Also refresh unread count since sending a message means you've seen the conversation
      await loadUnreadCount();
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [loadConversations]);

  const markConversationAsRead = useCallback(async (bookingId: string) => {
    const uid = user?.id ?? null;
    if (!uid) return;

    try {
      await messagingService.markConversationAsRead(bookingId, uid);
      await loadUnreadCount();
      await loadConversations();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user, loadUnreadCount, loadConversations]);

  return {
    conversations,
    unreadCount,
    loading,
    sendMessage,
    markConversationAsRead,
    refreshConversations: loadConversations,
    refreshUnreadCount: loadUnreadCount
  };
};