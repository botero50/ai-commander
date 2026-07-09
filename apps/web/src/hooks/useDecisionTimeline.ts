import { useState, useEffect, useMemo } from 'react';
import type { TimelineEntry } from '@ai-commander/zeroad-adapter';
import type { GameSession } from '@/types';

/**
 * Hook for real-time decision timeline with player filtering
 */
export function useDecisionTimeline(gameSession: GameSession | null) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [filter, setFilter] = useState<{ player?: 'player1' | 'player2' }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to live timeline
  useEffect(() => {
    if (!gameSession) {
      setIsLoading(false);
      return;
    }

    try {
      const timeline = gameSession.getDecisionTimeline?.();
      if (!timeline) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      const unsubscribe = timeline.subscribe(setEntries);
      return unsubscribe;
    } catch (err) {
      console.error('Failed to subscribe to timeline:', err);
      setIsLoading(false);
    }
  }, [gameSession]);

  // Filter by player
  const filteredEntries = useMemo(() => {
    if (!filter.player) return entries;
    return entries.filter((e) => e.player === filter.player);
  }, [entries, filter]);

  // Count entries per player
  const counts = useMemo(() => {
    return {
      all: entries.length,
      player1: entries.filter((e) => e.player === 'player1').length,
      player2: entries.filter((e) => e.player === 'player2').length,
    };
  }, [entries]);

  return {
    entries,
    filteredEntries,
    filter,
    setPlayerFilter: (player?: 'player1' | 'player2') => setFilter({ player }),
    isLoading,
    counts,
  };
}
