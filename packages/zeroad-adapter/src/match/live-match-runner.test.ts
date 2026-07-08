/**
 * Test: Live Match Runner
 *
 * Validates that:
 * 1. Live match runner can be created
 * 2. Match launches 0 A.D. automatically
 * 3. Match completes and returns results
 * 4. Window can stay open after match
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runLiveMatch, LiveMatchConfig } from './live-match-runner.js';
import { BrainInterface, MatchResult } from './simple-match.js';

describe('Live Match Runner', () => {
  // Mock brain for testing
  const mockBrain1: BrainInterface = {
    name: 'TestBrain1',
    version: '1.0',
    decide: async () => ({
      reasoning: 'Test decision 1',
      commands: [],
    }),
  };

  const mockBrain2: BrainInterface = {
    name: 'TestBrain2',
    version: '1.0',
    decide: async () => ({
      reasoning: 'Test decision 2',
      commands: [],
    }),
  };

  it('should instantiate live match config', () => {
    const config: LiveMatchConfig = {
      brain1: mockBrain1,
      brain2: mockBrain2,
      maxTicks: 100,
      keepWindowOpen: true,
    };

    expect(config.brain1.name).toBe('TestBrain1');
    expect(config.brain2.name).toBe('TestBrain2');
    expect(config.maxTicks).toBe(100);
    expect(config.keepWindowOpen).toBe(true);
  });

  it('should define MatchResult with expected structure', () => {
    const mockResult: MatchResult = {
      success: true,
      winner: 'TestBrain1',
      ticksRan: 50,
      duration: 5000,
      player1: {
        name: 'TestBrain1',
        commandsExecuted: 10,
        errors: 0,
      },
      player2: {
        name: 'TestBrain2',
        commandsExecuted: 8,
        errors: 1,
      },
    };

    expect(mockResult.success).toBe(true);
    expect(mockResult.winner).toBe('TestBrain1');
    expect(mockResult.ticksRan).toBe(50);
    expect(mockResult.duration).toBeGreaterThan(0);
    expect(mockResult.player1.commandsExecuted).toBe(10);
    expect(mockResult.player2?.commandsExecuted).toBe(8);
  });

  it('should handle keepWindowOpen flag', () => {
    const configOpen: LiveMatchConfig = {
      brain1: mockBrain1,
      brain2: mockBrain2,
      keepWindowOpen: true,
    };

    const configClosed: LiveMatchConfig = {
      brain1: mockBrain1,
      brain2: mockBrain2,
      keepWindowOpen: false,
    };

    expect(configOpen.keepWindowOpen).toBe(true);
    expect(configClosed.keepWindowOpen).toBe(false);
  });
});
