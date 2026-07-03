import { useRef, useCallback, useState } from 'react';

export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export const VOICE_OPTIONS: { value: OpenAIVoice; label: string }[] = [
  { value: "shimmer", label: "Shimmer — ethereal female" },
  { value: "nova",    label: "Nova — warm female" },
  { value: "alloy",   label: "Alloy — neutral" },
  { value: "echo",    label: "Echo — expressive male" },
  { value: "fable",   label: "Fable — narrative male" },
  { value: "onyx",    label: "Onyx — deep male" },
];

// Split text into ~60-word chunks at sentence boundaries
function chunkText(text: string, targetWords = 60): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  let wordCount = 0;

  for (const s of sentences) {
    const trimmed = s.trim();
    const words = trimmed.split(/\s+/).length;
    if (wordCount + words > targetWords && current) {
      chunks.push(current.trim());
      current = trimmed;
      wordCount = words;
    } else {
      current += (current ? ' ' : '') + trimmed;
      wordCount += words;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.trim()];
}

export function useTTS() {
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const abortRef      = useRef<AbortController | null>(null);

  const [isPlaying,  setIsPlaying]  = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [voice,      setVoiceState] = useState<OpenAIVoice>("shimmer");
  const voiceRef     = useRef<OpenAIVoice>("shimmer");
  const [enabled,    setEnabledState] = useState(true);
  const enabledRef   = useRef(true);

  const setVoice = useCallback((v: OpenAIVoice) => {
    voiceRef.current = v;
    setVoiceState(v);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on;
    setEnabledState(on);
    if (!on) stop();
  }, [stop]);

  // Must be called from a direct user-gesture handler (button click).
  // Splits text into chunks, fires all TTS fetches in parallel,
  // then plays them in order as each resolves — first chunk starts fast
  // while the rest generate in the background.
  const speak = useCallback(async (text: string) => {
    if (!enabledRef.current || !text.trim()) return;
    stop();

    const abort = new AbortController();
    abortRef.current = abort;

    const chunks = chunkText(text);
    const v = voiceRef.current;

    setIsLoading(true);

    // Kick off all fetches simultaneously
    const fetchPromises = chunks.map(chunk =>
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk, voice: v }),
        signal: abort.signal,
      })
        .then(r => (r.ok ? r.blob() : null))
        .then(blob => (blob ? URL.createObjectURL(blob) : null))
        .catch(() => null)
    );

    let idx = 0;

    const playNext = async () => {
      if (abort.signal.aborted) return;
      if (idx >= fetchPromises.length) {
        setIsPlaying(false);
        setIsLoading(false);
        return;
      }

      const url = await fetchPromises[idx++];
      if (abort.signal.aborted) return;
      if (!url) { playNext(); return; }

      objectUrlsRef.current.push(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay  = () => { setIsLoading(false); setIsPlaying(true); };
      audio.onended = () => playNext();
      audio.onerror = () => playNext();

      try {
        await audio.play();
      } catch {
        playNext();
      }
    };

    playNext();
  }, [stop]);

  return { speak, stop, isPlaying, isLoading, voice, setVoice, enabled, setEnabled };
}
