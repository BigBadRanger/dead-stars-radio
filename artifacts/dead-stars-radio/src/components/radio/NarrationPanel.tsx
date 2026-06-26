import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Radio, Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '@/hooks/use-tts';

interface NarrationPanelProps {
  text: string;
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function NarrationPanel({ text, isStreaming, onStart, onStop }: NarrationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTextRef = useRef('');
  const [voiceOn, setVoiceOn] = useState(true);

  const { feedText, flush, stop, setEnabled } = useTTS();

  // Feed only the NEW chunk each time text grows
  useEffect(() => {
    const prev = prevTextRef.current;
    if (text.length > prev.length) {
      const newChunk = text.slice(prev.length);
      feedText(newChunk);
    }
    prevTextRef.current = text;
  }, [text, feedText]);

  // When streaming ends, flush any remaining partial sentence
  useEffect(() => {
    if (!isStreaming && text.length > 0) {
      flush();
    }
    // When a new stream starts, stop any existing speech
    if (isStreaming && text.length === 0) {
      stop();
      prevTextRef.current = '';
    }
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll as text arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  const handleVoiceToggle = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    setEnabled(next);
  };

  const handleStop = () => {
    stop();
    onStop();
  };

  return (
    <div className="flex flex-col h-full border border-primary/30 bg-black/70 rounded-md overflow-hidden">

      {/* Header — button always visible */}
      <div className="px-4 py-2.5 border-b border-primary/20 flex items-center justify-between bg-primary/10 shrink-0">
        <h3 className="font-display text-sm tracking-[0.2em] flex items-center gap-2 text-primary">
          <Radio className="w-4 h-4" />
          AI INTERCEPT LOG
        </h3>

        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <button
            onClick={handleVoiceToggle}
            title={voiceOn ? 'Mute voice' : 'Enable voice'}
            className={`p-1.5 rounded border font-mono text-xs transition-colors ${
              voiceOn
                ? 'border-primary/40 text-primary hover:bg-primary/10'
                : 'border-primary/20 text-primary/30 hover:border-primary/40 hover:text-primary/60'
            }`}
          >
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs font-mono opacity-70">
              <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              RECEIVING
            </span>
          )}

          {!isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              className="font-display tracking-wider border-primary/50 text-primary hover:bg-primary/20 hover:border-primary gap-2 h-8"
            >
              <Play className="w-3 h-3" />
              DECODE SIGNAL
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="font-display tracking-wider border-destructive/50 text-destructive hover:bg-destructive/10 gap-2 h-8"
            >
              <Square className="w-3 h-3" />
              HALT
            </Button>
          )}
        </div>
      </div>

      {/* Streaming text */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed text-primary/80 whitespace-pre-wrap"
        style={{ minHeight: 0 }}
      >
        {text ? (
          <>
            {text}
            {isStreaming && <span className="animate-pulse opacity-70">█</span>}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-35 text-center select-none">
            <Radio className="w-7 h-7" />
            <div className="tracking-widest text-[10px]">AWAITING TRANSMISSION</div>
            <div className="text-[9px] opacity-80 max-w-[180px] leading-relaxed">
              Press DECODE SIGNAL to receive Claude AI narration about whether this star still exists
            </div>
          </div>
        )}
      </div>

      {text && (
        <div className="px-4 py-2 border-t border-primary/20 bg-primary/5 shrink-0 flex items-center justify-between">
          <span className="font-mono text-[9px] opacity-40 tracking-widest">
            {text.length} CHARS RECEIVED
          </span>
          <span className="font-mono text-[9px] opacity-40 tracking-widest">
            {voiceOn ? 'VOICE: ON' : 'VOICE: OFF'}
          </span>
        </div>
      )}
    </div>
  );
}
