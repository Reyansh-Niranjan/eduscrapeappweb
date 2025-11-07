import { useState, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export const useChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useAction(api.chatbot.sendChatMessage);
  const messages = useQuery(api.chatbot.getChatHistory, { sessionId });

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await sendMessage({
        sessionId,
        message,
      });

      if (!result.success) {
        console.error('Chat error:', result.error);
        // You could add a toast notification here for user feedback
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    messages: messages || [],
    isLoading,
    sendMessage: handleSendMessage,
    toggleChat,
    closeChat,
  };
};
