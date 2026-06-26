import React from 'react';
import { Star } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';

interface StarDataPanelProps {
  star: Star;
}

export function StarDataPanel({ star }: StarDataPanelProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
      <DataBox label="DISTANCE" value={`${star.distanceLightYears.toLocaleString()} LY`} />
      <DataBox label="TRANS. AGE" value={`${star.transmissionAgeYears.toLocaleString()} YRS`} />
      <DataBox label="MASS" value={`${star.massSolar || 'UNK'} M☉`} />
      <DataBox label="TEMP" value={`${star.temperature ? star.temperature.toLocaleString() + 'K' : 'UNK'}`} />
      
      <div className="col-span-2 md:col-span-4 mt-2 text-xs opacity-70 border-t border-primary/20 pt-2">
        {star.description}
      </div>
    </div>
  );
}

function DataBox({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <Card className="bg-black/40 border-primary/20">
      <CardContent className="p-3">
        <div className="text-[10px] opacity-60 mb-1 tracking-widest uppercase">{label}</div>
        <div className="text-lg font-bold text-primary">{value}</div>
      </CardContent>
    </Card>
  );
}
