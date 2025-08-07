import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowLeft, Users, AlertCircle } from 'lucide-react';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import { Conversation } from '../../services/MessagingService';
import { useAuth } from '../../hooks/useAuth';
import { useSupabaseConnection } from '../../hooks/useSupabaseConnection';

const MessagingDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useSupabaseConnection();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMobileThread(true);
  };

  const handleBackToList = () => {
    setShowMobileThread(false);
    setSelectedConversation(null);
  };

  return (
    <>
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800 font-medium">
              Connect to Supabase to enable messaging between barbers and clients
            </span>
          </div>
        </div>
      )}
      
    <div className="h-[600px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-full flex">
        {/* Conversation List - Desktop: Always visible, Mobile: Hidden when thread open */}
        <div className={`w-full lg:w-1/4 xl:w-1/5 border-r border-gray-200 ${
          showMobileThread ? 'hidden lg:block' : 'block'
        }`}>
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-500 p-2 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              </div>
            </div>
            
            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-4">
              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.bookingId}
              />
            </div>
          </div>
        </div>

        {/* Message Thread - Desktop: Always visible when selected, Mobile: Full screen when open */}
        <div className={`flex-1 ${
          showMobileThread ? 'block' : 'hidden lg:block'
        }`}>
          {selectedConversation ? (
            <div className="h-full flex flex-col">
              {/* Mobile back button */}
              <div className="lg:hidden bg-white border-b border-gray-200 p-3">
                <button
                  onClick={handleBackToList}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to conversations</span>
                </button>
              </div>
              
              <MessageThread 
                conversation={selectedConversation}
                onBack={handleBackToList}
              />
            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-sm mx-auto px-4">
                <div className="bg-gradient-to-br from-primary-100 to-accent-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Select a conversation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Choose a conversation from the list to start messaging with your {user ? 'clients or barbers' : 'barber or customers'}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default MessagingDashboard;