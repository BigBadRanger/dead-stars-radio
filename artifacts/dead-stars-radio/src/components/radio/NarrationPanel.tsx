import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, SquareSquare, Volume2 } from 'lucide-react';

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
    <div className="flex flex-col h-full border border-primary/20 bg-card rounded-md overflow-hidden">
      <div className="p-3 border-b border-primary/20 flex items-center justify-between bg-primary/5">
        <h3 className="font-mono text-sm tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          AI INTERCEPT LOG
        </h3>
        {isStreaming && <span className="animate-pulse w-2 h-2 rounded-full bg-primary inline-block"></span>}
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-grow p-4 overflow-y-auto font-sans text-sm leading-relaxed opacity-80 whitespace-pre-wrap font-mono"
      >
        {text || "AWAITING TRANSMISSION..."}
        {isStreaming && <span className="animate-pulse">_</span>}
      </div>

      <div className="p-3 border-t border-primary/20 bg-primary/5 flex justify-end gap-2">
        {!isStreaming ? (
          <Button variant="outline" size="sm" onClick={onStart} className="font-mono border-primary/40 text-primary hover:bg-primary/20">
            <Play className="w-4 h-4 mr-2" />
            DECODE SIGNAL
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onStop} className="font-mono border-destructive/40 text-destructive hover:bg-destructive/20 hover:text-destructive">
            <SquareSquare className="w-4 h-4 mr-2" />
            HALT DECODE
          </Button>
        )}
      </div>
    </div>
  );
}
