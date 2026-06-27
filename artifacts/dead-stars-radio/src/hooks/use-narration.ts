import { useState, useCallback, useRef } from 'react';
import { NarrationRequest } from '@workspace/api-client-react';

export function useNarration(starId?: number) {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setText('');
    setIsStreaming(false);
    setError(null);
  }, []);

  const startStream = useCallback(async (contextStr: string = '') => {
    if (!starId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setText('');
    setIsStreaming(true);
    setError(null);

    try {
      const payload: NarrationRequest = { context: contextStr };
      const response = await fetch(`/api/stars/${starId}/narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to generate narration: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                accumulatedText += data.text;
                setText(accumulatedText);
              }
            } catch {
              // partial line — ignore
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
        setIsStreaming(false);
      }
    }
  }, [starId]);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return { text, isStreaming, error, startStream, stopStream, reset };
}
