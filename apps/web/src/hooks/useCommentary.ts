import { useState, useEffect } from 'react';
import type { CommentaryEntry } from '@ai-commander/zeroad-adapter';
import type { GameSession } from '@/types';

/**
 * Hook for real-time live commentary with subscription
 * Connects to LiveCommentary service for esports-style narration
 */
export function useCommentary(gameSession: GameSession | null) {
  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to live commentary
  useEffect(() => {
    if (!gameSession) {
      setIsLoading(false);
      return;
    }

    try {
      const commentaryService = gameSession.getCommentaryService?.();
      if (!commentaryService) {
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      const unsubscribe = commentaryService.subscribe(setEntries);
      return unsubscribe;
    } catch (err) {
      console.error('Failed to subscribe to commentary:', err);
      setIsLoading(false);
    }
  }, [gameSession]);

  return {
    entries,
    isLoading,
  };
}
