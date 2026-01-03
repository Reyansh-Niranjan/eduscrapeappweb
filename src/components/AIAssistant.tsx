import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import AlsomConnectionModal from './AlsomConnectionModal';
import AlsomAuthModal from './AlsomAuthModal';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIAssistantProps {
  userContext?: {
    grade?: string;
    currentPage?: string;
    currentBook?: string;
    currentFolder?: string;
  };
  onBookOpen?: (book: { path: string; name: string }) => void;
}

export default function AIAssistant({ userContext, onBookOpen }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Alsom connection state
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [alsomSession, setAlsomSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const sendMessageAction = useAction(api.chatbot.sendChatMessage);
  const sessionId = useRef(`ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check for existing Alsom session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAlsomSession(session);
      } catch (error) {
        console.error('[AIAssistant] Error checking session:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAlsomSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && alsomSession) {
      inputRef.current?.focus();
    }
  }, [isOpen, alsomSession]);

  // Handle chat button click
  const handleChatButtonClick = () => {
    if (alsomSession) {
      // Already authenticated, open chat directly
      setIsOpen(true);
    } else {
      // Not authenticated, show connection modal
      setShowConnectionModal(true);
    }
  };

  // Handle connection modal "Connect" button
  const handleConnect = () => {
    setShowConnectionModal(false);
    setShowAuthModal(true);
  };

  // Handle successful Alsom authentication
  const handleAuthSuccess = useCallback((session: Session) => {
    setAlsomSession(session);
    setShowAuthModal(false);
    setIsOpen(true);
  }, []);

  // Handle sign out from Alsom
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setAlsomSession(null);
      setIsOpen(false);
      setMessages([]);
    } catch (error) {
      console.error('[AIAssistant] Error signing out:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await sendMessageAction({
        sessionId: sessionId.current,
        message: userMessage.content,
        userContext,
      });

      if (result.success && result.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Handle book opening
        if (result.bookToOpen && onBookOpen) {
          onBookOpen(result.bookToOpen);
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: result.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('[AI] Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Alsom Connection Modal */}
      <AlsomConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConnect}
      />

      {/* Alsom Auth Modal */}
      <AlsomAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleChatButtonClick}
          disabled={isCheckingAuth}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 disabled:opacity-70 disabled:cursor-wait"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-96 h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="h-6 w-6" />
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                <p className="text-xs text-purple-100">
                  {alsomSession ? `Connected as ${alsomSession.user.email?.split('@')[0] || 'User'}` : 'Always here to help'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {alsomSession && (
                <button
                  onClick={handleSignOut}
                  className="p-1 hover:bg-white/20 rounded-lg transition text-xs"
                  aria-label="Sign out"
                  title="Sign out from Alsom"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="bg-gradient-to-r from-purple-600 to-teal-500 p-4 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Hi! I'm your AI Assistant
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  I can help you with:
                </p>
                <div className="text-left space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600">🌐</span>
                    <span>Search the web for information</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600">📚</span>
                    <span>Find books in your library</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600">📖</span>
                    <span>Open any chapter for you</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            {userContext?.grade && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Grade {userContext.grade} • {userContext.currentPage || 'Home'}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
