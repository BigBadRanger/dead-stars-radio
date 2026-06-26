import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { SonificationParams, LightCurveData } from '@workspace/api-client-react';

// Pentatonic scale intervals (semitones from root) — always sounds harmonious
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

function fluxToFreq(flux: number, baseFreq: number): number {
  const idx = Math.round(flux * (PENTATONIC.length - 1));
  const semitones = PENTATONIC[Math.max(0, Math.min(idx, PENTATONIC.length - 1))];
  return baseFreq * Math.pow(2, semitones / 12);
}

export function useAudio(params?: SonificationParams, lightcurve?: LightCurveData) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState<Tone.Analyser | null>(null);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);
  const fxChainRef = useRef<Tone.ToneAudioNode[]>([]);

  const disposeAll = useCallback(() => {
    loopRef.current?.dispose();
    loopRef.current = null;
    synthRef.current?.releaseAll();
    synthRef.current?.dispose();
    synthRef.current = null;
    fxChainRef.current.forEach(node => node.dispose());
    fxChainRef.current = [];
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }, []);

  const initAudio = useCallback(async () => {
    await Tone.start();
    disposeAll();

    const newAnalyser = new Tone.Analyser('waveform', 256);
    setAnalyser(newAnalyser);

    // Build ethereal effects chain
    const reverb = new Tone.Reverb({ decay: 9, preDelay: 0.15, wet: 0.7 });
    await reverb.ready;

    const chorus = new Tone.Chorus({ frequency: 0.35, delayTime: 4, depth: 0.75, wet: 0.5 }).start();
    const delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.28, wet: 0.22 });

    fxChainRef.current = [chorus, delay, reverb, newAnalyser];

    // Lush polyphonic pad — slow attack/release, pure sines
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 2.8, decay: 1.2, sustain: 0.65, release: 4.5 },
      volume: -10,
    });
    synth.chain(chorus, delay, reverb, newAnalyser, Tone.Destination);
    synthRef.current = synth;

    const baseFreq = params?.baseFrequency || 220; // A3 — warm, not shrill

    if (lightcurve && lightcurve.points.length > 0) {
      const pts = lightcurve.points;
      let i = 0;

      const loop = new Tone.Loop((time) => {
        synth.releaseAll(time);
        const pt = pts[i % pts.length];
        const note = fluxToFreq(pt.flux, baseFreq);
        const vel = 0.4 + pt.flux * 0.45;

        // Root note
        synth.triggerAttack(note, time, vel);
        // Soft fifth harmony every other note
        if (i % 2 === 0) {
          synth.triggerAttack(note * 1.498, time + 0.3, vel * 0.5);
        }
        i++;
      }, '2n');

      Tone.Transport.bpm.value = 38;
      loop.start(0);
      Tone.Transport.start();
      loopRef.current = loop;
    } else {
      // Simple sustained pad for stars without light curve data
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
      notes.forEach((n, idx) => {
        synth.triggerAttack(n, `+${idx * 0.5}`, 0.4);
      });
    }

    setIsPlaying(true);
  }, [params, lightcurve, disposeAll]);

  const stopAudio = useCallback(() => {
    disposeAll();
    setIsPlaying(false);
  }, [disposeAll]);

  const toggle = useCallback(() => {
    if (isPlaying) stopAudio();
    else initAudio();
  }, [isPlaying, initAudio, stopAudio]);

  useEffect(() => () => disposeAll(), [disposeAll]);

  return { isPlaying, toggle, analyser };
}
