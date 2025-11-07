interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function ChatButton({ isOpen, onClick }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 z-50 ${
        isOpen
          ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
          : 'bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700'
      }`}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      <div className="flex items-center justify-center w-full h-full">
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>
      
      {/* Pulse animation when closed */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-purple-600 animate-ping opacity-20"></div>
      )}
    </button>
  );
}
