import { useRef, useCallback, useEffect } from 'react';

export function useTTS() {
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const enabledRef = useRef(true);
  const pendingRef = useRef(''); // partial sentence buffer

  const speak = useCallback((sentence: string) => {
    if (!enabledRef.current || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(sentence);

    // Pick a deep, authoritative voice (Carl Sagan / documentary feel)
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /Daniel|Google UK English Male|Alex|Fred|Samantha/i.test(v.name)
    ) || voices.find(v => v.lang.startsWith('en') && !v.localService === false)
      || voices[0];

    if (preferred) utt.voice = preferred;
    utt.rate = 0.88;    // deliberate, measured — like a documentary
    utt.pitch = 0.9;    // slightly deeper
    utt.volume = 1.0;

    utt.onend = () => {
      isSpeakingRef.current = false;
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        isSpeakingRef.current = true;
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(next));
        // re-apply settings to queued utterances
        speakFromQueue();
      }
    };

    isSpeakingRef.current = true;
    window.speechSynthesis.speak(utt);
  }, []);

  const speakFromQueue = useCallback(() => {
    if (isSpeakingRef.current || queueRef.current.length === 0) return;
    const sentence = queueRef.current.shift()!;
    speak(sentence);
  }, [speak]);

  // Feed streaming text — buffers until sentence boundary then enqueues
  const feedText = useCallback((newChunk: string) => {
    if (!enabledRef.current) return;
    pendingRef.current += newChunk;

    // Split on sentence-ending punctuation followed by space or end
    const parts = pendingRef.current.split(/(?<=[.!?])\s+/);
    // Keep the last partial piece in the buffer
    pendingRef.current = parts.pop() ?? '';

    for (const sentence of parts) {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        queueRef.current.push(trimmed);
      }
    }

    speakFromQueue();
  }, [speakFromQueue]);

  // Speak any remaining text when stream ends
  const flush = useCallback(() => {
    if (pendingRef.current.trim().length > 0) {
      queueRef.current.push(pendingRef.current.trim());
      pendingRef.current = '';
      speakFromQueue();
    }
  }, [speakFromQueue]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    queueRef.current = [];
    pendingRef.current = '';
    isSpeakingRef.current = false;
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on;
    if (!on) stop();
  }, [stop]);

  // Cancel speech on unmount
  useEffect(() => () => stop(), [stop]);

  return { feedText, flush, stop, setEnabled };
}
