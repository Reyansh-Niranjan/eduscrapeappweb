import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';
import { useChat } from '../hooks/useChat';

export default function Chat() {
  const { isOpen, messages, isLoading, sendMessage, toggleChat, closeChat } = useChat();

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
