import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDecisionTimeline } from './useDecisionTimeline';
import type { DecisionEvent } from '@/types';

const mockDecisions: DecisionEvent[] = [
  {
    tick: 100,
    timestamp: Date.now(),
    player: 'player1',
    brainName: 'Ollama',
    reasoning: 'Increased military production due to enemy threat',
    commands: ['build_unit', 'assign_unit'],
    commandCount: 2,
    durationMs: 250,
  },
  {
    tick: 101,
    timestamp: Date.now() + 1000,
    player: 'player2',
    brainName: 'Claude',
    reasoning: 'Expanding economy with additional workers',
    commands: ['gather_resources', 'build_worker'],
    commandCount: 2,
    durationMs: 180,
  },
  {
    tick: 102,
    timestamp: Date.now() + 2000,
    player: 'player1',
    brainName: 'Ollama',
    reasoning: 'Defending against incoming attack',
    commands: ['move_units', 'fortify_position'],
    commandCount: 2,
    durationMs: 320,
  },
];

describe('useDecisionTimeline', () => {
  it('should initialize with empty decisions', () => {
    const { result } = renderHook(() => useDecisionTimeline([]));

    expect(result.current.filteredDecisions).toEqual([]);
    expect(result.current.stats.totalDecisions).toBe(0);
  });

  it('should calculate correct statistics', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    expect(result.current.stats.totalDecisions).toBe(3);
    expect(result.current.stats.totalCommands).toBe(6);
    expect(result.current.stats.player1Decisions).toBe(2);
    expect(result.current.stats.player2Decisions).toBe(1);
  });

  it('should filter by player', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    act(() => {
      result.current.updateFilter({ player: 'player1' });
    });

    expect(result.current.filteredDecisions).toHaveLength(2);
    expect(result.current.filteredDecisions.every((d) => d.player === 'player1')).toBe(true);
  });

  it('should filter by brain', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    act(() => {
      result.current.updateFilter({ brain: 'Claude' });
    });

    expect(result.current.filteredDecisions).toHaveLength(1);
    expect(result.current.filteredDecisions[0].brainName).toBe('Claude');
  });

  it('should search by reasoning text', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    act(() => {
      result.current.setSearchText('economy');
    });

    expect(result.current.filteredDecisions).toHaveLength(1);
    expect(result.current.filteredDecisions[0].reasoning).toContain('economy');
  });

  it('should be case-insensitive in search', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    act(() => {
      result.current.setSearchText('MILITARY');
    });

    expect(result.current.filteredDecisions).toHaveLength(1);
    expect(result.current.filteredDecisions[0].reasoning?.toLowerCase()).toContain('military');
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    act(() => {
      result.current.updateFilter({ player: 'player1', brain: 'Ollama' });
      result.current.setSearchText('test');
    });

    act(() => {
      result.current.clearFilter();
    });

    expect(result.current.filteredDecisions).toEqual(mockDecisions);
    expect(result.current.searchText).toBe('');
  });

  it('should extract unique brains', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    expect(result.current.brains).toContain('Ollama');
    expect(result.current.brains).toContain('Claude');
    expect(result.current.brains).toHaveLength(2);
  });

  it('should calculate average duration correctly', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    // (250 + 180 + 320) / 3 = 250
    expect(result.current.stats.averageDuration).toBe(250);
  });

  it('should apply multiple filters simultaneously', () => {
    const { result } = renderHook(() => useDecisionTimeline(mockDecisions));

    act(() => {
      result.current.updateFilter({ player: 'player1', brain: 'Ollama' });
    });

    expect(result.current.filteredDecisions).toHaveLength(2);
    expect(result.current.filteredDecisions.every((d) => d.player === 'player1' && d.brainName === 'Ollama')).toBe(true);
  });
});
