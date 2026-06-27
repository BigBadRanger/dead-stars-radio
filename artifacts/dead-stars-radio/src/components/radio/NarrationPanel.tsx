import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Radio, Volume2, VolumeX, ChevronDown } from 'lucide-react';
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

  const { voices, selectedVoiceName, selectVoice, feedText, flush, stop, setEnabled } = useTTS();

  // Feed only newly-arrived text chunks to TTS
  useEffect(() => {
    const prev = prevTextRef.current;
    if (text.length > prev.length) {
      feedText(text.slice(prev.length));
    }
    prevTextRef.current = text;
  }, [text, feedText]);

  // Flush remaining sentence when stream ends; reset on new stream start
  useEffect(() => {
    if (!isStreaming && text.length > 0) {
      flush();
    }
    if (isStreaming && text.length === 0) {
      stop();
      prevTextRef.current = '';
    }
  }, [isStreaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
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

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-primary/20 flex items-center justify-between bg-primary/10 shrink-0 gap-3 flex-wrap">
        <h3 className="font-display text-sm tracking-[0.2em] flex items-center gap-2 text-primary shrink-0">
          <Radio className="w-4 h-4" />
          AI INTERCEPT LOG
        </h3>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Voice selector */}
          {voices.length > 0 && voiceOn && (
            <div className="relative flex items-center">
              <select
                value={selectedVoiceName}
                onChange={e => selectVoice(e.target.value, voices)}
                className="appearance-none bg-black/60 border border-primary/30 text-primary font-mono text-[10px] tracking-wider pl-2 pr-6 py-1 rounded cursor-pointer hover:border-primary/60 focus:outline-none focus:border-primary/80 max-w-[160px]"
              >
                {voices.map(v => (
                  <option key={v.name} value={v.name}>
                    {v.name.replace(/^Google\s+/i, '').replace(/\s*\(.*?\)/g, '')}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none text-primary/50" />
            </div>
          )}

          {/* Voice on/off */}
          <button
            onClick={handleVoiceToggle}
            title={voiceOn ? 'Mute voice' : 'Enable voice'}
            className={`p-1.5 rounded border transition-colors ${
              voiceOn
                ? 'border-primary/40 text-primary hover:bg-primary/10'
                : 'border-primary/20 text-primary/30 hover:border-primary/40 hover:text-primary/60'
            }`}
          >
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono opacity-70 shrink-0">
              <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              RECEIVING
            </span>
          )}

          {!isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              className="font-display tracking-wider border-primary/50 text-primary hover:bg-primary/20 hover:border-primary gap-2 h-8 shrink-0"
            >
              <Play className="w-3 h-3" />
              DECODE SIGNAL
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="font-display tracking-wider border-destructive/50 text-destructive hover:bg-destructive/10 gap-2 h-8 shrink-0"
            >
              <Square className="w-3 h-3" />
              HALT
            </Button>
          )}
        </div>
      </div>

      {/* Streaming text area */}
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
          <span className="font-mono text-[9px] opacity-40 tracking-widest">{text.length} CHARS RECEIVED</span>
          <span className="font-mono text-[9px] opacity-40 tracking-widest">{voiceOn ? 'VOICE: ON' : 'VOICE: OFF'}</span>
        </div>
      )}
    </div>
  );
}
