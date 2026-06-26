import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';

interface WaveformVisualizerProps {
  analyser: Tone.Analyser | null;
  isPlaying: boolean;
  color?: string;
  isDead?: boolean;
}

export function WaveformVisualizer({ analyser, isPlaying, color = '#FFB800', isDead = false }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();

      if (analyser && isPlaying) {
        const values = analyser.getValue() as Float32Array;
        const sliceWidth = width * 1.0 / values.length;
        let x = 0;

        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          // v is between -1 and 1
          const y = (v + 1) / 2 * height;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
      } else {
        // Draw flat line when not playing
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Add glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      
      // If dead star, add noise/jitter visually?
      if (isDead && isPlaying) {
         ctx.fillStyle = `rgba(139, 0, 0, ${Math.random() * 0.1})`;
         ctx.fillRect(0, 0, width, height);
      }

      rafId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [analyser, isPlaying, color, isDead]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black/40 border border-white/5 rounded-md p-2">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200} 
        className="w-full h-full block" 
      />
    </div>
  );
}
