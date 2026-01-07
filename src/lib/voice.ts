// Default to ElevenLabs when available; if env vars/keys are missing, speakText() falls back to browser TTS.
const TTS_PROVIDER = (import.meta.env.VITE_TTS_PROVIDER || 'elevenlabs').toLowerCase();

const SELECTED_VOICE_ID_KEY = 'elevenlabs_selected_voice_id';
const SELECTED_VOICE_NAME_KEY = 'elevenlabs_selected_voice_name';

let elevenAudio: HTMLAudioElement | null = null;
let elevenAbortController: AbortController | null = null;

export function getConvexSiteUrl(): string {
  const cloudUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!cloudUrl) return '';
  // Convex HTTP routes are served from *.convex.site
  return cloudUrl.replace(/\.convex\.cloud\/?$/, '.convex.site');
}

function cleanupTextForSpeech(text: string): string {
  let cleaned = text ?? '';
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function speakBrowser(text: string, onStart?: () => void, onEnd?: () => void) {
  const speechSynthesis = window.speechSynthesis;
  if (!speechSynthesis) {
    onEnd?.();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (elevenAbortController) {
    try {
      elevenAbortController.abort();
    } catch {
      // noop
    }
    elevenAbortController = null;
  }

  if (elevenAudio) {
    try {
      elevenAudio.pause();
      elevenAudio.currentTime = 0;
    } catch {
      // noop
    }
    elevenAudio = null;
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export async function speakText(text: string, opts?: { onStart?: () => void; onEnd?: () => void }) {
  const cleaned = cleanupTextForSpeech(text);
  if (!cleaned) {
    opts?.onEnd?.();
    return;
  }

  if (TTS_PROVIDER !== 'elevenlabs') {
    speakBrowser(cleaned, opts?.onStart, opts?.onEnd);
    return;
  }

  stopSpeaking();

  try {
    const base = getConvexSiteUrl();
    if (!base) throw new Error('Missing VITE_CONVEX_URL');

    elevenAbortController = new AbortController();
    const selectedVoiceId = getSelectedVoiceId();

    const response = await fetch(`${base}/eleven/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleaned,
        voice_id: selectedVoiceId || undefined,
      }),
      signal: elevenAbortController.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    elevenAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      elevenAudio = null;
      elevenAbortController = null;
      opts?.onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      elevenAudio = null;
      elevenAbortController = null;
      opts?.onEnd?.();
    };

    opts?.onStart?.();
    await audio.play();
  } catch (e) {
    console.warn('ElevenLabs TTS failed, falling back to browser TTS:', e);
    speakBrowser(cleaned, opts?.onStart, opts?.onEnd);
  }
}

export function getActiveTtsProvider() {
  return TTS_PROVIDER;
}

export function getSelectedVoiceId(): string {
  try {
    return localStorage.getItem(SELECTED_VOICE_ID_KEY) || '';
  } catch {
    return '';
  }
}

export function getSelectedVoiceName(): string {
  try {
    return localStorage.getItem(SELECTED_VOICE_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setSelectedVoice(voice: { voice_id: string; name: string }) {
  try {
    localStorage.setItem(SELECTED_VOICE_ID_KEY, voice.voice_id);
    localStorage.setItem(SELECTED_VOICE_NAME_KEY, voice.name);
  } catch {
    // noop
  }
}

export async function speakTextWithVoiceId(
  text: string,
  voiceId: string,
  opts?: { onStart?: () => void; onEnd?: () => void }
) {
  const cleaned = cleanupTextForSpeech(text);
  if (!cleaned) {
    opts?.onEnd?.();
    return;
  }

  if (TTS_PROVIDER !== 'elevenlabs') {
    speakBrowser(cleaned, opts?.onStart, opts?.onEnd);
    return;
  }

  stopSpeaking();

  try {
    const base = getConvexSiteUrl();
    if (!base) throw new Error('Missing VITE_CONVEX_URL');

    elevenAbortController = new AbortController();
    const response = await fetch(`${base}/eleven/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: cleaned, voice_id: voiceId }),
      signal: elevenAbortController.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    elevenAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      elevenAudio = null;
      elevenAbortController = null;
      opts?.onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      elevenAudio = null;
      elevenAbortController = null;
      opts?.onEnd?.();
    };

    opts?.onStart?.();
    await audio.play();
  } catch (e) {
    console.warn('ElevenLabs TTS failed, falling back to browser TTS:', e);
    speakBrowser(cleaned, opts?.onStart, opts?.onEnd);
  }
}
