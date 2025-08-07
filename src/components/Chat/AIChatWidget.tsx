import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Minimize2, 
  Maximize2, 
  Bot,
  User,
  Loader,
  Sparkles,
  HelpCircle,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; similarity?: number }>;
}

interface AIChatWidgetProps {
  className?: string;
}

const AIChatWidget: React.FC<AIChatWidgetProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug logging for visibility issues
  useEffect(() => {
    console.log('AI Chat Widget mounted and rendered');
  }, []);
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setHasUnread(false);
      scrollToBottom();
    }
  }, [isOpen, isMinimized, messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage.content,
          conversationId: conversationId || undefined,
          sessionId,
          userId: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'AI service returned an error');
      }

      if (data?.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp,
          sources: data.sources
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (!conversationId) {
          setConversationId(data.conversationId);
        }

        // Show unread indicator if chat is closed
        if (!isOpen || isMinimized) {
          setHasUnread(true);
        }
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Handle Supabase Functions errors (non-2xx responses)
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      let isConfigurationError = false;
       console.log('Chat error details:', {
         name: error?.name,
         message: error?.message,
         type: typeof error,
         hasContext: !!error?.context,
         contextKeys: error?.context ? Object.keys(error.context) : []
       });
       
       // Handle Supabase Functions errors
       if (error?.name === 'FunctionsHttpError' || 
           error?.message?.includes('Edge Function returned a non-2xx status code') ||
           error?.message?.includes('FunctionsHttpError')) {
         
         console.log('Handling FunctionsHttpError');
         
         // The error object should contain the response data directly
         if (error?.context?.response || error?.response) {
           console.log('Error has response context');
         }
         
         // For FunctionsHttpError, the error details might be in different places
         let errorData = null;
         try {
           // Try multiple ways to get the error data
           if (error?.body) {
             errorData = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
           } else if (error?.context?.body) {
             errorData = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
           } else if (error?.message?.includes('{')) {
             // Sometimes the error message contains JSON
             const jsonMatch = error.message.match(/\{.*\}/);
             if (jsonMatch) {
               errorData = JSON.parse(jsonMatch[0]);
             }
           }
           
           console.log('Parsed error data:', errorData);
           
           if (errorData?.error) {
             errorMessage = errorData.error;
             
             if (errorData.details?.includes('OpenAI API key') || 
                 errorData.details?.includes('API key not configured') ||
                 errorData.error?.includes('API key not configured')) {
               isConfigurationError = true;
               errorMessage = '🚧 AI chat is currently being set up. Please contact support@kutable.com for immediate assistance.';
             }
           }
         } catch (parseError) {
           console.error('Failed to parse edge function error:', parseError);
          errorMessage = 'AI service temporarily unavailable. Please contact support@kutable.com for immediate assistance.';
         }
       } else if (error?.message?.includes('API key')) {
        errorMessage = '🚧 AI chat is being set up. Please contact support@kutable.com for immediate assistance.';
      } else if (error?.message?.includes('rate')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error?.message?.includes('database')) {
        errorMessage = 'Chat service temporarily unavailable. Please email support@kutable.com for assistance.';
      } else if (error?.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
       console.log('Final error message:', errorMessage);
       
      const errorChatMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `${errorMessage}\n\n💡 **Alternative ways to get help:**\n• Email: support@kutable.com\n• Support form: Visit our support page\n• Phone: Contact barbers directly via their profiles\n• FAQ: Check our how-it-works and support pages`,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
    
    // Add welcome message if no messages exist
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: "👋 Hi! I'm Kutable's AI assistant. I can help you with:\n\n🗓️ Booking appointments\n   How to find and book barbers\n\n💼 For Barbers\n   Claiming profiles, fees, payment setup\n\n⚡ Platform features\n   SMS notifications, mobile app, security\n\n💰 Pricing & payments\n   Customer and barber costs\n\n🆘 Support\n   Getting help and contacting us\n\nWhat can I help you with today?",
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    if (!isMinimized) {
      setHasUnread(false);
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] ${className}`} style={{ zIndex: 9999 }}>
      {/* Chat Bubble */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="relative bg-gradient-to-r from-primary-500 to-accent-500 text-white p-4 rounded-full shadow-premium-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 group animate-float"
          style={{ 
            background: 'linear-gradient(135deg, #0066FF 0%, #00D4AA 100%)',
            minWidth: '56px',
            minHeight: '56px'
          }}
        >
          <MessageSquare className="h-6 w-6" />
          
          {/* Unread indicator */}
          {hasUnread && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
              !
            </div>
          )}
          
          {/* Floating animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full opacity-30 animate-ping" style={{ animationDuration: '2s' }}></div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`bg-white rounded-2xl shadow-premium-lg border border-gray-100 transition-all duration-300 ${
          isMinimized 
            ? 'w-80 h-16' 
            : 'w-80 sm:w-96 h-[32rem]'
        }`} style={{ zIndex: 9999 }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Kutable AI Assistant</h3>
                <p className="text-xs text-white/80">
                  {isLoading ? 'Typing...' : 'Online • Instant answers'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMinimize}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md shadow-sm'
                    } px-4 py-3`}>
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && (
                          <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-1 rounded-lg mt-1">
                            <Sparkles className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                          
                          {/* Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2 font-medium">Sources:</p>
                              <div className="space-y-1">
                                {message.sources.map((source, index) => (
                                  <div key={index} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                                    {source.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <p className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-md shadow-sm px-4 py-3 max-w-[80%]">
                      <div className="flex items-center space-x-2">
                        <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-1 rounded-lg">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask about booking, pricing, features..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-gray-50 text-sm"
                      disabled={isLoading}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {inputMessage.length}/500 • Press Enter to send
                    </p>
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-primary-500 text-white p-3 rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                
                {/* AI Disclaimer */}
                <p className="text-xs text-gray-500 mt-3 text-center">
                  🤖 Powered by AI • Responses may not always be accurate • 
                  For urgent issues, email support@kutable.com
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Actions (when chat is open but minimized) */}
      {isOpen && isMinimized && (
        <div className="absolute bottom-20 right-0 bg-white rounded-xl shadow-lg border border-gray-200 p-3 space-y-2 w-64" style={{ zIndex: 9999 }}>
          <p className="text-sm font-medium text-gray-900 mb-2">Quick Questions:</p>
          {[
            "How do I book an appointment?",
            "What are the fees?",
            "How do I claim my profile?",
            "How do cancellations work?"
          ].map((question, index) => (
            <button
              key={index}
              onClick={() => {
                setInputMessage(question);
                setIsMinimized(false);
                setTimeout(() => sendMessage(), 100);
              }}
              className="w-full text-left text-sm text-gray-700 hover:text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIChatWidget;