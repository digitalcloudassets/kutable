import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Building, 
  Calendar,
  Search,
  Mail,
  Phone
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { messagingService, Conversation } from '../../services/MessagingService';
import { useAuth } from '../../hooks/useAuth';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  selectedConversationId
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      const conversationData = await messagingService.getUserConversations(user.id);
      setConversations(conversationData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    if (!searchTerm) return true;
    return (
      conversation.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white"
        />
      </div>

      {/* Conversations */}
      <div className="space-y-2">
        {(filteredConversations ?? []).length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations</h3>
            <p className="text-gray-600">
              {conversations.length === 0 
                ? 'Messages will appear here when you have active bookings with verified barber profiles'
                : 'No conversations match your search'
              }
            </p>
            {conversations.length === 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <strong>Note:</strong> Messaging is available for your active bookings with verified barbers.
                  If a barber isn't verified yet, messaging will unlock once their account is verified.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isActive = conversation.bookingId === selectedConversationId;
            
            return (
            <div
              key={conversation.bookingId}
              onClick={() => onSelectConversation(conversation)}
              className={`bg-white rounded-xl p-4 border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${
                isActive
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-100 hover:border-primary-300'
              }`}
            >
              <div className="flex items-start space-x-3 mb-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
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
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight pr-2">
                      {conversation.participant.name}
                    </h3>
                    {/* Unread badge */}
                    {conversation.unreadCount > 0 && (
                      <div className="flex-shrink-0">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                          {conversation.unreadCount}
                        </span>
                      </div>
                    )}
                    {/* Demo badge */}
                    {conversation.participant.id === '6455a63f-161e-4351-9f14-0ecbe01f0d3a' && (
                      <div className="flex-shrink-0">
                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          DEMO
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Service and appointment info */}
                  <div className="flex items-center space-x-1 mb-3">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium">
                      {conversation.booking.serviceName} • {formatAppointmentDate(conversation.booking.appointmentDate)} at {conversation.booking.appointmentTime}
                    </span>
                  </div>

                  {/* Last message */}
                  {conversation.lastMessage ? (
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-3">
                      {conversation.lastMessage.message_text}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mb-3">No messages yet</p>
                  )}
                </div>
              </div>

              {/* Bottom row with status and timestamp */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  conversation.booking.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800'
                    : conversation.booking.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.booking.status.toUpperCase()}
                </span>
                {conversation.lastMessage && (
                  <span className="text-xs text-gray-500 font-medium">
                    {formatMessageTime(conversation.lastMessage.created_at)}
                  </span>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConversationList;