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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voice, setVoice] = useState<OpenAIVoice>("shimmer");
  const [enabled, setEnabledState] = useState(true);
  const enabledRef = useRef(true);

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
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on;
    setEnabledState(on);
    if (!on) stop();
  }, [stop]);

  const speak = useCallback(async (text: string, voiceOverride?: OpenAIVoice) => {
    if (!enabledRef.current || !text.trim()) return;
    stop();

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), voice: voiceOverride ?? voice }),
      });
      if (!response.ok) return;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay  = () => setIsPlaying(true);
      audio.onended = () => { stop(); };
      audio.onerror = () => { stop(); };

      await audio.play();
    } catch {
      stop();
    }
  }, [voice, stop]);

  return { speak, stop, isPlaying, voice, setVoice, enabled, setEnabled };
}
