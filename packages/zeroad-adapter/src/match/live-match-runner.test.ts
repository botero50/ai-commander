/**
 * Test: Live Match Runner with Decision Overlay
 *
 * Validates:
 * 1. Live match config with decision callback
 * 2. Decision overlay integration
 * 3. Real-time decision notifications
 * 4. Match result includes overlay access
 */

import { describe, it, expect } from 'vitest';
import { DecisionOverlay, DecisionEvent } from './decision-overlay.js';
import type { LiveMatchConfig, LiveMatchResult } from './live-match-runner.js';
import type { BrainInterface, MatchResult } from './simple-match.js';

describe('Live Match Runner with Decision Overlay', () => {
  // Mock brain for testing
  const mockBrain1: BrainInterface = {
    name: 'TestBrain1',
    version: '1.0',
    decide: async () => ({
      reasoning: 'Test decision 1',
      commands: ['move', 'attack'],
    }),
  };

  const mockBrain2: BrainInterface = {
    name: 'TestBrain2',
    version: '1.0',
    decide: async () => ({
      reasoning: 'Test decision 2',
      commands: ['defend'],
    }),
  };

  it('should include decision overlay in live match config', () => {
    const decisions: DecisionEvent[] = [];

    const config: LiveMatchConfig = {
      brain1: mockBrain1,
      brain2: mockBrain2,
      maxTicks: 100,
      keepWindowOpen: true,
      onDecision: (event) => {
        decisions.push(event);
      },
    };

    expect(config.onDecision).toBeDefined();
    expect(config.brain1.name).toBe('TestBrain1');
  });

  it('should structure live match result with overlay', () => {
    const overlay = new DecisionOverlay();

    overlay.recordDecision(1, 'player1', 'Brain1', 'Test reasoning', ['cmd1'], 100);
    overlay.recordDecision(2, 'player2', 'Brain2', 'Test reasoning', ['cmd2'], 120);

    const matchResult: MatchResult = {
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

    const result: LiveMatchResult = {
      ...matchResult,
      overlay,
    };

    expect(result.overlay).toBeDefined();
    expect(result.overlay.getStats().totalDecisions).toBe(2);
    expect(result.winner).toBe('TestBrain1');
  });

  it('should allow decision callback subscription', async () => {
    const decisions: DecisionEvent[] = [];
    const overlay = new DecisionOverlay();

    const config: LiveMatchConfig = {
      brain1: mockBrain1,
      brain2: mockBrain2,
      onDecision: (event) => {
        decisions.push(event);
      },
    };

    // Simulate decision callback
    if (config.onDecision) {
      overlay.subscribe(config.onDecision);
    }

    overlay.recordDecision(1, 'player1', mockBrain1.name, 'reasoning', ['move'], 100);
    overlay.recordDecision(2, 'player2', mockBrain2.name, 'reasoning', ['defend'], 120);

    // Give async callbacks time to process
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(decisions).toHaveLength(2);
    expect(decisions[0].brainName).toBe('TestBrain1');
    expect(decisions[1].brainName).toBe('TestBrain2');
  });

  it('should capture decision metadata in overlay', () => {
    const overlay = new DecisionOverlay();

    overlay.recordDecision(
      42,
      'player1',
      'OllamaBrain',
      'Complex reasoning about strategy',
      ['move_unit_to_position', 'queue_attack_command'],
      256
    );

    const decisions = overlay.getDecisions();
    expect(decisions).toHaveLength(1);

    const decision = decisions[0];
    expect(decision.tick).toBe(42);
    expect(decision.player).toBe('player1');
    expect(decision.brainName).toBe('OllamaBrain');
    expect(decision.reasoning).toContain('Complex reasoning');
    expect(decision.commandCount).toBe(2);
    expect(decision.durationMs).toBe(256);
    expect(decision.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should filter decisions by brain name', () => {
    const overlay = new DecisionOverlay();

    overlay.recordDecision(1, 'player1', 'Brain1', 'test', [], 100);
    overlay.recordDecision(2, 'player2', 'Brain2', 'test', [], 100);
    overlay.recordDecision(3, 'player1', 'Brain1', 'test', [], 100);

    const brain1Decisions = overlay.getDecisions({ brainName: 'Brain1' });
    expect(brain1Decisions).toHaveLength(2);
    expect(brain1Decisions.every((d) => d.brainName === 'Brain1')).toBe(true);
  });

  it('should retrieve latest decisions for UI display', () => {
    const overlay = new DecisionOverlay();

    for (let i = 1; i <= 20; i++) {
      overlay.recordDecision(i, i % 2 === 0 ? 'player2' : 'player1', 'Brain', 'test', [], 100);
    }

    const latest3 = overlay.getLatestDecisions(3);
    expect(latest3).toHaveLength(3);
    expect(latest3[0].tick).toBe(18);
    expect(latest3[1].tick).toBe(19);
    expect(latest3[2].tick).toBe(20);
  });

  it('should provide decision statistics', () => {
    const overlay = new DecisionOverlay();

    overlay.recordDecision(1, 'player1', 'Brain1', 'test', ['c1'], 100);
    overlay.recordDecision(2, 'player1', 'Brain1', 'test', ['c1', 'c2'], 120);
    overlay.recordDecision(3, 'player2', 'Brain2', 'test', ['c1', 'c2', 'c3'], 140);

    const stats = overlay.getStats();
    expect(stats.totalDecisions).toBe(3);
    expect(stats.player1Decisions).toBe(2);
    expect(stats.player2Decisions).toBe(1);
    expect(stats.averageCommandsPerDecision).toBe((1 + 2 + 3) / 3); // 2
    expect(stats.latestTick).toBe(3);
  });

  it('should clear decisions for new match', () => {
    const overlay = new DecisionOverlay();

    overlay.recordDecision(1, 'player1', 'Brain1', 'test', [], 100);
    overlay.recordDecision(2, 'player2', 'Brain2', 'test', [], 100);

    expect(overlay.getDecisions()).toHaveLength(2);

    overlay.clear();

    expect(overlay.getDecisions()).toHaveLength(0);
    expect(overlay.getStats().totalDecisions).toBe(0);
  });
});
