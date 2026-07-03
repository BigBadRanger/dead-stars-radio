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

export function useTTS() {
  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef  = useRef<string | null>(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [voice,      setVoice]      = useState<OpenAIVoice>("shimmer");
  const [enabled,    setEnabledState] = useState(true);
  const enabledRef   = useRef(true);
  const voiceRef     = useRef<OpenAIVoice>("shimmer");

  // Keep voiceRef in sync so speak() always uses the latest voice choice
  const handleSetVoice = useCallback((v: OpenAIVoice) => {
    voiceRef.current = v;
    setVoice(v);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on;
    setEnabledState(on);
    if (!on) stop();
  }, [stop]);

  // speak() must be called directly from a user-gesture handler so the browser
  // permits audio playback without autoplay policy blocking it.
  const speak = useCallback(async (text: string) => {
    if (!enabledRef.current || !text.trim()) return;
    stop();
    setIsLoading(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voice: voiceRef.current }),
      });
      if (!response.ok) { setIsLoading(false); return; }

      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay  = () => { setIsLoading(false); setIsPlaying(true); };
      audio.onended = () => stop();
      audio.onerror = () => stop();

      await audio.play();
    } catch {
      stop();
    }
  }, [stop]);

  return { speak, stop, isPlaying, isLoading, voice, setVoice: handleSetVoice, enabled, setEnabled };
}
