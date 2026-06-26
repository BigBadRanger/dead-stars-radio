import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { SonificationParams, LightCurveData } from '@workspace/api-client-react';

export function useAudio(params?: SonificationParams, lightcurve?: LightCurveData) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState<Tone.Analyser | null>(null);
  
  const synthRef = useRef<Tone.Synth | Tone.FMSynth | Tone.AMSynth | null>(null);
  const lfoRef = useRef<Tone.LFO | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  // Initialize Audio
  const initAudio = useCallback(async () => {
    await Tone.start();
    
    if (synthRef.current) {
      synthRef.current.dispose();
    }
    if (lfoRef.current) {
      lfoRef.current.dispose();
    }
    if (loopRef.current) {
      loopRef.current.dispose();
      Tone.Transport.stop();
    }

    const newAnalyser = new Tone.Analyser("waveform", 256);
    setAnalyser(newAnalyser);

    // Create synth based on timbre
    const timbre = (params?.timbre || 'sine') as Tone.ToneOscillatorType;
    let synth: Tone.Synth | Tone.FMSynth | Tone.AMSynth;

    if (timbre === 'fm') {
      synth = new Tone.FMSynth({
        oscillator: { type: 'sine' },
        modulation: { type: 'square' },
        modulationIndex: 2
      }).chain(newAnalyser, Tone.Destination);
    } else {
      synth = new Tone.Synth({
        oscillator: { type: timbre }
      }).chain(newAnalyser, Tone.Destination);
    }
    
    synthRef.current = synth;

    const baseFreq = params?.baseFrequency || 440;
    
    if (params?.pulseRate) {
      // Pulse effect
      const lfo = new Tone.LFO(params.pulseRate / 60, baseFreq * 0.9, baseFreq * 1.1).start();
      lfo.connect(synth.frequency);
      lfoRef.current = lfo;
      synth.triggerAttack(baseFreq);
    } else if (lightcurve && lightcurve.points.length > 0) {
      // Modulate frequency based on light curve
      let i = 0;
      const pts = lightcurve.points;
      
      const loop = new Tone.Loop((time) => {
        const pt = pts[i % pts.length];
        // simple modulation based on flux
        const modFreq = baseFreq * (0.8 + (pt.flux * 0.4)); 
        synth.setNote(modFreq, time);
        i++;
      }, "8n");
      
      synth.triggerAttack(baseFreq);
      loop.start(0);
      Tone.Transport.start();
      loopRef.current = loop;
    } else {
      synth.triggerAttack(baseFreq);
    }

    setIsPlaying(true);
  }, [params, lightcurve]);

  const stopAudio = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.triggerRelease();
      setTimeout(() => synthRef.current?.dispose(), 500);
      synthRef.current = null;
    }
    if (lfoRef.current) {
      lfoRef.current.dispose();
      lfoRef.current = null;
    }
    if (loopRef.current) {
      loopRef.current.dispose();
      Tone.Transport.stop();
      loopRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stopAudio();
    } else {
      initAudio();
    }
  }, [isPlaying, initAudio, stopAudio]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return { isPlaying, toggle, analyser };
}
