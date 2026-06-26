import React, { useState, useEffect } from 'react';
import { 
  useGetFeaturedStar, 
  useGetStar, 
  useGetStarImagery, 
  useGetStarLightCurve, 
  useGetStats 
} from '@workspace/api-client-react';

import { StarSelector } from '@/components/radio/StarSelector';
import { WaveformVisualizer } from '@/components/radio/WaveformVisualizer';
import { StarDisplay } from '@/components/radio/StarDisplay';
import { NarrationPanel } from '@/components/radio/NarrationPanel';
import { StarDataPanel } from '@/components/radio/StarDataPanel';
import { StarfieldCanvas } from '@/components/radio/StarfieldCanvas';
import { useAudio } from '@/hooks/use-audio';
import { useNarration } from '@/hooks/use-narration';
import { getGetStarQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Power, PowerOff } from 'lucide-react';
import { getSpectralColor } from '@/lib/spectral-colors';

export default function RadioPage() {
  const [selectedStarId, setSelectedStarId] = useState<number | undefined>(undefined);

  const { data: featuredStar, isLoading: isFeaturedLoading } = useGetFeaturedStar({ query: { enabled: !selectedStarId } });
  const { data: stats } = useGetStats();

  useEffect(() => {
    if (featuredStar && !selectedStarId) {
      setSelectedStarId(featuredStar.id);
    }
  }, [featuredStar, selectedStarId]);

  const { data: star, isLoading: isStarLoading } = useGetStar(selectedStarId as number, { query: { enabled: !!selectedStarId, queryKey: getGetStarQueryKey(selectedStarId as number) } });
  const { data: imagery } = useGetStarImagery(selectedStarId as number, { query: { enabled: !!selectedStarId } });
  const { data: lightcurve } = useGetStarLightCurve(selectedStarId as number, { query: { enabled: !!selectedStarId } });

  const { isPlaying, toggle: toggleAudio, analyser } = useAudio(star?.sonificationParams, lightcurve);
  const { text: narrationText, isStreaming: isNarrating, startStream: startNarration, stopStream: stopNarration } = useNarration(selectedStarId);

  useEffect(() => {
    if (isPlaying) toggleAudio();
    if (isNarrating) stopNarration();
  }, [selectedStarId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedStarId && isFeaturedLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-primary font-mono">
        <StarfieldCanvas />
        <div className="animate-pulse text-xl relative z-10">BOOTING OBSERVATORY SYSTEMS...</div>
      </div>
    );
  }

  const isDead = star?.isAlive === false;
  const chromeClass = isDead ? "border-destructive/40 dead-star-glow" : "border-primary/20";
  const accentColor = isDead ? "hsl(var(--destructive))" : getSpectralColor(star?.spectralClass);

  return (
    <div className={`min-h-screen w-full bg-background text-primary p-4 md:p-6 flex flex-col relative overflow-hidden transition-colors duration-1000`}>
      {/* Animated starfield — full page background */}
      <StarfieldCanvas />

      <div className="scanline" style={{ zIndex: 50 }} />
      <div className="crt-overlay" />

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-black tracking-widest drop-shadow-[0_0_10px_rgba(255,184,0,0.5)]">
            DEAD STARS RADIO
          </h1>
          <div className="font-mono text-xs opacity-60 tracking-[0.2em] mt-1 flex gap-4">
            <span>SYS.VER 4.2.1</span>
            {stats && (
              <span>CATALOG: {stats.totalStars} | DEAD: {stats.deadStars}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StarSelector selectedStarId={selectedStarId} onSelectStar={setSelectedStarId} />
        </div>
      </header>

      {/* Main Panel */}
      {star && (
        <div className={`flex-grow grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10 border ${chromeClass} bg-black/60 p-4 md:p-5 rounded-lg backdrop-blur-sm`}>

          {/* Left Column: Visuals + status */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex-1 min-h-[260px] max-h-[340px]">
              <StarDisplay star={star} imagery={imagery} />
            </div>

            <div className={`p-3 border rounded font-mono text-center tracking-widest uppercase font-bold transition-all duration-1000
                ${isDead ? 'bg-destructive/20 border-destructive text-destructive animate-pulse' : 'bg-primary/5 border-primary/30 text-primary/70'}
              `}>
              STATUS: {isDead ? 'SIGNAL DEAD' : 'SIGNAL ALIVE'}
              {isDead && star.deathYear && (
                <div className="text-xs mt-1 font-normal opacity-80">
                  DECEASED ~{Math.abs(star.deathYear)} {star.deathYear < 0 ? 'BCE' : 'CE'}
                </div>
              )}
            </div>

            {/* Stat cards in left column on large screens */}
            <div className="hidden lg:block">
              <StarDataPanel star={star} />
            </div>
          </div>

          {/* Right Column: Audio + Narration */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Audio Section */}
            <div className="border border-white/10 rounded-md bg-black/50 p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center font-mono">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={toggleAudio}
                    variant="outline"
                    className={`h-11 px-5 font-display tracking-wider border-2 ${isPlaying ? 'bg-primary text-black border-primary' : 'bg-transparent text-primary border-primary/50'}`}
                  >
                    {isPlaying ? <PowerOff className="w-5 h-5 mr-2" /> : <Power className="w-5 h-5 mr-2" />}
                    {isPlaying ? 'CUT SIGNAL' : 'TUNE IN'}
                  </Button>
                  <div className="flex flex-col">
                    <span className="text-xs opacity-60">CARRIER FREQ</span>
                    <span className="text-xl font-bold">{star.sonificationParams?.baseFrequency || 440} Hz</span>
                  </div>
                </div>
                <div className="font-mono text-xs opacity-50 text-right hidden md:block">
                  <div>{star.spectralClass} CLASS</div>
                  <div>{star.name.toUpperCase()}</div>
                </div>
              </div>

              <div className="h-[120px] w-full">
                <WaveformVisualizer analyser={analyser} isPlaying={isPlaying} color={accentColor} isDead={isDead} />
              </div>
            </div>

            {/* Stat cards — shown here on mobile, hidden on lg (shown in left col there) */}
            <div className="lg:hidden">
              <StarDataPanel star={star} />
            </div>

            {/* Narration Panel — full width, prominent, always visible */}
            <div className="flex-1 min-h-[280px]">
              <NarrationPanel
                text={narrationText}
                isStreaming={isNarrating}
                onStart={() => startNarration(star.description)}
                onStop={stopNarration}
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
