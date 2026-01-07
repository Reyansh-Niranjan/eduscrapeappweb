import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { useScribe } from '@elevenlabs/react';
import {
  getActiveTtsProvider,
  getConvexSiteUrl,
  getSelectedVoiceName,
  setSelectedVoice,
  speakTextWithVoiceId,
  stopSpeaking,
} from '../lib/voice';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{
    _id: string;
    _creationTime: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({ isOpen, onClose, messages, isLoading, onSendMessage }: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const STT_PROVIDER = (import.meta.env.VITE_STT_PROVIDER || 'browser').toLowerCase();
  const TTS_PROVIDER = (import.meta.env.VITE_TTS_PROVIDER || 'browser').toLowerCase();
  const [isRecording, setIsRecording] = useState(false);
    const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);
    const [voices, setVoices] = useState<Array<{ voice_id: string; name: string }>>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [voiceCandidate, setVoiceCandidate] = useState<{ voice_id: string; name: string } | null>(null);

    const fetchVoices = async () => {
      const base = getConvexSiteUrl();
      if (!base) throw new Error('Missing VITE_CONVEX_URL');
      const response = await fetch(`${base}/eleven/voices`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const list = Array.isArray(data?.voices) ? data.voices : [];
      return list as Array<{ voice_id: string; name: string }>;
    };
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>('');

  const getConvexSiteUrl = () => {
    const cloudUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
    if (!cloudUrl) return '';
    return cloudUrl.replace(/\.convex\.cloud\/?$/, '.convex.site');
  };

  const fetchScribeToken = async () => {
    const base = getConvexSiteUrl();
    if (!base) throw new Error('Missing VITE_CONVEX_URL');
    const response = await fetch(`${base}/eleven/scribe-token`);
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    if (!data?.token) throw new Error('Missing token');
    return data.token as string;
  };

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      if (!isRecording || STT_PROVIDER !== 'elevenlabs') return;
      const text = (data?.text || '').trim();
      if (!text) return;
      setInputMessage(text);
    },
    onCommittedTranscript: (data) => {
      if (!isRecording || STT_PROVIDER !== 'elevenlabs') return;
      const text = (data?.text || '').trim();
      if (!text) return;
      if (text === lastCommittedRef.current) return;
      lastCommittedRef.current = text;
      onSendMessage(text);
      setInputMessage('');
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (STT_PROVIDER === 'elevenlabs') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript as string;
      setInputMessage(transcript);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (transcript.trim().length > 0) {
        silenceTimerRef.current = setTimeout(() => {
          onSendMessage(transcript.trim());
          setInputMessage('');
        }, 1500);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        // noop
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STT_PROVIDER, onSendMessage, isRecording]);

  useEffect(() => {
    if (!isOpen) {
      setIsRecording(false);
      setIsVoicePickerOpen(false);
      setVoiceCandidate(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isVoicePickerOpen) return;
    if (voices.length > 0) return;

    setIsLoadingVoices(true);
    fetchVoices()
      .then((list) => setVoices(list))
      .catch((e) => console.error('Failed to load voices:', e))
      .finally(() => setIsLoadingVoices(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVoicePickerOpen]);

  useEffect(() => {
    if (!isRecording) {
      if (STT_PROVIDER === 'elevenlabs') {
        try {
          scribe.disconnect();
        } catch {
          // noop
        }
      } else {
        try {
          recognitionRef.current?.stop();
        } catch {
          // noop
        }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }

    if (STT_PROVIDER === 'elevenlabs') {
      (async () => {
        try {
          const token = await fetchScribeToken();
          await scribe.connect({
            token,
            microphone: { echoCancellation: true, noiseSuppression: true },
          });
        } catch (e) {
          console.error('Failed to start Scribe:', e);
          setIsRecording(false);
        }
      })();
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch {
      // ignore
    }
  }, [isRecording, STT_PROVIDER, scribe]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[500px] bg-gradient-to-br from-purple-900/95 to-teal-900/95 backdrop-blur-lg border border-purple-500/30 rounded-2xl shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-teal-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">EduScrapeApp Assistant</h3>
            <p className="text-gray-300 text-xs">Ask about features or onboarding.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Close chat"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <p className="text-gray-300 text-sm mb-2">Welcome to EduScrapeApp Assistant!</p>
            <p className="text-gray-400 text-xs">Ask how we automate curriculum updates or integrate with your systems.</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message._id}
              _id={message._id}
              _creationTime={message._creationTime}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-teal-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 border border-purple-500/30 rounded-2xl px-4 py-3 backdrop-blur-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-purple-500/30">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              setIsVoicePickerOpen((v) => !v);
              setVoiceCandidate(null);
            }}
            disabled={isLoading}
            className="px-3 py-2 rounded-lg border border-gray-600 bg-gray-800/50 hover:bg-gray-700/50 text-white transition-colors disabled:opacity-50"
            title={`Choose voice (${getActiveTtsProvider()})`}
            aria-label="Choose voice"
          >
            {/* Speaker icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H3v6h3l5 4V5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.54 8.46a5 5 0 010 7.07" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.07 4.93a10 10 0 010 14.14" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setIsRecording((v) => !v)}
            disabled={isLoading}
            className={`px-3 py-2 rounded-lg border border-gray-600 text-white transition-colors ${
              isRecording
                ? 'bg-red-600/70 hover:bg-red-600'
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            } disabled:opacity-50`}
            title={isRecording ? `Stop voice (${STT_PROVIDER})` : `Start voice (${STT_PROVIDER})`}
            aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
          >
            {/* Mic icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v2a7 7 0 01-14 0v-2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19v4m-4 0h8" />
            </svg>
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>

        {isVoicePickerOpen && (
          <div className="mt-3 p-3 rounded-xl border border-purple-500/30 bg-gray-900/40 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="text-xs text-gray-300">
                Current voice: <span className="text-white font-semibold">{getSelectedVoiceName() || 'Default'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsVoicePickerOpen(false);
                  setVoiceCandidate(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Close voice picker"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {TTS_PROVIDER !== 'elevenlabs' && (
              <div className="text-xs text-gray-400 mb-2">
                Set <span className="text-gray-200">VITE_TTS_PROVIDER=elevenlabs</span> to use ElevenLabs voices.
              </div>
            )}

            <div className="max-h-40 overflow-y-auto space-y-1">
              {isLoadingVoices && (
                <div className="text-xs text-gray-400">Loading voices…</div>
              )}

              {!isLoadingVoices && voices.length === 0 && (
                <div className="text-xs text-gray-400">No voices available.</div>
              )}

              {voices.map((v) => (
                <button
                  key={v.voice_id}
                  type="button"
                  onClick={async () => {
                    setVoiceCandidate(v);
                    await speakTextWithVoiceId('HI! I am ready to start discussing with you!', v.voice_id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                    voiceCandidate?.voice_id === v.voice_id
                      ? 'border-teal-400 bg-teal-500/10 text-white'
                      : 'border-gray-700 bg-gray-800/40 hover:bg-gray-700/40 text-gray-200'
                  }`}
                >
                  <div className="text-sm font-medium">{v.name}</div>
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsVoicePickerOpen(false);
                  setVoiceCandidate(null);
                }}
                className="px-3 py-2 text-sm rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-700/40 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!voiceCandidate}
                onClick={() => {
                  if (!voiceCandidate) return;
                  setSelectedVoice(voiceCandidate);
                  stopSpeaking();
                  setIsVoicePickerOpen(false);
                  setVoiceCandidate(null);
                }}
                className="px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-teal-500 to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
