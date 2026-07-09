import { useMemo } from 'react';
import type { NarrativeEntry } from '@ai-commander/zeroad-adapter';
import { NarrativeGenerator } from '@ai-commander/zeroad-adapter';
import type { TournamentMatchResult } from '@ai-commander/zeroad-adapter';

/**
 * Hook for generating match narrative from match result
 * Generates post-game narrative explaining the match arc and why winner won
 */
export function useMatchNarrative(matchResult: TournamentMatchResult | null) {
  const narrative = useMemo(() => {
    if (!matchResult) {
      return [];
    }

    try {
      const generator = new NarrativeGenerator(matchResult);
      return generator.generate();
    } catch (err) {
      console.error('Failed to generate narrative:', err);
      return [];
    }
  }, [matchResult]);

  return narrative;
}
