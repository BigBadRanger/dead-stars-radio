import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Radio, Volume2, VolumeX, ChevronDown, Loader2 } from 'lucide-react';
import { useTTS, VOICE_OPTIONS, type OpenAIVoice } from '@/hooks/use-tts';

interface NarrationPanelProps {
  text: string;
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function NarrationPanel({ text, isStreaming, onStart, onStop }: NarrationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [voiceOn, setVoiceOn] = useState(true);

  const { speak, stop, isPlaying, isLoading, voice, setVoice, setEnabled } = useTTS();

  // Stop audio whenever text is cleared (star change, reset, new stream)
  useEffect(() => {
    if (!text) stop();
  }, [text, stop]);

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

  // Called directly from a button click — satisfies browser autoplay policy
  const handlePlayVoice = () => {
    speak(text);
  };

  const narrationDone = !isStreaming && text.length > 0;

  return (
    <div className="flex flex-col h-full border border-primary/30 bg-black/70 rounded-md overflow-hidden">

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-primary/20 flex items-center justify-between bg-primary/10 shrink-0 gap-3 flex-wrap">
        <h3 className="font-display text-sm tracking-[0.2em] flex items-center gap-2 text-primary shrink-0">
          <Radio className="w-4 h-4" />
          AI INTERCEPT LOG
        </h3>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* OpenAI voice selector */}
          {voiceOn && (
            <div className="relative flex items-center">
              <select
                value={voice}
                onChange={e => setVoice(e.target.value as OpenAIVoice)}
                className="appearance-none bg-black/60 border border-primary/30 text-primary font-mono text-[10px] tracking-wider pl-2 pr-6 py-1 rounded cursor-pointer hover:border-primary/60 focus:outline-none focus:border-primary/80 max-w-[180px]"
              >
                {VOICE_OPTIONS.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
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

          {/* Main action button */}
          {isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="font-display tracking-wider border-destructive/50 text-destructive hover:bg-destructive/10 gap-2 h-8 shrink-0"
            >
              <Square className="w-3 h-3" />
              HALT
            </Button>
          ) : (isLoading || isPlaying) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stop}
              className="font-display tracking-wider border-destructive/50 text-destructive hover:bg-destructive/10 gap-2 h-8 shrink-0"
            >
              <Square className="w-3 h-3" />
              HALT AUDIO
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              className="font-display tracking-wider border-primary/50 text-primary hover:bg-primary/20 hover:border-primary gap-2 h-8 shrink-0"
            >
              <Play className="w-3 h-3" />
              DECODE SIGNAL
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

      {/* Footer: PLAY VOICE button + status */}
      {text && (
        <div className="px-4 py-2 border-t border-primary/20 bg-primary/5 shrink-0 flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] opacity-40 tracking-widest">{text.length} CHARS RECEIVED</span>

          {voiceOn && narrationDone && !isPlaying && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayVoice}
              className="font-display tracking-wider border-primary/50 text-primary hover:bg-primary/20 hover:border-primary gap-1.5 h-7 text-[10px] shrink-0"
            >
              <Volume2 className="w-3 h-3" />
              PLAY VOICE
            </Button>
          )}

          {isLoading && (
            <span className="flex items-center gap-1.5 font-mono text-[9px] opacity-60 shrink-0">
              <Loader2 className="w-3 h-3 animate-spin" />
              GENERATING VOICE...
            </span>
          )}

          {isPlaying && (
            <span className="flex items-center gap-1.5 font-mono text-[9px] opacity-70 shrink-0">
              <span className="animate-pulse w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              TRANSMITTING
            </span>
          )}
        </div>
      )}
    </div>
  );
}
