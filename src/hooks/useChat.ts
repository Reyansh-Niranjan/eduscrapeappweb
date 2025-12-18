import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface UserContext {
  grade?: string;
  currentPage?: string;
  currentBook?: string;
  currentFolder?: string;
}

interface BookToOpen {
  path: string;
  name: string;
}

export const useChat = (userContext?: UserContext, onBookOpen?: (book: BookToOpen) => void) => {
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
        userContext,
      });

      if (result.success) {
        // If AI wants to open a book, trigger the callback
        if (result.bookToOpen && onBookOpen) {
          onBookOpen(result.bookToOpen);
        }
      } else {
        console.error('Message failed:', result.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
