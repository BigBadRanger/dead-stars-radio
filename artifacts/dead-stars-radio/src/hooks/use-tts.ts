import { useRef, useCallback, useEffect, useState } from 'react';

export function useTTS() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);
  const enabledRef = useRef(true);
  const pendingRef = useRef('');

  // Load available voices — Firefox needs onvoiceschanged, Chrome populates immediately
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis?.getVoices() ?? [];
      if (v.length === 0) return;

      // Only expose English voices — filter out non-English
      const english = v.filter(x => x.lang.startsWith('en'));
      const list = english.length > 0 ? english : v;
      setVoices(list);

      // Auto-select a good default if not yet chosen
      if (!selectedVoiceRef.current) {
        const pick =
          list.find(x => /Google UK English Male/i.test(x.name)) ||
          list.find(x => /Daniel/i.test(x.name)) ||       // macOS
          list.find(x => /Alex|Fred/i.test(x.name)) ||    // older macOS
          list.find(x => x.lang === 'en-GB' && !x.localService) ||
          list.find(x => x.lang.startsWith('en') && !x.localService) ||
          list.find(x => x.lang === 'en-GB') ||
          list[0] ||
          null;

        selectedVoiceRef.current = pick;
        setSelectedVoiceName(pick?.name ?? '');
      }
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speakSentence = useCallback((sentence: string) => {
    if (!enabledRef.current || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(sentence);
    if (selectedVoiceRef.current) utt.voice = selectedVoiceRef.current;
    utt.rate = 0.87;
    utt.pitch = 0.92;
    utt.volume = 1.0;
    utt.onend = () => {
      isSpeakingRef.current = false;
      drainQueue();
    };
    utt.onerror = () => {
      isSpeakingRef.current = false;
      drainQueue();
    };
    isSpeakingRef.current = true;
    window.speechSynthesis.speak(utt);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const drainQueue = useCallback(() => {
    if (isSpeakingRef.current || queueRef.current.length === 0) return;
    const sentence = queueRef.current.shift()!;
    speakSentence(sentence);
  }, [speakSentence]);

  const feedText = useCallback((chunk: string) => {
    if (!enabledRef.current) return;
    pendingRef.current += chunk;

    // Split at sentence boundaries
    const parts = pendingRef.current.split(/(?<=[.!?…])\s+/);
    pendingRef.current = parts.pop() ?? '';
    for (const s of parts) {
      const t = s.trim();
      if (t.length > 0) queueRef.current.push(t);
    }
    drainQueue();
  }, [drainQueue]);

  const flush = useCallback(() => {
    const remaining = pendingRef.current.trim();
    if (remaining.length > 0) {
      queueRef.current.push(remaining);
      pendingRef.current = '';
      drainQueue();
    }
  }, [drainQueue]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    queueRef.current = [];
    pendingRef.current = '';
    isSpeakingRef.current = false;
  }, []);

  const selectVoice = useCallback((name: string, allVoices: SpeechSynthesisVoice[]) => {
    const v = allVoices.find(x => x.name === name) ?? null;
    selectedVoiceRef.current = v;
    setSelectedVoiceName(name);
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on;
    if (!on) stop();
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { voices, selectedVoiceName, selectVoice, feedText, flush, stop, setEnabled };
}
