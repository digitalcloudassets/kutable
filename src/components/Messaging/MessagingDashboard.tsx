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
      
    <section className="p-0 bg-transparent md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm md:hover:shadow-lg md:transition-all md:duration-300 md:overflow-hidden app-bleed md:mx-0">

      {/* ============ MOBILE: native-like full-bleed overlay ============ */}
      <div 
        className="md:hidden fixed inset-x-0 z-40 bg-white"
        style={{
          top: 'var(--site-header-h, 80px)',
          bottom: 'calc(var(--bottom-tabbar-h, 72px) + env(safe-area-inset-bottom))'
        }}
        aria-label="Mobile messages overlay"
      >
        <div className="flex h-full w-full flex-col bg-white">
          {/* Mobile header */}
          <div className="p-4 border-b bg-gradient-to-r from-primary-50 to-accent-50">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-500 p-2 rounded-xl">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            </div>
          </div>

          {/* List OR Thread */}
          {!showMobileThread ? (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-0 py-4">
              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.bookingId}
              />
            </div>
          ) : selectedConversation ? (
            <>
              {/* Back to list */}
              <div className="bg-white border-b border-gray-200 p-3">
                <button
                  onClick={handleBackToList}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to conversations</span>
                </button>
              </div>
              
              {/* Thread fills remaining height; composer can be sticky inside */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <MessageThread conversation={selectedConversation} onBack={handleBackToList} />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ============ DESKTOP: unchanged split view ============ */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[320px_1fr] h-[calc(100vh-var(--site-header-h,80px)-160px)]">
          {/* LEFT: conversation sidebar */}
          <aside className="border-r bg-white flex-col flex">
            <div className="p-4 border-b bg-gradient-to-r from-primary-50 to-accent-50">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-500 p-2 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.bookingId}
              />
            </div>
          </aside>

          <div className="flex flex-col bg-gray-50/50">
            {selectedConversation ? (
              <MessageThread 
                conversation={selectedConversation}
                onBack={handleBackToList}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-[300px]">
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
    </section>
    </>
  );
};

export default MessagingDashboard;