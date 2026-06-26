import React from 'react';
import { StarImagery, Star } from '@workspace/api-client-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSpectralColor } from '@/lib/spectral-colors';

interface StarDisplayProps {
  star: Star;
  imagery?: StarImagery;
}

export function StarDisplay({ star, imagery }: StarDisplayProps) {
  const color = getSpectralColor(star.spectralClass);
  
  // Create a procedural background if no image is available
  const proceduralBg = `radial-gradient(circle at center, ${color} 0%, transparent 60%)`;

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="font-display text-xl uppercase tracking-widest text-primary">VISUAL TELEMETRY</h2>
        <span className="font-mono text-xs opacity-60">SPECTRAL CLASS: {star.spectralClass}</span>
      </div>

      <div className="relative flex-grow rounded border border-white/10 overflow-hidden bg-black/60 flex items-center justify-center min-h-[300px]">
        {imagery ? (
          <Tabs defaultValue="visible" className="w-full h-full flex flex-col">
            <div className="absolute top-2 right-2 z-10">
              <TabsList className="bg-black/60 border border-primary/20 font-mono">
                <TabsTrigger value="visible" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">VIS</TabsTrigger>
                {imagery.infrared && <TabsTrigger value="ir" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">IR</TabsTrigger>}
                {imagery.xray && <TabsTrigger value="xray" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">X-RAY</TabsTrigger>}
                {imagery.generated && <TabsTrigger value="gen" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">SIM</TabsTrigger>}
              </TabsList>
            </div>
            
            <TabsContent value="visible" className="flex-grow m-0 p-0 relative h-full">
              {imagery.visibleLight ? (
                <img src={imagery.visibleLight} alt={star.name} className="w-full h-full object-cover opacity-80 mix-blend-screen" />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-50" style={{ background: proceduralBg }}>NO VIS DATA</div>
              )}
            </TabsContent>
            
            {imagery.infrared && (
              <TabsContent value="ir" className="flex-grow m-0 p-0 h-full">
                <img src={imagery.infrared} alt={`${star.name} Infrared`} className="w-full h-full object-cover opacity-80 mix-blend-screen" style={{ filter: 'hue-rotate(90deg)' }} />
              </TabsContent>
            )}
            
            {imagery.xray && (
              <TabsContent value="xray" className="flex-grow m-0 p-0 h-full">
                <img src={imagery.xray} alt={`${star.name} X-Ray`} className="w-full h-full object-cover opacity-80 mix-blend-screen" style={{ filter: 'invert(1)' }} />
              </TabsContent>
            )}

            {imagery.generated && (
              <TabsContent value="gen" className="flex-grow m-0 p-0 h-full">
                <img src={imagery.generated} alt={`${star.name} Generated`} className="w-full h-full object-cover opacity-80 mix-blend-screen" />
              </TabsContent>
            )}
          </Tabs>
        ) : star.imageUrl || star.generatedImageUrl ? (
          <img src={star.imageUrl || star.generatedImageUrl || ''} alt={star.name} className="w-full h-full object-cover opacity-80 mix-blend-screen" />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0" style={{ background: proceduralBg, opacity: 0.3, filter: 'blur(40px)' }}></div>
             <div className="w-32 h-32 rounded-full" style={{ background: color, boxShadow: `0 0 100px ${color}` }}></div>
          </div>
        )}
        
        {/* CRT Scanline effect over image */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
      </div>
    </div>
  );
}
