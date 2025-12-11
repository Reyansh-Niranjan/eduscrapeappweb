import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';
import { useChat } from '../hooks/useChat';

interface ChatProps {
  userContext?: {
    grade?: string;
    currentPage?: string;
    currentBook?: string;
    currentFolder?: string;
  };
  onBookOpen?: (book: { path: string; name: string }) => void;
}

export default function Chat({ userContext, onBookOpen }: ChatProps) {
  const { isOpen, messages, isLoading, sendMessage, toggleChat, closeChat } = useChat(userContext, onBookOpen);

  return (
    <>
      <ChatButton isOpen={isOpen} onClick={toggleChat} />
      <ChatPanel
        isOpen={isOpen}
        onClose={closeChat}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={sendMessage}
      />
    </>
  );
}
