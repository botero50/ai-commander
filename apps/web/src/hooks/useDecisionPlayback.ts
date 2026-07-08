import { useState, useCallback, useEffect, useRef } from 'react';
import type { DecisionEvent } from '@/types';

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4;
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'finished';

export interface PlaybackFrame {
  tick: number;
  decision: DecisionEvent | null;
  progress: number; // 0-100
  isDecisionTick: boolean;
}

/**
 * Hook for managing decision playback with animation loop
 */
export function useDecisionPlayback(decisions: readonly DecisionEvent[] = [], maxTick: number = 10000) {
  const [state, setState] = useState<PlaybackState>('stopped');
  const [currentTick, setCurrentTick] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const ticksPerMsRef = useRef<number>(1); // Will be calculated based on speed

  // Create decision lookup map for quick access
  const decisionMap = new Map<number, DecisionEvent>();
  decisions.forEach((d) => {
    decisionMap.set(d.tick, d);
  });

  const updateTicksPerMs = useCallback((newSpeed: PlaybackSpeed) => {
    // At 1x speed, advance 1 tick per millisecond (1000 ticks/second)
    // This is aggressive for playback but lets you see decisions quickly
    ticksPerMsRef.current = newSpeed * 1;
  }, []);

  const getCurrentDecision = useCallback((): DecisionEvent | null => {
    return decisionMap.get(currentTick) || null;
  }, [currentTick, decisionMap]);

  const getProgress = useCallback((): number => {
    return Math.round((currentTick / maxTick) * 100);
  }, [currentTick, maxTick]);

  const play = useCallback(() => {
    if (state === 'finished') {
      setCurrentTick(0);
    }
    setState('playing');
    lastTimeRef.current = Date.now();
  }, [state]);

  const pause = useCallback(() => {
    setState('paused');
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    setState('stopped');
    setCurrentTick(0);
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const seek = useCallback((tick: number) => {
    const clamped = Math.max(0, Math.min(tick, maxTick));
    setCurrentTick(clamped);
    if (clamped >= maxTick) {
      setState('finished');
    } else if (state === 'stopped') {
      setState('paused');
    }
  }, [maxTick, state]);

  const nextFrame = useCallback(() => {
    seek(currentTick + 1);
  }, [currentTick, seek]);

  const previousFrame = useCallback(() => {
    seek(Math.max(0, currentTick - 1));
  }, [currentTick, seek]);

  const changeSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeed(newSpeed);
    updateTicksPerMs(newSpeed);
  }, [updateTicksPerMs]);

  // Animation loop
  useEffect(() => {
    if (state !== 'playing') return;

    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      const ticksToAdvance = Math.floor(deltaTime * ticksPerMsRef.current);
      const newTick = currentTick + ticksToAdvance;

      if (newTick >= maxTick) {
        setCurrentTick(maxTick);
        setState('finished');
      } else {
        setCurrentTick(newTick);
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, currentTick, maxTick]);

  const getCurrentFrame = (): PlaybackFrame => {
    const decision = getCurrentDecision();
    return {
      tick: currentTick,
      decision,
      progress: getProgress(),
      isDecisionTick: !!decision,
    };
  };

  return {
    state,
    currentTick,
    speed,
    play,
    pause,
    stop,
    seek,
    nextFrame,
    previousFrame,
    changeSpeed,
    getCurrentFrame,
    maxTick,
  };
}
