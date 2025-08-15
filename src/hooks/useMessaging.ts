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
    if (!user) return;

    try {
      setLoading(true);
      const conversationData = await messagingService.getUserConversations(user.id);
      setConversations(conversationData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const count = await messagingService.getUnreadMessageCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
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
    if (!user) return;

    try {
      await messagingService.markConversationAsRead(bookingId, user.id);
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