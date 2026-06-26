import React, { useState } from 'react';
import { useListStars, useSearchStars } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, ChevronDown, Activity, Star as StarIcon } from 'lucide-react';

interface StarSelectorProps {
  selectedStarId?: number;
  onSelectStar: (id: number) => void;
}

export function StarSelector({ selectedStarId, onSelectStar }: StarSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: curatedStars, isLoading: isLoadingCurated } = useListStars(undefined, { query: { enabled: open && !searchQuery } });
  const { data: searchResults, isLoading: isLoadingSearch } = useSearchStars({ q: searchQuery }, { query: { enabled: open && searchQuery.length > 2 } });

  const selectedStar = curatedStars?.find(s => s.id === selectedStarId) || searchResults?.find(s => s.id === selectedStarId);
  const displayStars = searchQuery.length > 2 ? searchResults : curatedStars;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox" 
          aria-expanded={open} 
          className="w-[300px] justify-between font-mono bg-card border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
        >
          {selectedStar ? (
            <span className="flex items-center gap-2 truncate">
              <StarIcon className="w-4 h-4 shrink-0" />
              {selectedStar.name} {selectedStar.commonName ? `(${selectedStar.commonName})` : ''}
            </span>
          ) : (
            "TUNING FREQUENCY..."
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 border-primary/30 bg-card/95 backdrop-blur-md">
        <Command className="bg-transparent text-primary">
          <CommandInput 
            placeholder="Search celestial catalog..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="font-mono text-primary placeholder:text-primary/40"
          />
          <CommandList className="border-t border-primary/20">
            {isLoadingCurated || isLoadingSearch ? (
              <div className="p-4 text-center font-mono text-xs opacity-50 flex items-center justify-center gap-2">
                <Activity className="w-4 h-4 animate-pulse" />
                SCANNING SECTOR...
              </div>
            ) : (
              <CommandEmpty className="py-6 text-center font-mono text-sm opacity-50">NO SIGNALS DETECTED.</CommandEmpty>
            )}
            
            {displayStars && displayStars.length > 0 && (
              <CommandGroup heading={searchQuery ? "Deep Space Results" : "Curated Frequencies"} className="text-primary/60 font-mono">
                {displayStars.map((star) => (
                  <CommandItem
                    key={star.id}
                    value={star.name}
                    onSelect={() => {
                      onSelectStar(star.id);
                      setOpen(false);
                    }}
                    className="font-mono text-primary data-[selected=true]:bg-primary/20 data-[selected=true]:text-primary"
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{star.name} {star.commonName && <span className="opacity-70 font-normal">({star.commonName})</span>}</span>
                      <span className="text-xs opacity-60">Class {star.spectralClass} • {star.distanceLightYears.toLocaleString()} LY</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
