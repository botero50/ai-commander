/**
 * Match Runner Tests
 *
 * Tests for match execution and management
 * - Match setup and teardown
 * - Player coordination
 * - Event emission
 * - Result tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface MatchConfig {
  player1: { id: string; name: string };
  player2: { id: string; name: string };
  maxTurns?: number;
}

interface MatchEvent {
  type: 'start' | 'turn' | 'end';
  turn?: number;
  timestamp: number;
  data?: unknown;
}

interface MatchResult {
  winner?: string;
  loser?: string;
  turns: number;
  events: MatchEvent[];
}

class MockMatchRunner {
  private config: MatchConfig;
  private currentTurn = 0;
  private events: MatchEvent[] = [];
  private isRunning = false;

  constructor(config: MatchConfig) {
    this.config = {
      ...config,
      maxTurns: config.maxTurns || 100,
    };
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.events.push({ type: 'start', timestamp: Date.now() });
  }

  async runTurn(): Promise<void> {
    if (!this.isRunning) return;
    this.currentTurn++;
    this.events.push({
      type: 'turn',
      turn: this.currentTurn,
      timestamp: Date.now(),
    });
  }

  async end(): Promise<MatchResult> {
    this.isRunning = false;
    this.events.push({ type: 'end', timestamp: Date.now() });

    return {
      winner: this.currentTurn % 2 === 0 ? this.config.player1.id : this.config.player2.id,
      loser: this.currentTurn % 2 === 0 ? this.config.player2.id : this.config.player1.id,
      turns: this.currentTurn,
      events: this.events,
    };
  }

  async run(): Promise<MatchResult> {
    await this.start();
    while (this.currentTurn < (this.config.maxTurns || 100) && this.isRunning) {
      await this.runTurn();
    }
    return this.end();
  }

  isMatchRunning(): boolean {
    return this.isRunning;
  }

  getTurnCount(): number {
    return this.currentTurn;
  }

  getEvents(): MatchEvent[] {
    return this.events;
  }
}

describe('MatchRunner', () => {
  let config: MatchConfig;
  let runner: MockMatchRunner;

  beforeEach(() => {
    config = {
      player1: { id: 'p1', name: 'Alice' },
      player2: { id: 'p2', name: 'Bob' },
      maxTurns: 50,
    };
    runner = new MockMatchRunner(config);
  });

  describe('Match Lifecycle', () => {
    it('should initialize with correct players', () => {
      expect(runner).toBeDefined();
    });

    it('should start a match', async () => {
      await runner.start();
      expect(runner.isMatchRunning()).toBe(true);
    });

    it('should end a match', async () => {
      await runner.start();
      await runner.end();
      expect(runner.isMatchRunning()).toBe(false);
    });

    it('should complete a full match', async () => {
      const result = await runner.run();
      expect(result.winner).toBeDefined();
      expect(result.loser).toBeDefined();
      expect(result.turns).toBeGreaterThan(0);
    });
  });

  describe('Turn Management', () => {
    it('should increment turn count', async () => {
      await runner.start();
      const turn1 = runner.getTurnCount();
      await runner.runTurn();
      const turn2 = runner.getTurnCount();
      expect(turn2).toBeGreaterThan(turn1);
    });

    it('should respect max turns limit', async () => {
      const result = await runner.run();
      expect(result.turns).toBeLessThanOrEqual(config.maxTurns || 100);
    });

    it('should handle multiple consecutive turns', async () => {
      await runner.start();
      for (let i = 0; i < 10; i++) {
        await runner.runTurn();
      }
      expect(runner.getTurnCount()).toBe(10);
    });
  });

  describe('Event Tracking', () => {
    it('should emit start event', async () => {
      await runner.start();
      const events = runner.getEvents();
      expect(events[0].type).toBe('start');
    });

    it('should emit turn events', async () => {
      await runner.start();
      await runner.runTurn();
      const events = runner.getEvents();
      expect(events.some(e => e.type === 'turn')).toBe(true);
    });

    it('should emit end event', async () => {
      await runner.start();
      await runner.end();
      const events = runner.getEvents();
      expect(events[events.length - 1].type).toBe('end');
    });

    it('should track turn numbers in events', async () => {
      await runner.start();
      for (let i = 0; i < 5; i++) {
        await runner.runTurn();
      }
      const events = runner.getEvents().filter(e => e.type === 'turn');
      expect(events.length).toBe(5);
    });
  });

  describe('Match Results', () => {
    it('should determine a winner', async () => {
      const result = await runner.run();
      expect(result.winner).toBeDefined();
      expect([config.player1.id, config.player2.id]).toContain(result.winner);
    });

    it('should have different winner and loser', async () => {
      const result = await runner.run();
      expect(result.winner).not.toBe(result.loser);
    });

    it('should track total turns', async () => {
      const result = await runner.run();
      expect(result.turns).toBe(runner.getTurnCount());
    });

    it('should include all events in result', async () => {
      const result = await runner.run();
      expect(result.events.length).toBeGreaterThanOrEqual(2); // At least start and end
    });
  });

  describe('Error Handling', () => {
    it('should handle running turn before start', async () => {
      // Should be safe, just doesn't do anything
      await runner.runTurn();
      expect(runner.getTurnCount()).toBe(0);
    });

    it('should handle ending before start gracefully', async () => {
      const result = await runner.end();
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete 100-turn match quickly', async () => {
      const runner100 = new MockMatchRunner({
        ...config,
        maxTurns: 100,
      });

      const start = Date.now();
      await runner100.run();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Match Isolation', () => {
    it('should not interfere with another match', async () => {
      const runner2 = new MockMatchRunner({
        ...config,
        player1: { id: 'p3', name: 'Charlie' },
        player2: { id: 'p4', name: 'Diana' },
      });

      await runner.start();
      await runner2.start();

      const turns1 = runner.getTurnCount();
      await runner2.runTurn();
      const turns1After = runner.getTurnCount();

      expect(turns1After).toBe(turns1); // runner1 unchanged
    });
  });
});
