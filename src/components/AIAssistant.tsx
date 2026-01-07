import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { speakText, stopSpeaking } from '../lib/voice';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatResult {
  success: boolean;
  response?: string;
  error?: string;
  bookToOpen?: { path: string; name: string };
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

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function createSpeechRecognition(): BrowserSpeechRecognition | null {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export default function AIAssistant({ userContext, onBookOpen }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convex action (OpenRouter-backed)
  const sendMessageAction = useAction(api.chatbot.sendChatMessage);
  
  // Session ID
  // Use crypto.randomUUID if available for better security
  const convexSessionId = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID 
      ? `ai_${crypto.randomUUID()}` 
      : `ai_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      try {
        recognitionRef.current?.abort();
      } catch {
        // noop
      }
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    // Stop if currently listening.
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // noop
      }
      setIsListening(false);
      return;
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      // Browser doesn't support Web Speech API.
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Voice input isn't supported in this browser. Try Chrome/Edge on desktop, or type your message.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      try {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const chunk = res?.[0]?.transcript ?? '';
          transcript += chunk;
        }
        const cleaned = String(transcript).replace(/\s+/g, ' ').trim();
        if (cleaned) setInput(cleaned);
      } catch {
        // ignore
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Send message via Convex
  const sendViaConvex = async (messageContent: string): Promise<ChatResult> => {
    const result = await sendMessageAction({
      sessionId: convexSessionId.current,
      message: messageContent,
      userContext,
    });

    return {
      success: result.success,
      response: result.response,
      error: result.error,
      bookToOpen: result.bookToOpen,
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // noop
      }
      setIsListening(false);
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await sendViaConvex(userMessage.content);

      if (result.success && result.response) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (voiceEnabled) {
          void speakText(result.response);
        }

        // Handle book opening (available from Convex backend)
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
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
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
                  Always here to help
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setVoiceEnabled((v) => {
                    const next = !v;
                    if (!next) stopSpeaking();
                    return next;
                  });
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition"
                aria-label={voiceEnabled ? "Disable voice" : "Enable voice"}
                title={voiceEnabled ? "Disable voice" : "Enable voice"}
              >
                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
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
                  {msg.role === 'assistant' ? (
                    <div className="text-sm whitespace-pre-wrap">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-base font-semibold mb-2">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-base font-semibold mb-2">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold mb-2">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm whitespace-pre-wrap">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 space-y-1 my-2 text-sm">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 space-y-1 my-2 text-sm">{children}</ol>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-purple-600 dark:text-purple-400"
                            >
                              {children}
                            </a>
                          ),
                          code: ({ children }) => (
                            <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
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
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                title={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
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
