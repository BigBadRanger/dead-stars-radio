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

  // If star changes, stop audio and narration
  useEffect(() => {
    if (isPlaying) toggleAudio();
    if (isNarrating) stopNarration();
  }, [selectedStarId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedStarId && isFeaturedLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-primary font-mono crt-overlay">
        <div className="animate-pulse text-xl">BOOTING OBSERVATORY SYSTEMS...</div>
      </div>
    );
  }

  const isDead = star?.isAlive === false;
  const chromeClass = isDead ? "border-destructive/40 dead-star-glow" : "border-primary/20";
  const accentColor = isDead ? "hsl(var(--destructive))" : getSpectralColor(star?.spectralClass);

  return (
    <div className={`min-h-screen w-full bg-background text-primary p-4 md:p-8 flex flex-col relative overflow-hidden transition-colors duration-1000 ${isDead ? 'dark:bg-[#1a0505]' : ''}`}>
      <div className="scanline"></div>
      <div className="crt-overlay"></div>
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
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
        <div className={`flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 border ${chromeClass} bg-black/40 p-4 md:p-6 rounded-lg backdrop-blur-sm`}>
          
          {/* Left Column: Visuals */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="h-[300px] lg:h-[400px]">
              <StarDisplay star={star} imagery={imagery} />
            </div>
            
            {/* Dead Star Warning */}
            <div className={`p-3 border rounded font-mono text-center tracking-widest uppercase font-bold transition-all duration-1000
                ${isDead ? 'bg-destructive/20 border-destructive text-destructive animate-pulse' : 'bg-primary/5 border-primary/30 text-primary/70'}
              `}>
              STATUS: {isDead ? 'SIGNAL DEAD' : 'SIGNAL ALIVE'}
              {isDead && star.deathYear && <div className="text-xs mt-1 font-normal opacity-80">DECEASED ~{Math.abs(star.deathYear)} {star.deathYear < 0 ? 'BCE' : 'CE'}</div>}
            </div>
          </div>

          {/* Center/Right Column: Audio, Stats & Narration */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Audio Section */}
            <div className="border border-white/10 rounded-md bg-black/50 p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center font-mono">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={toggleAudio} 
                    variant="outline" 
                    className={`h-12 px-6 font-display tracking-wider border-2 ${isPlaying ? 'bg-primary text-black border-primary' : 'bg-transparent text-primary border-primary/50'}`}
                  >
                    {isPlaying ? <PowerOff className="w-5 h-5 mr-2" /> : <Power className="w-5 h-5 mr-2" />}
                    {isPlaying ? 'CUT SIGNAL' : 'TUNE IN'}
                  </Button>
                  <div className="flex flex-col">
                    <span className="text-xs opacity-60">CARRIER FREQ</span>
                    <span className="text-xl font-bold">{star.sonificationParams?.baseFrequency || 440} Hz</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[150px] w-full">
                <WaveformVisualizer analyser={analyser} isPlaying={isPlaying} color={accentColor} isDead={isDead} />
              </div>
            </div>

            {/* Data & Intercept */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
              <div className="flex flex-col gap-4">
                <h2 className="font-display text-xl uppercase tracking-widest border-b border-white/10 pb-2">TELEMETRY DATA</h2>
                <StarDataPanel star={star} />
              </div>
              
              <div className="h-full min-h-[300px]">
                 <NarrationPanel 
                    text={narrationText}
                    isStreaming={isNarrating}
                    onStart={() => startNarration(star.description)}
                    onStop={stopNarration}
                 />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
