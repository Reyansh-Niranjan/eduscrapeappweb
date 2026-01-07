import { useState } from "react";
import { getActiveTtsProvider, speakText, stopSpeaking } from "../lib/voice";

interface ChatMessageProps {
  _id: string;
  _creationTime: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-br-md'
              : 'bg-gradient-to-br from-purple-800/20 to-teal-800/20 text-gray-100 border border-purple-500/30 rounded-bl-md backdrop-blur-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        <div className={`mt-1 flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className="text-xs text-gray-400">{time}</div>

          {!isUser && (
            <button
              type="button"
              className="text-gray-400 hover:text-white transition-colors"
              title={isSpeaking ? `Stop (${getActiveTtsProvider()})` : `Play (${getActiveTtsProvider()})`}
              onClick={async () => {
                if (isSpeaking) {
                  stopSpeaking();
                  setIsSpeaking(false);
                  return;
                }

                await speakText(content, {
                  onStart: () => setIsSpeaking(true),
                  onEnd: () => setIsSpeaking(false),
                });
              }}
              aria-label={isSpeaking ? "Stop speaking" : "Speak message"}
            >
              {/* Speaker icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H3v6h3l5 4V5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-gradient-to-r from-teal-500 to-purple-600 order-1 ml-2' : 'bg-gradient-to-r from-purple-600 to-teal-500 order-2 mr-2'
      }`}>
        {isUser ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        )}
      </div>
    </div>
  );
}
