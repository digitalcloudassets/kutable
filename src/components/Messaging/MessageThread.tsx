import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Building, 
  Calendar, 
  Clock, 
  MapPin,
  Loader,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { messagingService, Message, Conversation } from '../../services/MessagingService';
import { useAuth } from '../../hooks/useAuth';
import { useMessaging } from '../../hooks/useMessaging';

interface MessageThreadProps {
  conversation: Conversation;
  onBack?: () => void;
}

const MessageThread: React.FC<MessageThreadProps> = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const { refreshUnreadCount, refreshConversations } = useMessaging();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeMessaging = async () => {
      if (conversation && user) {
        loadMessages();
        markAsRead();
        // Refresh unread count and conversations when viewing thread
        if (refreshUnreadCount) {
          await refreshUnreadCount();
        }
        
        // Subscribe to real-time updates
        const unsubscribe = messagingService.subscribeToMessages(
          conversation.bookingId,
          (newMessage) => {
            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
            
            // Mark as read if it's for us
            if (newMessage.receiver_id === user.id) {
              setTimeout(() => {
                messagingService.markAsRead(newMessage.id, user.id);
                // Refresh unread count after marking as read
                if (refreshUnreadCount) {
                  refreshUnreadCount();
                }
              }, 1000);
            }
          }
        );

        return unsubscribe;
      }
    };

    let unsubscribe: (() => void) | undefined;
    
    initializeMessaging().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [conversation, user, refreshUnreadCount]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!user || !conversation) return;

    try {
      setLoading(true);
      const messageData = await messagingService.getMessagesForBooking(
        conversation.bookingId, 
        user.id
      );
      setMessages(messageData);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!user || !conversation) return;
    
    try {
      await messagingService.markConversationAsRead(conversation.bookingId, user.id);
      // Refresh unread count after marking as read
      if (refreshUnreadCount) {
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !user) return;

    // Check if participant has a valid user ID
    if (!conversation.participant.id) {
      setError('Cannot send message to unclaimed profile. This barber needs to claim their profile first.');
      return;
    }
    setSending(true);
    setError('');

    try {
      console.log('Sending message from user:', user.id, 'to participant:', conversation.participant.id);
      
      const message = await messagingService.sendMessage({
        bookingId: conversation.bookingId,
        receiverId: conversation.participant.id,
        messageText: newMessage.trim()
      });

      setMessages(prev => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
      
      // Mark conversation as read since user is actively participating
      await messagingService.markConversationAsRead(conversation.bookingId, user.id);
      
      // Refresh conversations and unread count
      if (refreshConversations) {
        await refreshConversations();
      }
      if (refreshUnreadCount) {
        await refreshUnreadCount();
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 opacity-20 blur-lg"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 rounded-t-2xl">
        <div className="flex items-center space-x-3">
          {conversation.participant.avatar ? (
            <img
              src={conversation.participant.avatar}
              alt={conversation.participant.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              conversation.participant.type === 'barber' 
                ? 'bg-primary-100' 
                : 'bg-accent-100'
            }`}>
              {conversation.participant.type === 'barber' ? (
                <Building className="h-6 w-6 text-primary-600" />
              ) : (
                <User className="h-6 w-6 text-accent-600" />
              )}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {conversation.participant.name}
            </h3>
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{conversation.booking.serviceName}</span>
              <span>•</span>
              <span>{formatAppointmentDate(conversation.booking.appointmentDate)} at {conversation.booking.appointmentTime}</span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            conversation.booking.status === 'confirmed' 
              ? 'bg-green-100 text-green-800'
              : conversation.booking.status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {conversation.booking.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h4>
            <p className="text-gray-600">
              Send a message to {conversation.participant.type === 'barber' ? 'your barber' : 'your customer'} about your upcoming appointment.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isFromMe = message.sender_id === user?.id;
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
            
            return (
              <div
                key={message.id}
                className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} ${
                  showAvatar ? 'mb-4' : 'mb-1'
                }`}
              >
                <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${
                  isFromMe ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}>
                  {/* Avatar */}
                  {showAvatar && !isFromMe && (
                    <div className="flex-shrink-0">
                      {conversation.participant.avatar ? (
                        <img
                          src={conversation.participant.avatar}
                          alt={conversation.participant.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          conversation.participant.type === 'barber' 
                            ? 'bg-primary-100' 
                            : 'bg-accent-100'
                        }`}>
                          {conversation.participant.type === 'barber' ? (
                            <Building className="h-4 w-4 text-primary-600" />
                          ) : (
                            <User className="h-4 w-4 text-accent-600" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      isFromMe
                        ? 'bg-primary-500 text-white rounded-br-md'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.message_text}
                    </p>
                    <p className={`text-xs mt-1 ${
                      isFromMe ? 'text-primary-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.created_at)}
                      {isFromMe && message.read_at && (
                        <span className="ml-1">• Read</span>
                      )}
                    </p>
                  </div>

                  {/* Spacer for messages from me without avatar */}
                  {showAvatar && isFromMe && <div className="w-8"></div>}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl">
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          {!conversation.participant.id && conversation.participant.type === 'barber' ? (
            <div className="flex-1 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>
                This barber profile hasn't been claimed yet. Messages can only be sent to claimed profiles.
              </span>
            </div>
          ) : (
            <>
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${conversation.participant.name}...`}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition-all duration-200"
              rows={newMessage.includes('\n') ? 3 : 1}
              maxLength={1000}
              disabled={!conversation.participant.id && conversation.participant.type === 'barber'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            {!conversation.participant.id && conversation.participant.type === 'barber' && (
              <p className="text-xs text-amber-600 mt-1">
                This profile hasn't been claimed yet. Messages cannot be sent.
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || (!conversation.participant.id && conversation.participant.type === 'barber')}
            className="bg-primary-500 text-white p-3 rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {sending ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
          </>
          )}
        </form>
      </div>
    </div>
  );
};

export default MessageThread;