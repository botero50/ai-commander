import { useState, useCallback, useMemo } from 'react';
import type { DecisionEvent } from '@/types';

export interface TimelineStats {
  totalDecisions: number;
  averageDuration: number;
  totalCommands: number;
  averageCommandsPerDecision: number;
  player1Decisions: number;
  player2Decisions: number;
}

export interface DecisionFilter {
  player?: 'player1' | 'player2';
  brain?: string;
  searchText?: string;
}

/**
 * Hook for managing decision timeline data and filtering
 */
export function useDecisionTimeline(decisions: readonly DecisionEvent[] = []) {
  const [filter, setFilter] = useState<DecisionFilter>({});
  const [searchText, setSearchText] = useState('');

  // Filter decisions based on current filter
  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      // Player filter
      if (filter.player && decision.player !== filter.player) {
        return false;
      }

      // Brain filter
      if (filter.brain && decision.brainName !== filter.brain) {
        return false;
      }

      // Search filter
      if (searchText && !decision.reasoning?.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [decisions, filter, searchText]);

  // Calculate statistics
  const stats = useMemo<TimelineStats>(() => {
    const totalDecisions = decisions.length;
    const totalDuration = decisions.reduce((sum, d) => sum + d.durationMs, 0);
    const totalCommands = decisions.reduce((sum, d) => sum + d.commandCount, 0);

    return {
      totalDecisions,
      averageDuration: totalDecisions > 0 ? Math.round(totalDuration / totalDecisions) : 0,
      totalCommands,
      averageCommandsPerDecision: totalDecisions > 0 ? Math.round(totalCommands / totalDecisions * 100) / 100 : 0,
      player1Decisions: decisions.filter((d) => d.player === 'player1').length,
      player2Decisions: decisions.filter((d) => d.player === 'player2').length,
    };
  }, [decisions]);

  // Get unique brains
  const brains = useMemo(() => {
    return Array.from(new Set(decisions.map((d) => d.brainName)));
  }, [decisions]);

  const updateFilter = useCallback((newFilter: Partial<DecisionFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }));
  }, []);

  const clearFilter = useCallback(() => {
    setFilter({});
    setSearchText('');
  }, []);

  return {
    filteredDecisions,
    stats,
    brains,
    filter,
    searchText,
    setSearchText,
    updateFilter,
    clearFilter,
  };
}
