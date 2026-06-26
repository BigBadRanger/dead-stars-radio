import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Radio } from 'lucide-react';

interface NarrationPanelProps {
  text: string;
  isStreaming: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function NarrationPanel({ text, isStreaming, onStart, onStop }: NarrationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="flex flex-col h-full border border-primary/30 bg-black/70 rounded-md overflow-hidden">

      {/* Header — always visible, button lives here */}
      <div className="px-4 py-2.5 border-b border-primary/20 flex items-center justify-between bg-primary/10 shrink-0">
        <h3 className="font-display text-sm tracking-[0.2em] flex items-center gap-2 text-primary">
          <Radio className="w-4 h-4" />
          AI INTERCEPT LOG
        </h3>

        <div className="flex items-center gap-3">
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
              onClick={onStop}
              className="font-display tracking-wider border-destructive/50 text-destructive hover:bg-destructive/10 gap-2 h-8"
            >
              <Square className="w-3 h-3" />
              HALT
            </Button>
          )}
        </div>
      </div>

      {/* Streaming text — scrolls as Claude narrates */}
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
              Press DECODE SIGNAL above to receive Claude AI narration about whether this star still exists
            </div>
          </div>
        )}
      </div>

      {/* Footer — char count only, no button here */}
      {text && (
        <div className="px-4 py-2 border-t border-primary/20 bg-primary/5 shrink-0">
          <span className="font-mono text-[9px] opacity-40 tracking-widest">
            {text.length} CHARS RECEIVED
          </span>
        </div>
      )}
    </div>
  );
}
